# =============================================================================
#  test-theory.R  --  check the simulator against population-genetics theory
# =============================================================================
#  These tests run automatically with devtools::test() or R CMD check.
#  Each test_that() block states an expectation; if the simulator ever
#  breaks (e.g. after an edit), the corresponding test fails.
# =============================================================================

test_that("FST under pure drift matches 1 - (1 - 1/2N)^t (diploid)", {
  # 200 replicates, 50 SNP-like loci, no migration, no mutation
  res <- lag_power(p_anc = equal_freqs(50, 2), N1 = 200, Nm = 0,
                   generations = 100, every = 25, n_rep = 200,
                   test = "none", seed = 42)
  r <- res$results
  expected <- lagpower:::.expected_fst_drift(r$generation, 200)   # ':::' reaches an internal function
  # Simulated mean "true" FST should be within 10% (relative) of theory, after generation 0
  keep <- r$generation > 0
  expect_equal(r$fst_true_mean[keep], expected[keep], tolerance = 0.10)
})

test_that("FST under pure drift matches theory for haploids and haplodiploids", {
  for (pl in c("haploid", "haplodiploid")) {
    res <- lag_power(p_anc = equal_freqs(50, 2), N1 = 200, Nm = 0,
                     generations = 60, every = 20, n_rep = 200,
                     ploidy = pl, test = "none", seed = 7)
    r <- res$results[res$results$generation > 0, ]
    expected <- lagpower:::.expected_fst_drift(r$generation, 200, ploidy = pl)
    expect_equal(r$fst_true_mean, expected, tolerance = 0.12, label = pl)
  }
})

test_that("Power at generation 0 is close to alpha (no false-positive inflation)", {
  res <- lag_power(p_anc = equal_freqs(10, 10), N1 = 1000, Nm = 0,
                   sample_gens = 0, n_rep = 1000, test = "chisq", seed = 3)
  # With alpha = 0.05 and 1000 replicates, the estimate should fall in about [0.03, 0.07]
  expect_gt(res$results$power, 0.02)
  expect_lt(res$results$power, 0.08)
})

test_that("More gene flow means less differentiation", {
  res <- lag_power(N1 = 500, Nm = c(0, 10), generations = 100, every = 50,
                   n_rep = 100, test = "none", seed = 1)
  r <- res$results[res$results$generation == 100, ]
  expect_gt(r$fst_true_mean[r$gene_flow == 0], r$fst_true_mean[r$gene_flow == 10])
})

test_that("Allele frequencies stay valid under mutation", {
  res <- lag_power(p_anc = pad_alleles(equal_freqs(5, 4), 3), N1 = 300, Nm = 1,
                   mutation = "smm", mu = 1e-3, generations = 50, every = 25,
                   n_rep = 20, test = "chisq", seed = 2)
  expect_true(all(is.finite(res$results$fst_true_mean)))
  expect_true(all(res$results$power >= 0 & res$results$power <= 1))
})

test_that("Same seed gives identical results", {
  a <- lag_power(N1 = 100, generations = 20, every = 10, n_rep = 10, seed = 99)
  b <- lag_power(N1 = 100, generations = 20, every = 10, n_rep = 10, seed = 99)
  expect_identical(a$results, b$results)
})
