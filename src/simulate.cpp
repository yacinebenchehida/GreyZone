// =============================================================================
//  simulate.cpp  --  the main simulation loop, called from R
// =============================================================================
//
//  Scenario simulated (the "grey zone" design of Bailleul et al. 2018,
//  Ben Chehida et al. 2020 and Schleimer et al. 2024):
//
//      ancestral population (allele frequencies p_anc)
//                     |
//          split at generation 0
//            |                 |
//     deme 1 (N1)  <--- m --->  deme 2 (N2)
//
//  At each requested generation, n1 and n2 individuals are sampled, FST is
//  estimated and a test of differentiation is run. The whole history is
//  repeated n_rep times. R then computes, for each generation, the proportion
//  of replicates in which differentiation is detected (= power).
//
//  RCPP IN ONE PARAGRAPH
//  The line  // [[Rcpp::export]]  just above a function tells Rcpp to make
//  that function callable from R. When the package is built, Rcpp writes the
//  "glue" code automatically (files RcppExports.cpp and R/RcppExports.R).
//  Rcpp types such as Rcpp::List, Rcpp::IntegerVector or Rcpp::NumericMatrix
//  are C++ views of R objects (list, integer vector, numeric matrix), so data
//  can travel between R and C++ without manual conversion.
// =============================================================================

#include "lagpower.h"   // shared declarations

// -----------------------------------------------------------------------------
//  Text -> enum converters (R sends "diploid", C++ wants DIPLOID)
// -----------------------------------------------------------------------------
Ploidy ploidy_from_string(const std::string& x) {
  if (x == "diploid")      return DIPLOID;       // std::string can be compared with ==
  if (x == "haploid")      return HAPLOID;
  if (x == "haplodiploid") return HAPLODIPLOID;
  Rcpp::stop("Unknown ploidy: " + x);            // Rcpp::stop() = R's stop(): an error message in R
}

MutationModel mutation_from_string(const std::string& x) {
  if (x == "none") return NO_MUTATION;
  if (x == "kam")  return KAM;
  if (x == "smm")  return SMM;
  Rcpp::stop("Unknown mutation model: " + x);
}

// -----------------------------------------------------------------------------
//  Build a fresh deme from the ancestral frequencies
// -----------------------------------------------------------------------------
static Deme new_deme(const PopFreqs& p_anc, int N, Ploidy ploidy) {
  Deme d;                                   // an empty deme
  d.N = N;                                  // its size
  d.freq = p_anc;                           // a COPY of the ancestral frequencies
  if (ploidy == HAPLODIPLOID) d.freq_males = p_anc;  // males start with the same frequencies
  return d;
}

