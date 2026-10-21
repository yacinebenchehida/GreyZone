# =============================================================================
#  allele_frequencies.R  --  ways of defining the ANCESTRAL allele frequencies
# =============================================================================
#
#  The simulation starts from one ancestral population. Its allele
#  frequencies are stored as a LIST with one element per locus; each element
#  is a numeric vector of allele frequencies summing to 1. For example:
#
#     list(locus1 = c(0.5, 0.5),             # a SNP
#          locus2 = c(0.1, 0.2, 0.3, 0.4))   # a microsatellite with 4 alleles
#
#  All the functions in this file return a list in exactly this format.
#
#  Choosing frequencies from real data: the ancestral population cannot be
#  sampled, so its frequencies are approximated by POOLING all present-day
#  samples (both putative populations together). Drift is unbiased, so the
#  pooled frequencies are a fair estimate of the ancestral ones, and pooling
#  is consistent with the situation tested (no detectable structure).
#  POWSIM (Ryman & Palm 2006) uses observed frequencies in the same way.
# =============================================================================


# -----------------------------------------------------------------------------
#  Internal helper: check and clean a list of allele frequencies
# -----------------------------------------------------------------------------
#  Functions whose name starts with a dot are internal (not shown to users).
#  It: (1) checks the format, (2) rescales each locus to sum to 1,
#  (3) optionally removes monomorphic loci (no information for differentiation).
.check_freqs <- function(p_anc, drop_monomorphic = TRUE) {

  # Must be a non-empty list
  if (!is.list(p_anc) || length(p_anc) == 0) {
    stop("'p_anc' must be a non-empty list with one vector of allele frequencies per locus.")
  }

  # Give default locus names (locus1, locus2, ...) if there are none
  if (is.null(names(p_anc))) {
    names(p_anc) <- paste0("locus", seq_along(p_anc))
  }

  locus_names <- names(p_anc)                              # remember the names (lapply below loses them)

  # Check each locus and rescale it so that its frequencies sum to 1
  p_anc <- lapply(locus_names, function(locus) {           # loop over locus names
    p <- p_anc[[locus]]                                    # frequencies of this locus
    if (!is.numeric(p) || any(is.na(p)) || any(p < 0)) {   # must be numbers >= 0
      stop("Locus '", locus, "': frequencies must be non-negative numbers without NA.")
    }
    if (sum(p) == 0) stop("Locus '", locus, "': all frequencies are zero.")
    as.numeric(p / sum(p))                                 # rescale to sum to 1
  })

  # lapply() over names returns an unnamed list: put the names back
  names(p_anc) <- locus_names

  # Optionally remove monomorphic loci (only one allele with frequency > 0)
  if (drop_monomorphic) {
    n_present <- vapply(p_anc, function(p) sum(p > 0), numeric(1))  # alleles present per locus
    if (any(n_present < 2)) {
      message("Removing ", sum(n_present < 2), " monomorphic locus/loci.")
      p_anc <- p_anc[n_present >= 2]
    }
    if (length(p_anc) == 0) stop("No polymorphic locus left.")
  }

  p_anc
}


# -----------------------------------------------------------------------------
#  1. Equal frequencies (the design of Bailleul 2018 / Ben Chehida 2020)
# -----------------------------------------------------------------------------

#' Ancestral allele frequencies all equal
#'
#' Creates `n_loci` loci, each with `n_alleles` alleles at equal frequency
#' (1 / `n_alleles`). This is the starting point used by Bailleul et al.
#' (2018), Ben Chehida et al. (2020) and Schleimer et al. (2024), and is
#' useful to reproduce their results or explore designs before data exist.
#'
#' @param n_loci Number of loci.
#' @param n_alleles Number of alleles per locus: one value for all loci, or
#'   one value per locus. Use 2 for SNPs.
#' @return A named list of allele-frequency vectors (one per locus).
#' @examples
#' equal_freqs(n_loci = 3, n_alleles = 4)
#' equal_freqs(n_loci = 1000, n_alleles = 2)   # 1000 SNPs at frequency 0.5
#' @export
equal_freqs <- function(n_loci = 10, n_alleles = 10) {
  if (length(n_alleles) == 1) n_alleles <- rep(n_alleles, n_loci)  # same number for every locus
  if (length(n_alleles) != n_loci) stop("'n_alleles' must have length 1 or n_loci.")
  if (any(n_alleles < 2)) stop("Each locus needs at least 2 alleles.")
  p <- lapply(n_alleles, function(k) rep(1 / k, k))  # k alleles at frequency 1/k
  names(p) <- paste0("locus", seq_len(n_loci))       # locus1, locus2, ...
  p
}


