// =============================================================================
//  lagpower.h  --  "header" file shared by all the C++ files of the package
// =============================================================================
//
//  WHAT IS A HEADER FILE?
//  In C (and C++), a function must be *declared* before it is used. When the
//  code is split over several .cpp files, each file needs to know the names
//  and argument types of the functions written in the other files.
//  The header (.h) collects these declarations in one place; each .cpp file
//  then simply writes  #include "lagpower.h"  at the top.
//  The header contains NO real work: only "this function exists, it takes
//  these arguments and returns this type".
//
//  HOW THE C++ CODE IS ORGANISED (one file = one job):
//    drift.cpp       -> what happens to allele frequencies each generation
//                       (migration, mutation, genetic drift)
//    sampling.cpp    -> drawing individuals (genotypes) from a population
//    statistics.cpp  -> FST and the tests of differentiation
//    simulate.cpp    -> the main loop (replicates x generations), the only
//                       function that R calls directly
// =============================================================================

// "Include guard": if this file is included twice by accident, the compiler
// only reads it once. LAGPOWER_H is just a unique name we invent.
#ifndef LAGPOWER_H
#define LAGPOWER_H

#include <Rcpp.h>   // Rcpp: the bridge between R and C++ (also gives access to R's random numbers)
#include <vector>   // std::vector: a C++ "array that knows its own length and can grow"
#include <string>   // std::string: a C++ text string (much easier than char* in C)

// -----------------------------------------------------------------------------
//  1. Data types used everywhere
// -----------------------------------------------------------------------------
//  'typedef' (C) / 'using' (C++) only gives a shorter, more meaningful NAME to a
//  type. It does not create anything new.

// Allele frequencies at ONE locus: e.g. {0.1, 0.4, 0.5} for a locus with 3 alleles.
using AlleleFreqs = std::vector<double>;

// Allele frequencies at ALL loci of one population: a vector of AlleleFreqs.
// freqs[l][a] = frequency of allele a at locus l.
// Loci may have different numbers of alleles, so each inner vector has its own length.
using PopFreqs = std::vector<AlleleFreqs>;

// The genotype of ONE individual, stored as a flat list of allele indices:
// for locus l and gene copy c (c = 0 or 1 for a diploid, c = 0 for a haploid)
// the allele is at position  l * n_copies + c.
// Example for a diploid with 2 loci:  {3, 5,   0, 0}
//                                      ^locus0  ^locus1  (allele indices start at 0)
using Genotype = std::vector<int>;

// -----------------------------------------------------------------------------
//  2. Ploidy and mutation models, as named constants ("enum")
// -----------------------------------------------------------------------------
//  An 'enum' is a list of named integer constants. Writing DIPLOID instead of 0
//  makes the code readable and avoids mistakes.

enum Ploidy {
  DIPLOID,       // every individual carries 2 gene copies (most animals, nuclear DNA)
  HAPLOID,       // every individual carries 1 gene copy (e.g. mtDNA, haploid organisms)
  HAPLODIPLOID   // females diploid, males haploid (bees, ants, wasps...)
};

enum MutationModel {
  NO_MUTATION,   // allele frequencies only change by drift and migration
  KAM,           // K-allele model: an allele mutates to any of the other K-1 alleles
  SMM            // stepwise mutation model (microsatellites): one repeat up or down
};

// -----------------------------------------------------------------------------
//  3. A "deme" = one population, as seen by the simulation
// -----------------------------------------------------------------------------
//  A 'struct' (same as in C) groups several variables under one name.
struct Deme {
  int N;               // number of breeding individuals per generation (assumed = Ne)
  PopFreqs freq;       // allele frequencies. For DIPLOID and HAPLOID this is the
                       // whole population. For HAPLODIPLOID these are the FEMALES.
  PopFreqs freq_males; // only used for HAPLODIPLOID: allele frequencies in males.
};

// -----------------------------------------------------------------------------
//  4. Small helpers to turn the text sent by R into the enums above
//     (defined in simulate.cpp)
// -----------------------------------------------------------------------------
Ploidy        ploidy_from_string(const std::string& x);
MutationModel mutation_from_string(const std::string& x);

// Number of gene copies carried by one SAMPLED individual (2 or 1).
// For haplodiploids we sample females (diploid), see sampling.cpp.
int copies_per_sampled_individual(Ploidy ploidy);

// -----------------------------------------------------------------------------
//  5. drift.cpp : how a population changes from one generation to the next
// -----------------------------------------------------------------------------
//  Note on the '&' symbol: "Deme& d" means the function receives the ORIGINAL
//  deme (a "reference"), not a copy. It is the C++ equivalent of passing a
//  pointer in C (Deme* d) but without the * and -> syntax.
//  'const' in front means the function promises NOT to modify it.

// Exchange migrants between two demes.
// m_into1 = proportion of deme 1's gene pool that comes from deme 2 each generation.
// m_into2 = proportion of deme 2's gene pool that comes from deme 1 each generation.
void migrate(Deme& d1, Deme& d2, double m_into1, double m_into2, Ploidy ploidy);

// Apply mutation (deterministically, on the frequencies) to every locus.
void mutate(Deme& d, MutationModel model, double mu, Ploidy ploidy);

// Produce the next generation by random sampling of gene copies (= genetic drift).
void reproduce(Deme& d, Ploidy ploidy);

// -----------------------------------------------------------------------------
//  6. sampling.cpp : draw n individuals from a deme
// -----------------------------------------------------------------------------
// Returns one Genotype per sampled individual.
std::vector<Genotype> sample_individuals(const Deme& d, int n, Ploidy ploidy);

// -----------------------------------------------------------------------------
//  7. statistics.cpp : FST and tests
// -----------------------------------------------------------------------------
//  In the tests, the two samples are merged into ONE list of individuals
//  ("pooled") plus a list of labels saying which population each individual
//  came from (0 or 1). This makes permutations easy: we only shuffle labels.

// "True" FST computed from the population allele frequencies (no sampling error).
double fst_from_frequencies(const PopFreqs& p1, const PopFreqs& p2);

// Hudson's FST estimated from sampled individuals.
double fst_from_sample(const std::vector<Genotype>& pooled,
                       const std::vector<int>& labels,
                       const std::vector<int>& n_alleles,
                       int n_copies);

// Chi-square test of allele-frequency homogeneity, summed over loci (as in POWSIM).
// Returns the p-value.
double chisq_test(const std::vector<Genotype>& pooled,
                  const std::vector<int>& labels,
                  const std::vector<int>& n_alleles,
                  int n_copies);

// Permutation test on FST: individuals are randomly re-assigned to the two
// populations n_perm times. Returns the p-value.
double permutation_test_fst(const std::vector<Genotype>& pooled,
                            const std::vector<int>& labels,
                            const std::vector<int>& n_alleles,
                            int n_copies,
                            int n_perm,
                            double observed_fst);

#endif  // end of the include guard started at the top
