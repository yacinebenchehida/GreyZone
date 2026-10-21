# =============================================================================
#  methods.R  --  print(), plot(), as.data.frame() and diagnose() for the
#                 objects returned by lag_power()
# =============================================================================
#
#  In R, a "method" is a version of a generic function (print, plot...)
#  specialised for one class. Because lag_power() returns an object of class
#  "lag_power", typing  print(res)  or just  res  automatically calls
#  print.lag_power(res), and  plot(res)  calls plot.lag_power(res).
# =============================================================================


#' Print a lag_power result
#'
#' @param x An object returned by [lag_power()].
#' @param ... Not used.
#' @return `x`, invisibly.
#' @export
print.lag_power <- function(x, ...) {
  s <- x$settings                                         # shortcut to the settings

  cat("lagpower: genetic lag time and power to detect differentiation\n")
  cat("----------------------------------------------------------------\n")
  cat(sprintf("Populations : N1 = %d, N2 = %d (%s)\n", s$N1, s$N2, s$ploidy))
  cat(sprintf("Markers     : %d loci, %s alleles per locus (median), mutation = %s%s\n",
              s$n_loci, stats::median(s$n_alleles), s$mutation,
              if (s$mutation != "none") paste0(" (mu = ", s$mu, ")") else ""))
  cat(sprintf("Sampling    : %d + %d individuals, test = %s, alpha = %g\n",
              s$n_sample[1], s$n_sample[2], s$test, s$alpha))
  cat(sprintf("Simulation  : %d replicates, %d generations\n\n", s$n_rep, s$max_generation))

  if (is.null(x$grey_zone)) {                             # test = "none": nothing more to report
    cat("No test was run (test = 'none'): see $results for FST values.\n")
    return(invisible(x))
  }

  cat(sprintf("Grey zone (generations until power >= %.0f%%):\n", 100 * s$power_threshold))
  for (i in seq_len(nrow(x$grey_zone))) {                 # one line per gene-flow value
    g <- x$grey_zone[i, ]
    label <- sprintf("  %s = %-8g", s$flow_type, g$gene_flow)
    if (g$reached) {
      years <- if (!is.null(s$generation_time)) sprintf(" (~%g years)", g$years_to_detect) else ""
      cat(sprintf("%s detected after %d generations%s\n", label, g$generations_to_detect, years))
    } else {
      cat(sprintf("%s never reached within %d generations (max power = %.0f%%)\n",
                  label, s$max_generation, 100 * g$max_power))
    }
  }
  cat("\nUse plot() to see power and FST over time, and diagnose() to interpret\n")
  cat("an absence of structure for a given time since the split.\n")
  invisible(x)                                            # print methods return their input invisibly
}


#' Convert a lag_power result to a data frame
#'
#' @param x An object returned by [lag_power()].
#' @param ... Not used.
#' @return The `results` data frame (one row per gene-flow value and generation).
#' @export
as.data.frame.lag_power <- function(x, ...) {
  x$results
}