# -----------------------------------------------------------------------------
#  2. From a table or a list typed by the user
# -----------------------------------------------------------------------------

#' Ancestral allele frequencies from a table
#'
#' Accepts either
#' * a list of numeric vectors (one per locus; frequencies or counts), or
#' * a data frame with columns `locus`, `allele` and either `freq` or
#'   `count`.
#'
#' Frequencies are rescaled to sum to 1 at each locus, so counts can be
#' given directly. For microsatellites and the stepwise mutation model,
#' alleles are ordered by allele size when `allele` is numeric.
#'
#' @param x A list or a data frame (see Description).
#' @param drop_monomorphic Remove loci with a single allele (default `TRUE`).
#' @return A named list of allele-frequency vectors (one per locus).
#' @examples
#' df <- data.frame(locus  = c("A", "A", "B", "B", "B"),
#'                  allele = c(150, 152, 98, 100, 104),
#'                  count  = c(30, 70, 10, 50, 40))
#' freqs_from_table(df)
#' @export
freqs_from_table <- function(x, drop_monomorphic = TRUE) {

  # Case 1: already a list -> only check it
  if (is.list(x) && !is.data.frame(x)) {
    return(.check_freqs(x, drop_monomorphic))
  }

  # Case 2: a data frame
  if (!is.data.frame(x)) stop("'x' must be a list or a data frame.")
  if (!all(c("locus", "allele") %in% names(x))) {
    stop("The data frame needs columns 'locus' and 'allele'.")
  }
  value_col <- if ("freq" %in% names(x)) "freq" else if ("count" %in% names(x)) "count" else
    stop("The data frame needs a column 'freq' or 'count'.")

  # Split the rows by locus, keeping the order in which loci first appear
  loci <- unique(as.character(x$locus))
  p <- lapply(loci, function(l) {
    rows <- x[as.character(x$locus) == l, ]                     # rows of this locus
    allele_num <- suppressWarnings(as.numeric(as.character(rows$allele)))
    if (!any(is.na(allele_num))) rows <- rows[order(allele_num), ]  # numeric alleles: sort by size
    v <- rows[[value_col]]                                       # the frequencies or counts
    names(v) <- as.character(rows$allele)                       # keep allele names
    v
  })
  names(p) <- loci

  # Keep the allele names aside, because .check_freqs() drops them
  allele_names <- lapply(p, names)
  p <- .check_freqs(p, drop_monomorphic)
  for (l in names(p)) names(p[[l]]) <- allele_names[[l]]
  p
}


# -----------------------------------------------------------------------------
#  3. From a genind object (adegenet), e.g. microsatellites
# -----------------------------------------------------------------------------

#' Ancestral allele frequencies from a genind object
#'
#' Pools all individuals of a `genind` object (package **adegenet**) and
#' returns the allele frequencies at each locus. Typical use: microsatellite
#' data read with `adegenet::read.genepop()` or `adegenet::df2genind()`.
#' Missing genotypes are ignored. Alleles are ordered by size when their
#' names are numbers (needed for the stepwise mutation model).
#'
#' @param x A `genind` object.
#' @param drop_monomorphic Remove loci with a single allele (default `TRUE`).
#' @return A named list of allele-frequency vectors (one per locus).
#' @export
freqs_from_genind <- function(x, drop_monomorphic = TRUE) {

  # adegenet is only "suggested", so check it is installed before using it
  if (!requireNamespace("adegenet", quietly = TRUE)) {
    stop("Package 'adegenet' is needed: install.packages('adegenet')")
  }
  if (!inherits(x, "genind")) stop("'x' must be a genind object.")

  tab   <- adegenet::tab(x)                   # matrix: individuals x alleles, allele counts
  locus <- adegenet::locFac(x)                # which locus each column belongs to
  allele <- unlist(adegenet::alleles(x))      # allele names, in column order

  counts <- colSums(tab, na.rm = TRUE)        # total count of each allele, all individuals pooled

  # Build a data frame and let freqs_from_table() do the rest (sorting, checks)
  df <- data.frame(locus  = as.character(locus),
                   allele = allele,
                   count  = counts,
                   stringsAsFactors = FALSE)
  freqs_from_table(df, drop_monomorphic)
}


