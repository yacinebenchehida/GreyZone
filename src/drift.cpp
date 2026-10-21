// =============================================================================
//  drift.cpp  --  what happens to a population's allele frequencies
//                 from one generation to the next
// =============================================================================
//
//  The simulation follows ALLELE FREQUENCIES, not individual animals.
//  This is the classic Wright-Fisher model:
//    * the next generation is formed by drawing gene copies at random from
//      the gene pool of the current generation (= genetic drift);
//    * a proportion m of the gene pool is replaced by migrants (= gene flow);
//    * a proportion mu of gene copies mutate (= mutation).
//  Following frequencies instead of individuals makes the simulation very
//  fast, even for very large populations (Ne = 1,000,000 costs the same as
//  Ne = 100), which is what Bailleul et al. (2018) could not do with simuPOP.
//
//  Order of events in one generation (see simulate.cpp):
//      migration  ->  mutation  ->  reproduction (drift)
// =============================================================================

#include "lagpower.h"   // our shared declarations (types, enums, function list)

// -----------------------------------------------------------------------------
//  Helper: one multinomial draw  (= genetic drift at one locus)
// -----------------------------------------------------------------------------
//  We draw 'n_copies' gene copies at random from a gene pool whose allele
//  frequencies are 'p'. The number of copies of each allele follows a
//  multinomial distribution (the binomial generalised to more than 2 alleles).
//  The new frequencies are counts / n_copies.
//
//  'static' means this helper is private to this file (other files can't call it).
static AlleleFreqs multinomial_draw(const AlleleFreqs& p, int n_copies) {

  int K = p.size();                          // number of alleles at this locus

  // R's multinomial function wants probabilities that sum EXACTLY to 1.
  // Rounding errors can make the sum 0.9999999, so we re-normalise first.
  double total = 0.0;                        // will hold the sum of the frequencies
  for (int a = 0; a < K; a++) total += p[a]; // add up all frequencies
  std::vector<double> prob(K);               // a new vector of K numbers
  for (int a = 0; a < K; a++) prob[a] = p[a] / total;  // divide each by the total

  std::vector<int> counts(K);                // will receive the number of copies of each allele

  // R::rmultinom is R's own C function (the same one used by rmultinom() in R).
  // It uses R's random number generator, so set.seed() in R makes results reproducible.
  // It wants plain C pointers: vector.data() gives the address of the first element,
  // exactly like passing an array to a function in C.
  R::rmultinom(n_copies, prob.data(), K, counts.data());

  AlleleFreqs new_p(K);                      // the new frequencies
  for (int a = 0; a < K; a++) {
    new_p[a] = (double) counts[a] / n_copies;  // count -> frequency ((double) avoids integer division, as in C)
  }
  return new_p;                              // send the new frequencies back
}

// -----------------------------------------------------------------------------
//  Helper: mix two sets of frequencies at one locus
// -----------------------------------------------------------------------------
//  Returns (1 - w) * a + w * b, allele by allele.
//  Used for migration (w = migration rate) and for haplodiploid inheritance.
static AlleleFreqs mix(const AlleleFreqs& a, const AlleleFreqs& b, double w) {
  AlleleFreqs out(a.size());                       // result, same length as a
  for (size_t i = 0; i < a.size(); i++) {          // size_t = the unsigned integer type used for sizes
    out[i] = (1.0 - w) * a[i] + w * b[i];          // weighted average
  }
  return out;
}

// -----------------------------------------------------------------------------
//  MIGRATION
// -----------------------------------------------------------------------------
//  Island-model migration between two demes. Each generation:
//     new p1 = (1 - m_into1) * p1 + m_into1 * p2
//     new p2 = (1 - m_into2) * p2 + m_into2 * p1
//  m_into1 is the proportion of deme 1's genes that come from deme 2.
//  If the user gives Nm (number of migrants), R converts it to m = Nm / N
//  for each deme before calling C++ (see R/lag_power.R).
void migrate(Deme& d1, Deme& d2, double m_into1, double m_into2, Ploidy ploidy) {

  if (m_into1 == 0.0 && m_into2 == 0.0) return;    // no gene flow: nothing to do

  int n_loci = d1.freq.size();                     // number of loci
  for (int l = 0; l < n_loci; l++) {               // loop over loci
    // We must compute BOTH new values from the OLD values, so we store them first.
    AlleleFreqs new1 = mix(d1.freq[l], d2.freq[l], m_into1);  // deme 1 receives from deme 2
    AlleleFreqs new2 = mix(d2.freq[l], d1.freq[l], m_into2);  // deme 2 receives from deme 1
    d1.freq[l] = new1;                             // now overwrite
    d2.freq[l] = new2;

    if (ploidy == HAPLODIPLOID) {                  // males have their own frequencies: same treatment
      AlleleFreqs new1m = mix(d1.freq_males[l], d2.freq_males[l], m_into1);
      AlleleFreqs new2m = mix(d2.freq_males[l], d1.freq_males[l], m_into2);
      d1.freq_males[l] = new1m;
      d2.freq_males[l] = new2m;
    }
  }
}