#' Plot power and FST against time since the split
#'
#' Left panel: probability of detecting differentiation (power) against
#' generations since the split, one line per gene-flow value; the dashed line
#' is `power_threshold`. Right panel: FST estimated from the samples (mean and
#' 95% range across replicates).
#'
#' @param x An object returned by [lag_power()].
#' @param observed_fst Optional FST observed in the real data, drawn as a
#'   horizontal line on the FST panel, to see where the real data fall.
#' @param years If `TRUE` and `generation_time` was given, the x axis is in years.
#' @param ... Not used.
#' @return `x`, invisibly.
#' @export
plot.lag_power <- function(x, observed_fst = NULL, years = FALSE, ...) {
  r <- x$results                                          # the summary table
  s <- x$settings
  use_years <- years && !is.null(s$generation_time)       # years only if a generation time is known
  r$time <- if (use_years) r$years else r$generation      # x-axis values
  x_label <- if (use_years) "Years since split" else "Generations since split"

  scenarios <- unique(r$gene_flow)                        # one colour per gene-flow value
  cols <- grDevices::hcl.colors(length(scenarios), "Dark 3")
  legend_text <- paste(s$flow_type, "=", scenarios)

  has_power <- !all(is.na(r$power))                       # FALSE when test = "none"
  old <- graphics::par(mfrow = c(1, if (has_power) 2 else 1),  # 1 or 2 panels side by side
                       mar = c(4.5, 4.5, 2, 1))
  on.exit(graphics::par(old))                             # restore the user's settings when done

  # ---- Panel 1: power over time ----
  if (has_power) {
    graphics::plot(NA, xlim = range(r$time), ylim = c(0, 1),   # empty frame
                   xlab = x_label, ylab = "Power (P detect)",
                   main = "Power to detect the split")
    graphics::abline(h = s$power_threshold, lty = 2, col = "grey40")  # threshold
    graphics::abline(h = s$alpha, lty = 3, col = "grey60")            # false-positive level
    for (i in seq_along(scenarios)) {
      ri <- r[r$gene_flow == scenarios[i], ]
      graphics::lines(ri$time, ri$power, col = cols[i], lwd = 2)
    }
    graphics::legend("right", legend = legend_text, col = cols, lwd = 2, bty = "n")
  }

  # ---- Panel 2: FST over time ----
  ymax <- max(c(r$fst_sample_high, observed_fst), na.rm = TRUE)
  graphics::plot(NA, xlim = range(r$time), ylim = c(min(0, r$fst_sample_low, na.rm = TRUE), ymax),
                 xlab = x_label, ylab = "FST (Hudson, from samples)",
                 main = "Differentiation over time")
  for (i in seq_along(scenarios)) {
    ri <- r[r$gene_flow == scenarios[i], ]
    # Shaded 95% range: a polygon going along the upper bound and back along the lower bound
    graphics::polygon(c(ri$time, rev(ri$time)),
                      c(ri$fst_sample_high, rev(ri$fst_sample_low)),
                      col = grDevices::adjustcolor(cols[i], alpha.f = 0.2), border = NA)
    graphics::lines(ri$time, ri$fst_sample_mean, col = cols[i], lwd = 2)
  }
  if (!is.null(observed_fst)) {
    graphics::abline(h = observed_fst, col = "black", lwd = 2, lty = 4)
    graphics::mtext("observed FST", side = 3, line = 0, adj = 1, cex = 0.8)
  }
  if (!has_power) graphics::legend("topleft", legend = legend_text, col = cols, lwd = 2, bty = "n")

  invisible(x)
}


#' Interpret an absence of structure: lag, power, or connectivity?
#'
#' For a hypothesised time since the split (`split_time`, in generations),
#' reports for each gene-flow scenario the power the study design would have
#' had, and which explanation of "no structure detected" this supports:
#' * **genuine connectivity / scenario unlikely**: power at `split_time` is
#'   at least `power_threshold`, so a split of that age with that gene flow
#'   would very probably have been detected; failing to detect it argues
#'   against this scenario;
#' * **lag time (grey zone)**: power is low at `split_time` but reaches the
#'   threshold later: the split may be real but too recent to be seen;
#' * **insufficient power / high gene flow**: power never reaches the
#'   threshold within the simulated period: with this design (and this gene
#'   flow) the scenario cannot be told apart from panmixia. If this happens
#'   even with `Nm = 0`, more loci or samples are needed.
#'
#' @param x An object returned by [lag_power()].
#' @param split_time Hypothesised number of generations since the split.
#' @return A data frame (one row per gene-flow value), printed as well.
#' @examples
#' res <- lag_power(N1 = 1000, Nm = c(0, 10, 100), generations = 100,
#'                  n_rep = 50, seed = 1)
#' diagnose(res, split_time = 30)
#' @export
diagnose <- function(x, split_time) {
  if (!inherits(x, "lag_power")) stop("'x' must be the result of lag_power().")
  if (is.null(x$grey_zone)) stop("No test was run (test = 'none'): nothing to diagnose.")
  s <- x$settings
  if (split_time > s$max_generation) {
    warning("split_time is beyond the simulated period: rerun lag_power() with more generations.")
  }

  out <- lapply(unique(x$results$gene_flow), function(g) {
    r <- x$results[x$results$gene_flow == g, ]
    # Power at split_time, by linear interpolation between sampled generations
    p_at_T <- stats::approx(r$generation, r$power, xout = split_time, rule = 2)$y
    gz <- x$grey_zone[x$grey_zone$gene_flow == g, ]

    verdict <- if (p_at_T >= s$power_threshold) {
      "detectable: absence of structure argues against this scenario"
    } else if (gz$reached) {
      sprintf("lag time: only detectable after ~%d generations", gz$generations_to_detect)
    } else {
      "not detectable with this design (low power and/or high gene flow)"
    }
    data.frame(gene_flow = g, split_time = split_time,
               power_at_split_time = round(p_at_T, 3), verdict = verdict)
  })
  out <- do.call(rbind, out)
  names(out)[1] <- s$flow_type                            # column named "Nm" or "m"
  out
}