// -----------------------------------------------------------------------------
//  THE FUNCTION CALLED FROM R
// -----------------------------------------------------------------------------
//  Arguments (all checked beforehand in R, see R/lag_power.R):
//    p_anc        list of numeric vectors: ancestral allele frequencies per locus
//    N1, N2       number of breeding individuals in each daughter deme (= Ne)
//    m_into1      proportion of deme 1's genes coming from deme 2 per generation
//    m_into2      proportion of deme 2's genes coming from deme 1 per generation
//    ploidy       "diploid", "haploid" or "haplodiploid"
//    mutation     "none", "kam" or "smm"
//    mu           mutation rate per gene copy per generation
//    sample_gens  generations (after the split) at which samples are taken, increasing
//    n1, n2       number of individuals sampled in each deme
//    n_rep        number of independent replicates
//    test         "chisq", "fst_perm" or "none"
//    n_perm       number of permutations (only for "fst_perm")
//  Returns an R list of three matrices (rows = replicates, columns = sampling times):
//    fst_true     FST computed from the population frequencies
//    fst_sample   FST estimated from the sampled individuals
//    p_value      p-value of the chosen test
//
// [[Rcpp::export(name = ".simulate_split_cpp")]]
Rcpp::List simulate_split_cpp(Rcpp::List p_anc,
                              int N1, int N2,
                              double m_into1, double m_into2,
                              std::string ploidy,
                              std::string mutation,
                              double mu,
                              Rcpp::IntegerVector sample_gens,
                              int n1, int n2,
                              int n_rep,
                              std::string test,
                              int n_perm) {

  // ---- 1. Convert the inputs into the C++ types used internally -------------
  Ploidy        pl  = ploidy_from_string(ploidy);     // text -> enum
  MutationModel mut = mutation_from_string(mutation); // text -> enum

  int n_loci = p_anc.size();                          // number of loci = length of the R list
  PopFreqs ancestral(n_loci);                         // C++ copy of the ancestral frequencies
  std::vector<int> n_alleles(n_loci);                 // number of alleles at each locus
  for (int l = 0; l < n_loci; l++) {
    // p_anc[l] is an R numeric vector; Rcpp::as<>() converts it into a std::vector<double>
    ancestral[l] = Rcpp::as<AlleleFreqs>(p_anc[l]);
    n_alleles[l] = ancestral[l].size();
  }

  int n_times  = sample_gens.size();                  // number of sampling times
  int n_copies = copies_per_sampled_individual(pl);   // genes per sampled individual (1 or 2)

  // Labels for the pooled sample: n1 zeros (deme 1) followed by n2 ones (deme 2).
  // They never change, so we build them once.
  std::vector<int> labels(n1 + n2, 0);                // n1 + n2 zeros...
  for (int i = n1; i < n1 + n2; i++) labels[i] = 1;   // ...then set the last n2 to 1

  // ---- 2. Prepare the output matrices (filled with NA) ----------------------
  Rcpp::NumericMatrix fst_true(n_rep, n_times);       // R matrix, initially 0
  Rcpp::NumericMatrix fst_sample(n_rep, n_times);
  Rcpp::NumericMatrix p_value(n_rep, n_times);
  std::fill(p_value.begin(), p_value.end(), NA_REAL); // NA until a test is run

  // ---- 3. Replicates ---------------------------------------------------------
  for (int r = 0; r < n_rep; r++) {

    Rcpp::checkUserInterrupt();                       // lets the user stop a long run with Esc / Ctrl+C

    // At the split, both demes inherit the ancestral frequencies.
    Deme d1 = new_deme(ancestral, N1, pl);
    Deme d2 = new_deme(ancestral, N2, pl);
    int generation = 0;                               // generations elapsed since the split

    // ---- 4. Move forward in time, stopping at each sampling time -------------
    for (int t = 0; t < n_times; t++) {

      // Evolve until we reach the next sampling generation.
      while (generation < sample_gens[t]) {
        migrate(d1, d2, m_into1, m_into2, pl);        // gene flow
        mutate(d1, mut, mu, pl);                      // mutation in deme 1
        mutate(d2, mut, mu, pl);                      // mutation in deme 2
        reproduce(d1, pl);                            // drift in deme 1
        reproduce(d2, pl);                            // drift in deme 2
        generation++;                                 // one generation has passed
      }

      // "True" FST, from the population frequencies themselves.
      fst_true(r, t) = fst_from_frequencies(d1.freq, d2.freq);

      // Sample individuals from both demes...
      std::vector<Genotype> s1 = sample_individuals(d1, n1, pl);
      std::vector<Genotype> s2 = sample_individuals(d2, n2, pl);
      // ...and put them in a single list (deme 1 first, then deme 2), to match 'labels'.
      std::vector<Genotype> pooled = s1;                         // copy sample 1
      pooled.insert(pooled.end(), s2.begin(), s2.end());         // append sample 2 at the end

      // Estimated FST from the samples.
      double f = fst_from_sample(pooled, labels, n_alleles, n_copies);
      fst_sample(r, t) = f;

      // Test of differentiation.
      if (test == "chisq") {
        p_value(r, t) = chisq_test(pooled, labels, n_alleles, n_copies);
      } else if (test == "fst_perm") {
        p_value(r, t) = permutation_test_fst(pooled, labels, n_alleles, n_copies, n_perm, f);
      }
      // test == "none": p-value stays NA (useful to look at FST only, much faster)
    }
  }

  // ---- 5. Send the results back to R as a named list -------------------------
  return Rcpp::List::create(
    Rcpp::Named("fst_true")   = fst_true,
    Rcpp::Named("fst_sample") = fst_sample,
    Rcpp::Named("p_value")    = p_value
  );
}
