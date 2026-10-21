# =============================================================================
#  lag_power.R  --  the main user function
# =============================================================================
#
#  What lag_power() does, step by step:
#    1. checks the arguments and turns gene flow (Nm or m) into migration rates;
#    2. for each gene-flow value, calls the C++ engine (.simulate_split_cpp,
#       written in src/simulate.cpp) which returns, for every replicate and
#       every sampling generation, the true FST, the sample FST and a p-value;
#    3. summarises the replicates: power = proportion of replicates with
#       p-value <= alpha, plus mean and 95% range of FST;
#    4. finds the "grey zone": the first generation at which power reaches
#       the chosen threshold (e.g. 80%);
#    5. returns everything as an object of class "lag_power", which has its
#       own print() and plot() methods (see R/methods.R).
# =============================================================================

#' Simulate a population split and estimate the power to detect it over time
#'
#' One ancestral population splits into two daughter populations of sizes
#' `N1` and `N2` at generation 0. They then evolve by genetic drift, gene flow
#' and (optionally) mutation. At regular intervals, `n_sample` individuals are
#' sampled from each population and a test of differentiation is run. Repeating
#' this `n_rep` times gives, for each generation, the probability of detecting
#' the split (the power). The number of generations needed to reach
#' `power_threshold` is the length of the "grey zone" (Bailleul et al. 2018).
#'
#' @param p_anc Ancestral allele frequencies: a list with one numeric vector
#'   per locus. See [equal_freqs()], [freqs_from_genind()], [freqs_from_vcf()],
#'   [freqs_from_table()].
#' @param N1,N2 Number of breeding individuals (taken as the effective size) in
#'   each daughter population. `N2` defaults to `N1`.
#' @param Nm Gene flow as the number of migrants per generation (exchanged in
#'   each direction). Can be a vector, e.g. `c(0, 1, 10, 100)`: each value is
#'   simulated as a separate scenario. Use either `Nm` or `m`, not both.
#'   If neither is given, there is no gene flow (`Nm = 0`).
#' @param m Gene flow as the proportion of each population replaced by
#'   migrants per generation. Can be a vector. Use either `Nm` or `m`.
#' @param generations Number of generations simulated after the split.
#' @param every Sample every `every` generations (generation 0 is always
#'   included, as a check: power there should be close to `alpha`).
#' @param sample_gens Optional vector of sampling generations; overrides
#'   `generations` and `every`.
#' @param n_sample Number of individuals sampled per population: one value
#'   for both, or `c(n1, n2)`.
#' @param ploidy `"diploid"`, `"haploid"` (e.g. mtDNA) or `"haplodiploid"`
#'   (females diploid, males haploid; equal sex ratio; females are sampled).
#' @param mutation `"none"`, `"kam"` (K-allele model) or `"smm"` (stepwise
#'   mutation model, for microsatellites; see [pad_alleles()]).
#' @param mu Mutation rate per gene copy per generation.
#' @param test Test of differentiation: `"chisq"` (chi-square summed over
#'   loci, as in POWSIM; fast), `"fst_perm"` (permutation test on FST, as in
#'   Bailleul et al. 2018; slower) or `"none"` (FST only).
#' @param alpha Significance level of the test.
#' @param n_perm Number of permutations for `test = "fst_perm"`.
#' @param power_threshold Power defining the end of the grey zone (0.8 by
#'   default; Bailleul et al. 2018 used 0.95).
#' @param n_rep Number of replicate simulations.
#' @param generation_time Optional generation time in years, used only to
#'   report results in years as well as generations.
#' @param seed Optional random seed, for reproducible results.
#'
#' @return An object of class `lag_power`: a list with
#'   * `results`: one row per gene-flow value and sampling generation, with
#'     power and FST summaries;
#'   * `grey_zone`: one row per gene-flow value, with the first generation at
#'     which power reaches `power_threshold`;
#'   * `settings`: the arguments used.
#'
#' @examples
#' # Ben Chehida et al. (2020) design: 10 microsatellites with 10 alleles,
#' # Ne = 1000 per population, 50 individuals sampled per population.
#' res <- lag_power(p_anc = equal_freqs(10, 10), N1 = 1000,
#'                  Nm = c(0, 10, 100), generations = 100, every = 5,
#'                  n_sample = 50, n_rep = 50, seed = 1)
#' res
#' plot(res)
#' @export
lag_power <- function(p_anc = equal_freqs(n_loci = 10, n_alleles = 10),
                      N1 = 1000,
                      N2 = N1,
                      Nm = NULL,
                      m = NULL,
                      generations = 200,
                      every = 5,
                      sample_gens = NULL,
                      n_sample = 50,
                      ploidy = c("diploid", "haploid", "haplodiploid"),
                      mutation = c("none", "kam", "smm"),
                      mu = 0,
                      test = c("chisq", "fst_perm", "none"),
                      alpha = 0.05,
                      n_perm = 1000,
                      power_threshold = 0.8,
                      n_rep = 100,
                      generation_time = NULL,
                      seed = NULL) {

  # ---- 1. Check the arguments -------------------------------------------------

  # match.arg() picks the first choice by default and gives a clear error for typos
  ploidy   <- match.arg(ploidy)
  mutation <- match.arg(mutation)
  test     <- match.arg(test)

  p_anc <- .check_freqs(p_anc)                          # format, sum to 1, drop monomorphic loci

  # Population sizes: whole numbers >= 2
  if (N1 < 2 || N2 < 2) stop("N1 and N2 must be at least 2.")
  N1 <- as.integer(round(N1))
  N2 <- as.integer(round(N2))

  # Sample sizes: one value for both populations, or one per population
  if (length(n_sample) == 1) n_sample <- c(n_sample, n_sample)
  if (length(n_sample) != 2 || any(n_sample < 2)) {
    stop("'n_sample' must be one or two numbers, each at least 2.")
  }
  n_sample <- as.integer(round(n_sample))

  # Gene flow: either Nm (number of migrants) or m (proportion), not both.
  # If neither is given: no gene flow (Nm = 0).
  if (!is.null(m) && !is.null(Nm)) stop("Give gene flow as 'Nm' OR as 'm', not both.")
  if (is.null(m) && is.null(Nm)) Nm <- 0
  if (is.null(m)) {
    flow_type   <- "Nm"                                 # remember how gene flow was given
    flow_values <- Nm
    m_into1 <- Nm / N1                                  # Nm migrants into a population of N1
    m_into2 <- Nm / N2                                  # Nm migrants into a population of N2
  } else {
    flow_type   <- "m"
    flow_values <- m
    m_into1 <- m                                        # same proportion in both populations
    m_into2 <- m
  }
  if (any(m_into1 < 0 | m_into1 > 1 | m_into2 < 0 | m_into2 > 1)) {
    stop("Migration rates must be between 0 and 1 (Nm cannot exceed N).")
  }

  # Sampling generations: 0, every, 2*every, ..., generations (unless given)
  if (is.null(sample_gens)) {
    sample_gens <- seq(0, generations, by = every)
  }
  sample_gens <- sort(unique(as.integer(round(sample_gens))))  # whole numbers, increasing, no duplicates
  if (any(sample_gens < 0)) stop("'sample_gens' must be >= 0.")

  # Mutation settings
  if (mutation != "none" && mu <= 0) stop("Give a mutation rate 'mu' > 0, or use mutation = 'none'.")
  if (mutation == "none") mu <- 0

  # Random seed (if given) so that results can be reproduced exactly.
  # The C++ code uses R's random number generator, so set.seed() controls it too.
  if (!is.null(seed)) set.seed(seed)

  # ---- 2. Run the simulations, one gene-flow value at a time -----------------

  results <- list()                                     # will collect one data frame per scenario

  for (i in seq_along(flow_values)) {                   # loop over gene-flow values

    # Call the C++ engine (see src/simulate.cpp). It returns a list of 3
    # matrices: rows = replicates, columns = sampling generations.
    sim <- .simulate_split_cpp(
      p_anc       = p_anc,
      N1          = N1,
      N2          = N2,
      m_into1     = m_into1[i],
      m_into2     = m_into2[i],
      ploidy      = ploidy,
      mutation    = mutation,
      mu          = mu,
      sample_gens = sample_gens,
      n1          = n_sample[1],
      n2          = n_sample[2],
      n_rep       = as.integer(n_rep),
      test        = test,
      n_perm      = as.integer(n_perm)
    )

    # ---- 3. Summarise the replicates (column by column = generation by generation)
    results[[i]] <- data.frame(
      gene_flow        = flow_values[i],                                     # the scenario
      generation       = sample_gens,                                        # time since the split
      power            = .power(sim$p_value, alpha),                         # proportion of significant tests
      fst_true_mean    = colMeans(sim$fst_true, na.rm = TRUE),               # mean "true" FST
      fst_true_low     = .quantile_cols(sim$fst_true, 0.025),                # 2.5% quantile
      fst_true_high    = .quantile_cols(sim$fst_true, 0.975),                # 97.5% quantile
      fst_sample_mean  = colMeans(sim$fst_sample, na.rm = TRUE),             # mean sample FST
      fst_sample_low   = .quantile_cols(sim$fst_sample, 0.025),
      fst_sample_high  = .quantile_cols(sim$fst_sample, 0.975)
    )
  }
  results <- do.call(rbind, results)                    # stack all scenarios into one data frame
  if (!is.null(generation_time)) {
    results$years <- results$generation * generation_time   # optional conversion to years
  }

  # ---- 4. Grey zone: first generation with power >= threshold ---------------
  grey_zone <- .grey_zone(results, power_threshold, generation_time, test)

  # ---- 5. Return a "lag_power" object -----------------------------------------
  out <- list(
    results   = results,
    grey_zone = grey_zone,
    settings  = list(n_loci = length(p_anc),
                     n_alleles = vapply(p_anc, length, integer(1)),
                     N1 = N1, N2 = N2, flow_type = flow_type,
                     n_sample = n_sample, ploidy = ploidy,
                     mutation = mutation, mu = mu, test = test,
                     alpha = alpha, n_perm = n_perm,
                     power_threshold = power_threshold, n_rep = n_rep,
                     generation_time = generation_time,
                     max_generation = max(sample_gens))
  )
  class(out) <- "lag_power"                             # gives access to print.lag_power(), plot.lag_power()
  out
}