// -----------------------------------------------------------------------------
//  MUTATION (one locus)
// -----------------------------------------------------------------------------
//  Mutation is applied to the frequencies (the expected change); the random
//  part comes afterwards with drift. This is the standard approximation for
//  frequency-based simulations when mu is small (e.g. 1e-4 to 1e-3 for
//  microsatellites, 1e-8 for SNPs).
//
//  NOTE: the number of allelic states K is fixed at the start. With SMM, the
//  user should therefore allow some extra (initially empty) allele sizes on
//  each side of the observed range, otherwise mutation "bounces" at the edges.
static AlleleFreqs mutate_locus(const AlleleFreqs& p, MutationModel model, double mu) {

  int K = p.size();                       // number of allelic states
  if (K < 2 || mu <= 0.0) return p;       // a single allele cannot mutate into anything else

  AlleleFreqs out(K, 0.0);                // new frequencies, all starting at 0

  if (model == KAM) {
    // K-allele model: a copy of allele a stays with probability (1 - mu)
    // and becomes each of the K-1 other alleles with probability mu/(K-1).
    // Algebra: new p[a] = p[a](1 - mu) + (1 - p[a]) * mu/(K-1)
    for (int a = 0; a < K; a++) {
      out[a] = p[a] * (1.0 - mu) + (1.0 - p[a]) * mu / (K - 1);
    }
  }

  if (model == SMM) {
    // Stepwise model: allele index = repeat number. A mutation adds or removes
    // one repeat with equal probability (mu/2 each). At the smallest/largest
    // allele, the only possible step is inwards, so all mutations go there.
    for (int a = 0; a < K; a++) {
      out[a] += p[a] * (1.0 - mu);        // copies that do not mutate stay where they are
      double moving = p[a] * mu;          // copies that mutate
      if (a == 0) {                       // smallest allele: can only go up
        out[1] += moving;
      } else if (a == K - 1) {            // largest allele: can only go down
        out[K - 2] += moving;
      } else {                            // otherwise half go down, half go up
        out[a - 1] += moving / 2.0;
        out[a + 1] += moving / 2.0;
      }
    }
  }
  return out;
}

// MUTATION (whole deme): apply mutate_locus() to every locus (and to males if needed).
void mutate(Deme& d, MutationModel model, double mu, Ploidy ploidy) {
  if (model == NO_MUTATION || mu <= 0.0) return;          // nothing to do
  for (size_t l = 0; l < d.freq.size(); l++) {            // loop over loci
    d.freq[l] = mutate_locus(d.freq[l], model, mu);       // females (or everyone)
    if (ploidy == HAPLODIPLOID) {
      d.freq_males[l] = mutate_locus(d.freq_males[l], model, mu);  // males
    }
  }
}

// -----------------------------------------------------------------------------
//  REPRODUCTION = GENETIC DRIFT
// -----------------------------------------------------------------------------
//  DIPLOID : the next generation has N individuals = 2N gene copies, drawn
//            at random from the current gene pool.
//            -> heterozygosity is lost at rate 1/(2N) per generation.
//  HAPLOID : N individuals = N gene copies.  -> loss at rate 1/N.
//  HAPLODIPLOID (equal sex ratio, N/2 females and N/2 males):
//            * a daughter receives one gene from her mother and one from her
//              father, so the female gene pool of the next generation has
//              expected frequency  (p_females + p_males) / 2,
//              and we draw 2 * N_females copies from it;
//            * a son (haploid) receives his only gene from his mother, so the
//              male gene pool has expected frequency p_females,
//              and we draw N_males copies from it.
void reproduce(Deme& d, Ploidy ploidy) {

  int n_loci = d.freq.size();                       // number of loci

  for (int l = 0; l < n_loci; l++) {                // each locus drifts independently (unlinked loci)

    if (ploidy == DIPLOID) {
      d.freq[l] = multinomial_draw(d.freq[l], 2 * d.N);   // 2N gene copies

    } else if (ploidy == HAPLOID) {
      d.freq[l] = multinomial_draw(d.freq[l], d.N);       // N gene copies

    } else {                                              // HAPLODIPLOID
      int n_females = d.N / 2;                            // integer division (as in C): N = 1001 -> 500 females
      int n_males   = d.N - n_females;                    // the rest are males (501)
      // Expected gene pools, computed from the CURRENT generation:
      AlleleFreqs pool_daughters = mix(d.freq[l], d.freq_males[l], 0.5);  // half from mothers, half from fathers
      AlleleFreqs pool_sons      = d.freq[l];                              // all from mothers
      // Random draw of the new generation:
      d.freq[l]       = multinomial_draw(pool_daughters, 2 * n_females);  // new females
      d.freq_males[l] = multinomial_draw(pool_sons, n_males);             // new males
    }
  }
}
