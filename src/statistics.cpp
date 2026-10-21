// =============================================================================
//  statistics.cpp  --  FST and the tests used to decide whether the two
//                      populations are "detectably" differentiated
// =============================================================================
//
//  FST estimator: HUDSON (1992), as formulated by Bhatia et al. (2013,
//  Genome Research), computed as a "ratio of averages" over loci:
//
//        FST = 1 - Hw / Hb
//
//    Hw = mean diversity WITHIN the two populations
//         (probability that 2 genes from the SAME population differ)
//    Hb = diversity BETWEEN populations
//         (probability that 1 gene from each population differ)
//
//  Why Hudson? Under pure drift after a split, the expected Hw shrinks as
//  H0 * (1 - 1/2N)^t while Hb stays at H0, so the expected FST is exactly
//  1 - (1 - 1/2N)^t. This gives a simple theoretical check of the simulator
//  (see tests/testthat/test-theory.R).
//
//  Two tests of differentiation are available:
//    * "chisq"    : chi-square test of allele frequency homogeneity at each
//                   locus, summed over loci (the approach used by POWSIM;
//                   Ryman & Palm 2006). Very fast.
//    * "fst_perm" : permutation test on FST: individuals are randomly
//                   re-assigned to the two populations many times (as in
//                   Bailleul et al. 2018 and Ben Chehida et al. 2020). Slower.
// =============================================================================

#include "lagpower.h"   // shared declarations

// A table of allele counts: counts[locus][allele]. 'double' rather than 'int'
// so that divisions later do not need conversions.
using CountTable = std::vector<std::vector<double>>;

// -----------------------------------------------------------------------------
//  Helper: count alleles in each of the two populations
// -----------------------------------------------------------------------------
//  pooled  : all sampled individuals (both populations together)
//  labels  : labels[i] = 0 if individual i belongs to population 0, 1 otherwise
//  counts0 / counts1 : filled by the function (passed by reference '&')
static void count_alleles(const std::vector<Genotype>& pooled,
                          const std::vector<int>& labels,
                          const std::vector<int>& n_alleles,
                          int n_copies,
                          CountTable& counts0,
                          CountTable& counts1) {

  int n_loci = n_alleles.size();                         // number of loci
  counts0.assign(n_loci, std::vector<double>());         // reset: one empty row per locus
  counts1.assign(n_loci, std::vector<double>());
  for (int l = 0; l < n_loci; l++) {
    counts0[l].assign(n_alleles[l], 0.0);                // one zero per allele
    counts1[l].assign(n_alleles[l], 0.0);
  }

  int n_ind = pooled.size();                             // total number of sampled individuals
  for (int i = 0; i < n_ind; i++) {                      // for each individual
    // Choose the right table with the "ternary operator" (same as in C):
    // condition ? value_if_true : value_if_false
    CountTable& target = (labels[i] == 0) ? counts0 : counts1;
    for (int l = 0; l < n_loci; l++) {                   // for each locus
      for (int c = 0; c < n_copies; c++) {               // for each gene copy
        int allele = pooled[i][l * n_copies + c];        // read the allele index
        target[l][allele] += 1.0;                        // add one copy to the count
      }
    }
  }
}

// -----------------------------------------------------------------------------
//  Helper: Hudson's FST from two count tables
// -----------------------------------------------------------------------------
static double hudson_fst_from_counts(const CountTable& counts0, const CountTable& counts1) {

  double sum_Hw = 0.0;                                   // Hw summed over loci
  double sum_Hb = 0.0;                                   // Hb summed over loci

  for (size_t l = 0; l < counts0.size(); l++) {          // for each locus
    int K = counts0[l].size();                           // number of alleles

    double n0 = 0.0, n1 = 0.0;                           // number of genes sampled in each population
    for (int a = 0; a < K; a++) { n0 += counts0[l][a]; n1 += counts1[l][a]; }
    if (n0 < 2 || n1 < 2) continue;                      // cannot estimate with fewer than 2 genes: skip locus

    double sum_p0sq = 0.0, sum_p1sq = 0.0, sum_p0p1 = 0.0;
    for (int a = 0; a < K; a++) {
      double p0 = counts0[l][a] / n0;                    // sample frequency in population 0
      double p1 = counts1[l][a] / n1;                    // sample frequency in population 1
      sum_p0sq += p0 * p0;                               // homozygosity in pop 0
      sum_p1sq += p1 * p1;                               // homozygosity in pop 1
      sum_p0p1 += p0 * p1;                               // probability that 1 gene of each are identical
    }

    // Within-population diversity, with the usual n/(n-1) small-sample correction:
    double H0 = n0 / (n0 - 1.0) * (1.0 - sum_p0sq);
    double H1 = n1 / (n1 - 1.0) * (1.0 - sum_p1sq);
    sum_Hw += (H0 + H1) / 2.0;                           // average of the two populations
    sum_Hb += 1.0 - sum_p0p1;                            // between-population diversity
  }

  if (sum_Hb <= 0.0) return NA_REAL;                     // all loci monomorphic: FST undefined (NA in R)
  return 1.0 - sum_Hw / sum_Hb;                          // ratio of averages
}