# -----------------------------------------------------------------------------
#  4. From a VCF file (SNPs)
# -----------------------------------------------------------------------------

#' Ancestral allele frequencies from a VCF file
#'
#' Reads a VCF file with **vcfR**, pools all individuals and returns the
#' allele frequencies at each site. Works for any ploidy written in the GT
#' field (e.g. `0/1`, `0|1`, `1`). Missing genotypes (`./.`) are ignored.
#'
#' Large VCF files can be slow to simulate: use `max_loci` to keep a random
#' subset of sites (power then refers to that number of SNPs).
#'
#' @param file Path to a `.vcf` or `.vcf.gz` file, or a `vcfR` object.
#' @param max_loci Optional maximum number of sites to keep (random subset).
#' @param drop_monomorphic Remove sites with a single allele (default `TRUE`).
#' @return A named list of allele-frequency vectors (one per site).
#' @export
freqs_from_vcf <- function(file, max_loci = NULL, drop_monomorphic = TRUE) {

  if (!requireNamespace("vcfR", quietly = TRUE)) {
    stop("Package 'vcfR' is needed: install.packages('vcfR')")
  }

  # Read the file (unless a vcfR object was given directly)
  vcf <- if (inherits(file, "vcfR")) file else vcfR::read.vcfR(file, verbose = FALSE)

  gt <- vcfR::extract.gt(vcf, element = "GT")   # matrix: sites x individuals, e.g. "0/1"
  site_names <- vcfR::getID(vcf)                # site IDs (may be NA)
  if (all(is.na(site_names))) {                 # no IDs: use CHROM_POS instead
    site_names <- paste(vcfR::getCHROM(vcf), vcfR::getPOS(vcf), sep = "_")
  }

  # Turn the genotype matrix into allele frequencies (separate function, see below)
  p <- .freqs_from_gt_matrix(gt, site_names)

  # Optional random subset of sites, to keep run times reasonable
  if (!is.null(max_loci) && length(p) > max_loci) {
    p <- p[sort(sample(length(p), max_loci))]
  }

  .check_freqs(p, drop_monomorphic)
}

# Internal: from a matrix of GT strings (sites x individuals, e.g. "0/1", "1|1",
# "./.", NA) to a named list of allele COUNTS per site. Kept separate from
# freqs_from_vcf() so it can be tested without the vcfR package.
.freqs_from_gt_matrix <- function(gt, site_names) {
  # For each site (row), count how many times each allele index (0, 1, 2...) appears
  p <- lapply(seq_len(nrow(gt)), function(i) {
    calls   <- gt[i, ]                                     # genotypes of all individuals
    calls   <- calls[!is.na(calls)]                        # drop missing genotypes
    alleles <- unlist(strsplit(calls, "[/|]"))             # "0/1" -> "0", "1"
    alleles <- alleles[alleles != "."]                     # drop missing alleles
    if (length(alleles) == 0) return(c(1))                 # nothing observed: treat as monomorphic
    a <- as.integer(alleles)                               # "1" -> 1
    tabulate(a + 1, nbins = max(a) + 1)                    # counts of allele 0, 1, ... (+1: R indexes from 1)
  })
  names(p) <- site_names
  p
}


# -----------------------------------------------------------------------------
#  5. Add empty allele states on each side (for the stepwise mutation model)
# -----------------------------------------------------------------------------

#' Add empty allelic states around the observed allele range
#'
#' Under the stepwise mutation model (`mutation = "smm"`) alleles can only
#' move one repeat up or down, and the number of states is fixed at the
#' start of the simulation. Adding a few empty states on each side lets
#' alleles drift beyond the currently observed range.
#'
#' @param p_anc A list of allele frequencies (see [equal_freqs()]).
#' @param n_extra Number of empty states added below AND above (default 5).
#' @return The same list, with `n_extra` zeros added at both ends of each locus.
#' @examples
#' pad_alleles(list(c(0.5, 0.5)), n_extra = 2)   # 0 0 0.5 0.5 0 0
#' @export
pad_alleles <- function(p_anc, n_extra = 5) {
  lapply(p_anc, function(p) c(rep(0, n_extra), p, rep(0, n_extra)))
}
