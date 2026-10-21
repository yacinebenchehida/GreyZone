# =============================================================================
#  launch_app.R  --  start the point-and-click interface (Shiny)
# =============================================================================
#  The app's code lives in inst/app/app.R. When the package is installed,
#  everything in inst/ is copied into the installed package folder, and
#  system.file("app", package = "lagpower") finds it there.
#  The app runs on the user's own computer and opens in their web browser.
# =============================================================================

#' Launch the lagpower Shiny app
#'
#' Opens a point-and-click interface to [lag_power()] in your web browser.
#' Everything runs locally on your computer: no data are sent anywhere.
#'
#' @param ... Passed to [shiny::runApp()], e.g. `port = 8080` or
#'   `launch.browser = FALSE`.
#' @return Called for its side effect (starts the app).
#' @examples
#' \dontrun{
#' launch_app()
#' }
#' @export
launch_app <- function(...) {
  if (!requireNamespace("shiny", quietly = TRUE)) {          # shiny is only "suggested"
    stop("Package 'shiny' is needed: install.packages('shiny')")
  }
  app_dir <- system.file("app", package = "lagpower")        # folder of the installed app
  if (app_dir == "") stop("App not found: try reinstalling 'lagpower'.")
  shiny::runApp(app_dir, ...)                                # start the app
}
