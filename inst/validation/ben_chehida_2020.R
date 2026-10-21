# =============================================================================
#  ben_chehida_2020.R  --  reproduce the grey-zone simulations of
#  Ben Chehida et al. (2020, Heredity, doi:10.1038/s41437-019-0284-1)
# =============================================================================
#
#  Their design (simuPOP 1.1.7):
#    * one ancestral population splits into two populations of Ne = 1000;
#    * symmetric gene flow Nm = 0, 1, 10, 100 migrants per generation;
#    * 10 loci with 10 alleles at equal frequency, no mutation;
#    * every 7 generations, 50 individuals sampled per population and FST
#      tested with 1000 permutations (p <= 0.05); 100 replicates.
#  Their results:
#    * Nm <= 1  : power 100% within about 7 generations;
#    * Nm = 10  : power > 80% within the first 20 generations;
#    * Nm = 100 : power stays below 40%.
#
#  Run with:  source(system.file("validation", "ben_chehida_2020.R", package = "lagpower"))
# =============================================================================

library(lagpower)

# ---- 1. Same design, permutation test on FST (as in the paper) --------------
t0 <- Sys.time()                                     # start a timer
perm <- lag_power(p_anc = equal_freqs(n_loci = 10, n_alleles = 10),
                  N1 = 1000,                         # N2 = N1 by default
                  Nm = c(0, 1, 10, 100),
                  sample_gens = seq(0, 70, by = 7),  # every 7 generations, as in the paper
                  n_sample = 50,
                  test = "fst_perm", n_perm = 1000,
                  n_rep = 100, seed = 2020)
print(Sys.time() - t0)                               # how long it took
print(perm)

# ---- 2. Same design, chi-square test (POWSIM-like, much faster) -------------
t0 <- Sys.time()
chi <- lag_power(p_anc = equal_freqs(10, 10), N1 = 1000,
                 Nm = c(0, 1, 10, 100),
                 sample_gens = seq(0, 70, by = 7), n_sample = 50,
                 test = "chisq", n_rep = 100, seed = 2020)
print(Sys.time() - t0)
print(chi)

# ---- 3. Side-by-side comparison of power ------------------------------------
cmp <- data.frame(Nm         = perm$results$gene_flow,
                  generation = perm$results$generation,
                  power_perm = perm$results$power,
                  power_chisq = chi$results$power,
                  fst_true   = round(perm$results$fst_true_mean, 4))
print(cmp)

# ---- 4. Figure ----------------------------------------------------------------
plot(perm)