// -----------------------------------------------------------------------------
//  "True" FST from population frequencies (no sampling, so no correction)
// -----------------------------------------------------------------------------
double fst_from_frequencies(const PopFreqs& p1, const PopFreqs& p2) {
  double sum_Hw = 0.0, sum_Hb = 0.0;                     // sums over loci
  for (size_t l = 0; l < p1.size(); l++) {               // for each locus
    double s11 = 0.0, s22 = 0.0, s12 = 0.0;
    for (size_t a = 0; a < p1[l].size(); a++) {          // for each allele
      s11 += p1[l][a] * p1[l][a];                        // homozygosity pop 1
      s22 += p2[l][a] * p2[l][a];                        // homozygosity pop 2
      s12 += p1[l][a] * p2[l][a];                        // between-population identity
    }
    sum_Hw += ((1.0 - s11) + (1.0 - s22)) / 2.0;         // mean within-population diversity
    sum_Hb += 1.0 - s12;                                 // between-population diversity
  }
  if (sum_Hb <= 0.0) return NA_REAL;                     // undefined if no variation at all
  return 1.0 - sum_Hw / sum_Hb;
}

// -----------------------------------------------------------------------------
//  FST estimated from the sampled individuals
// -----------------------------------------------------------------------------
double fst_from_sample(const std::vector<Genotype>& pooled,
                       const std::vector<int>& labels,
                       const std::vector<int>& n_alleles,
                       int n_copies) {
  CountTable c0, c1;                                         // empty tables...
  count_alleles(pooled, labels, n_alleles, n_copies, c0, c1); // ...filled here
  return hudson_fst_from_counts(c0, c1);
}

// -----------------------------------------------------------------------------
//  Chi-square test of homogeneity, summed over loci (POWSIM-style)
// -----------------------------------------------------------------------------
//  At each locus we build the 2 x K table of allele counts (2 populations x
//  K alleles) and compute the usual Pearson statistic
//      X2 = sum over cells of (Observed - Expected)^2 / Expected
//  with Expected = row total * column total / grand total.
//  Degrees of freedom = (number of alleles actually seen - 1).
//  Statistics and degrees of freedom are summed over loci, and the total is
//  compared with a chi-square distribution.
double chisq_test(const std::vector<Genotype>& pooled,
                  const std::vector<int>& labels,
                  const std::vector<int>& n_alleles,
                  int n_copies) {

  CountTable c0, c1;                                          // allele counts per population
  count_alleles(pooled, labels, n_alleles, n_copies, c0, c1);

  double X2_total = 0.0;                                      // summed statistic
  double df_total = 0.0;                                      // summed degrees of freedom

  for (size_t l = 0; l < c0.size(); l++) {                    // for each locus
    int K = c0[l].size();
    double n0 = 0.0, n1 = 0.0;                                // row totals (genes per population)
    for (int a = 0; a < K; a++) { n0 += c0[l][a]; n1 += c1[l][a]; }
    double n = n0 + n1;                                       // grand total

    int k_seen = 0;                                           // alleles present in the sample
    double X2 = 0.0;                                          // statistic for this locus
    for (int a = 0; a < K; a++) {
      double col = c0[l][a] + c1[l][a];                       // column total for allele a
      if (col == 0.0) continue;                               // allele absent from both samples: skip
      k_seen++;
      double e0 = n0 * col / n;                               // expected count in pop 0
      double e1 = n1 * col / n;                               // expected count in pop 1
      X2 += (c0[l][a] - e0) * (c0[l][a] - e0) / e0;          // (O - E)^2 / E for pop 0
      X2 += (c1[l][a] - e1) * (c1[l][a] - e1) / e1;          // (O - E)^2 / E for pop 1
    }
    if (k_seen < 2) continue;                                 // monomorphic in the sample: no information
    X2_total += X2;
    df_total += k_seen - 1;
  }

  if (df_total == 0.0) return 1.0;                            // nothing testable: cannot reject
  // R::pchisq(x, df, lower_tail, log_p) is R's pchisq(). lower_tail = 0 gives
  // P(X > x), i.e. the p-value.
  return R::pchisq(X2_total, df_total, 0, 0);
}

// -----------------------------------------------------------------------------
//  Permutation test on FST
// -----------------------------------------------------------------------------
//  Null hypothesis: the two samples come from the same population. If true,
//  the labels "population 0 / population 1" are arbitrary, so shuffling them
//  gives FST values typical of no differentiation. The p-value is the
//  proportion of shuffles giving an FST at least as large as the observed one.
double permutation_test_fst(const std::vector<Genotype>& pooled,
                            const std::vector<int>& labels,
                            const std::vector<int>& n_alleles,
                            int n_copies,
                            int n_perm,
                            double observed_fst) {

  if (Rcpp::NumericVector::is_na(observed_fst)) return NA_REAL;  // FST undefined: no test

  std::vector<int> shuffled = labels;           // a COPY of the labels that we will shuffle
  int n = shuffled.size();
  int n_as_large = 0;                           // how many permutations give FST >= observed

  for (int k = 0; k < n_perm; k++) {            // repeat n_perm times
    // Fisher-Yates shuffle: walk backwards, swap each element with a random
    // earlier (or same) position. Every ordering is equally likely.
    for (int i = n - 1; i > 0; i--) {
      int j = (int) (R::runif(0.0, 1.0) * (i + 1));   // random integer between 0 and i
      std::swap(shuffled[i], shuffled[j]);            // exchange the two labels
    }
    double f = fst_from_sample(pooled, shuffled, n_alleles, n_copies);  // FST of the shuffled data
    if (!Rcpp::NumericVector::is_na(f) && f >= observed_fst - 1e-12) {  // tiny tolerance for rounding
      n_as_large++;
    }
  }
  // "+1" counts the observed data as one of the permutations, so p is never 0.
  return (n_as_large + 1.0) / (n_perm + 1.0);
}
