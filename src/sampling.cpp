// =============================================================================
//  sampling.cpp  --  drawing individuals from a simulated population
// =============================================================================
//
//  The simulation only knows allele FREQUENCIES. To mimic a real study, we
//  "catch" n individuals and give each of them a genotype, by drawing their
//  gene copies at random from the population's frequencies (this assumes
//  Hardy-Weinberg proportions within each population).
//  This is the step that adds SAMPLING ERROR: with 50 individuals, the sample
//  frequencies differ a bit from the true population frequencies, which is
//  precisely why weak differentiation can be missed.
// =============================================================================

#include "lagpower.h"   // shared declarations

// -----------------------------------------------------------------------------
//  Helper: draw ONE allele at random from frequencies p
// -----------------------------------------------------------------------------
//  Method ("inverse cumulative distribution"): draw a uniform random number u
//  between 0 and 1, then walk along the alleles adding up their frequencies
//  until the running total exceeds u.
//  Example: p = {0.2, 0.5, 0.3}; u = 0.6 -> 0.2 (no) -> 0.7 (yes) -> allele 1.
static int draw_allele(const AlleleFreqs& p) {
  double u = R::runif(0.0, 1.0);          // uniform number in [0, 1), from R's generator
  double cumulative = 0.0;                // running total of frequencies
  int K = p.size();                       // number of alleles
  for (int a = 0; a < K; a++) {
    cumulative += p[a];                   // add this allele's frequency
    if (u < cumulative) return a;         // found it: return the allele index
  }
  // Only reached if rounding errors make the total slightly below 1:
  // return the last allele that has a non-zero frequency.
  for (int a = K - 1; a >= 0; a--) if (p[a] > 0.0) return a;
  return 0;                               // (should never happen)
}

// -----------------------------------------------------------------------------
//  Number of gene copies per SAMPLED individual
// -----------------------------------------------------------------------------
//  For haplodiploids we sample females only (diploid), which is the usual
//  choice in practice because they carry more information. This could become
//  an option later (e.g. a proportion of haploid males in the sample).
int copies_per_sampled_individual(Ploidy ploidy) {
  if (ploidy == HAPLOID) return 1;        // one gene copy per individual
  return 2;                               // DIPLOID, or HAPLODIPLOID females
}

// -----------------------------------------------------------------------------
//  Sample n individuals from deme d
// -----------------------------------------------------------------------------
//  Returns a vector of n Genotypes. Genotype layout (see lagpower.h):
//  position  locus * n_copies + copy  holds the allele index.
std::vector<Genotype> sample_individuals(const Deme& d, int n, Ploidy ploidy) {

  int n_loci   = d.freq.size();                        // number of loci
  int n_copies = copies_per_sampled_individual(ploidy); // 1 or 2

  // Create n empty genotypes, each with room for n_loci * n_copies alleles.
  std::vector<Genotype> sample(n, Genotype(n_loci * n_copies));

  for (int i = 0; i < n; i++) {                        // for each individual
    for (int l = 0; l < n_loci; l++) {                 // for each locus
      for (int c = 0; c < n_copies; c++) {             // for each gene copy
        // For DIPLOID and HAPLOID, d.freq is the whole population.
        // For HAPLODIPLOID, d.freq holds the female frequencies, and we sample females.
        sample[i][l * n_copies + c] = draw_allele(d.freq[l]);
      }
    }
  }
  return sample;
}
