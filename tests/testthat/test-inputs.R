# =============================================================================
#  test-inputs.R  --  check the functions that read / build allele frequencies
# =============================================================================

test_that("equal_freqs() builds the right structure", {
  p <- equal_freqs(3, c(2, 4, 5))
  expect_length(p, 3)                                   # 3 loci
  expect_equal(lengths(p), c(locus1 = 2, locus2 = 4, locus3 = 5))
  expect_true(all(abs(sapply(p, sum) - 1) < 1e-12))     # each locus sums to 1
})

test_that("freqs_from_table() accepts counts and sorts alleles by size", {
  df <- data.frame(locus = c("A", "A", "B", "B"),
                   allele = c(152, 150, 100, 98),
                   count = c(70, 30, 25, 75))
  p <- freqs_from_table(df)
  expect_equal(names(p$A), c("150", "152"))             # sorted by allele size
  expect_equal(unname(p$A), c(0.3, 0.7))                # counts turned into frequencies
})

test_that("monomorphic loci are removed with a message", {
  expect_message(p <- freqs_from_table(list(c(1, 0), c(0.5, 0.5))), "monomorphic")
  expect_length(p, 1)
})

test_that("bad inputs give clear errors", {
  expect_error(lag_power(Nm = 1, m = 0.01), "OR")
  expect_error(lag_power(N1 = 1), "at least 2")
  expect_error(lag_power(mutation = "smm"), "mutation rate")
  expect_error(freqs_from_table(list(c(-1, 2))), "non-negative")
})

test_that("freqs_from_genind() pools individuals", {
  skip_if_not_installed("adegenet")                     # only run if adegenet is installed
  df <- data.frame(L1 = c("150/152", "150/150", "152/152", "150/152"))
  g <- adegenet::df2genind(df, sep = "/", ploidy = 2)
  p <- freqs_from_genind(g)
  expect_equal(unname(p$L1), c(0.5, 0.5))               # 4 copies of each allele out of 8
})

test_that("VCF genotype strings are turned into allele counts", {
  # Same data as the VCF below, but as the matrix vcfR would give (no vcfR needed)
  gt <- rbind(c("0/1", "1/1"), c("0|0", "./."), c("0/0", "0/1"), c("1/2", "0/2"))
  p <- lagpower:::.freqs_from_gt_matrix(gt, c("snp1", "snp2", "snp3", "multi"))
  expect_equal(p$snp1, c(1, 3))                         # 1 copy of allele 0, 3 of allele 1
  expect_equal(p$snp2, 2)                               # only allele 0 (missing ignored)
  expect_equal(p$multi, c(1, 1, 2))                     # multi-allelic site: alleles 0, 1, 2
})

test_that("freqs_from_vcf() reads genotypes", {
  skip_if_not_installed("vcfR")
  vcf_file <- tempfile(fileext = ".vcf")                # write a tiny VCF to a temporary file
  writeLines(c(
    "##fileformat=VCFv4.2",
    "##FORMAT=<ID=GT,Number=1,Type=String,Description=\"Genotype\">",
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tind1\tind2",
    "1\t100\tsnp1\tA\tG\t.\tPASS\t.\tGT\t0/1\t1/1",
    "1\t200\tsnp2\tC\tT\t.\tPASS\t.\tGT\t0|0\t./.",
    "1\t300\tsnp3\tG\tA\t.\tPASS\t.\tGT\t0/0\t0/1"
  ), vcf_file)
  p <- suppressMessages(freqs_from_vcf(vcf_file))
  expect_equal(names(p), c("snp1", "snp3"))             # snp2 is monomorphic -> removed
  expect_equal(p$snp1, c(0.25, 0.75))                   # 1 ref, 3 alt
})