# =============================================================================
#  Internal helpers (not exported)
# =============================================================================

# Power = proportion of replicates (rows) with p-value <= alpha, per column.
# Returns NA for every generation when no test was run (test = "none").
.power <- function(p_value, alpha) {
  if (all(is.na(p_value))) return(rep(NA_real_, ncol(p_value)))
  colMeans(p_value <= alpha, na.rm = TRUE)
}

# Quantile of each column of a matrix (e.g. 2.5% of FST at each generation).
.quantile_cols <- function(x, prob) {
  apply(x, 2, stats::quantile, probs = prob, na.rm = TRUE, names = FALSE)
}

# For each gene-flow value, the first sampled generation with power >= threshold.
.grey_zone <- function(results, power_threshold, generation_time, test) {
  if (test == "none") return(NULL)                      # no test, no power, no grey zone
  scenarios <- unique(results$gene_flow)
  gz <- lapply(scenarios, function(g) {
    r <- results[results$gene_flow == g, ]              # rows of this scenario
    reached <- which(r$power >= power_threshold)        # generations where the threshold is reached
    data.frame(
      gene_flow           = g,
      generations_to_detect = if (length(reached)) r$generation[min(reached)] else NA_integer_,
      max_power           = max(r$power, na.rm = TRUE),   # best power reached in the simulated period
      reached             = length(reached) > 0
    )
  })
  gz <- do.call(rbind, gz)
  if (!is.null(generation_time)) gz$years_to_detect <- gz$generations_to_detect * generation_time
  gz
}

# Expected FST under drift only (no migration, no mutation), used in tests:
# within-population diversity decays as (1 - 1/(2 Ne))^t, between stays constant,
# so Hudson's FST = 1 - mean of the decay factors of the two populations.
# For haplodiploids with an equal sex ratio, the per-generation rate of loss is
# 1/(2 * Ne_X) with Ne_X = 9 Nf Nm / (4 Nm + 2 Nf) = 0.75 N (as for X chromosomes).
.expected_fst_drift <- function(t, N1, N2 = N1, ploidy = "diploid") {
  rate <- switch(ploidy,
                 diploid      = function(N) 1 / (2 * N),
                 haploid      = function(N) 1 / N,
                 haplodiploid = function(N) 1 / (2 * 0.75 * N))
  1 - ((1 - rate(N1))^t + (1 - rate(N2))^t) / 2
}
