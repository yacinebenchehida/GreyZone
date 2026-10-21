# =============================================================================
#  lagpower-package.R  --  package-level documentation and settings
# =============================================================================
#  This file contains no functions. Its roxygen comments (lines starting
#  with #') are turned into the help page ?lagpower and into instructions
#  for the NAMESPACE file when running  roxygen2::roxygenise().

#' lagpower: genetic lag time and power to detect population differentiation
#'
#' When a genetic study finds no population structure, three explanations
#' compete:
#' 1. **lag time**: the populations split too recently for drift to have
#'    changed allele frequencies detectably (the "grey zone");
#' 2. **low power**: the markers or sample sizes are too limited;
#' 3. **genuine connectivity**: gene flow keeps the populations homogeneous.
#'
#' `lagpower` simulates the split of an ancestral population and reports,
#' generation by generation, the probability of detecting differentiation
#' with the user's own markers and sampling design.
#'
#' Main functions:
#' * [lag_power()]: run the simulations;
#' * [equal_freqs()], [freqs_from_table()], [freqs_from_genind()],
#'   [freqs_from_vcf()]: define the ancestral allele frequencies;
#' * [plot.lag_power()]: plot power and FST against time;
#' * [launch_app()]: start the point-and-click (Shiny) interface.
#'
#' @keywords internal
"_PACKAGE"

# The two lines below are instructions for roxygen2 to write in NAMESPACE:
#  - useDynLib: load the compiled C++ code when the package is loaded;
#  - importFrom(Rcpp, sourceCpp): makes sure Rcpp itself is loaded first.
#' @useDynLib lagpower, .registration = TRUE
#' @importFrom Rcpp sourceCpp
NULL
