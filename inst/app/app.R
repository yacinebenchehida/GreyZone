# =============================================================================
#  app.R  --  the Shiny interface to lag_power()   (first draft)
# =============================================================================
#
#  A Shiny app has two parts:
#    * ui     : what the page looks like (inputs on the left, outputs on the right);
#    * server : what R does when the user clicks "Run" (reads the inputs,
#               calls lag_power(), sends back the plot and tables).
#  The app only calls the package's functions, so the app and the R package
#  always give the same results.
#
#  Start it with  lagpower::launch_app()
# =============================================================================

library(shiny)      # the web-interface framework
library(lagpower)   # our package

# -----------------------------------------------------------------------------
#  User interface
# -----------------------------------------------------------------------------
ui <- fluidPage(

  titlePanel("lagpower: genetic lag time and power to detect a population split"),

  sidebarLayout(

    # ---------------- Left: inputs ----------------
    sidebarPanel(width = 4,

      h4("Markers (ancestral population)"),
      radioButtons("freq_source", NULL,
                   choices = c("Equal allele frequencies" = "equal",
                               "Upload a table (CSV: locus, allele, count)" = "table")),
      conditionalPanel("input.freq_source == 'equal'",        # shown only for "equal"
        numericInput("n_loci", "Number of loci", 10, min = 1),
        numericInput("n_alleles", "Alleles per locus (2 = SNP)", 10, min = 2)
      ),
      conditionalPanel("input.freq_source == 'table'",        # shown only for "table"
        fileInput("freq_file", "CSV file", accept = ".csv")
      ),
      selectInput("ploidy", "Ploidy", c("diploid", "haploid", "haplodiploid")),
      selectInput("mutation", "Mutation model", c("none", "kam", "smm")),
      conditionalPanel("input.mutation != 'none'",
        numericInput("mu", "Mutation rate (per generation)", 5e-4, min = 0)
      ),

      h4("Populations"),
      numericInput("N1", "Ne of population 1", 1000, min = 2),
      numericInput("N2", "Ne of population 2", 1000, min = 2),
      textInput("Nm", "Migrants per generation (Nm), comma-separated", "0, 1, 10, 100"),
      numericInput("generation_time", "Generation time (years, optional)", NA, min = 0),

      h4("Sampling and test"),
      numericInput("n_sample", "Individuals sampled per population", 50, min = 2),
      selectInput("test", "Test", c("chi-square (fast)" = "chisq",
                                    "FST permutation (slow)" = "fst_perm")),
      numericInput("alpha", "Significance level", 0.05, min = 0, max = 1),
      numericInput("power_threshold", "Power threshold (end of grey zone)", 0.8, min = 0, max = 1),

      h4("Simulation"),
      numericInput("generations", "Generations after the split", 200, min = 1),
      numericInput("every", "Sample every ... generations", 5, min = 1),
      numericInput("n_rep", "Replicates", 100, min = 10),
      numericInput("seed", "Random seed", 1),

      actionButton("run", "Run simulations", class = "btn-primary")
    ),

    # ---------------- Right: outputs ----------------
    mainPanel(width = 8,
      plotOutput("plot", height = "420px"),
      numericInput("observed_fst", "Observed FST in your data (optional, drawn on the plot)", NA),
      h4("Grey zone"),
      tableOutput("grey_zone"),
      h4("Interpretation for a hypothesised time since the split"),
      numericInput("split_time", "Generations since the split", 20, min = 0),
      tableOutput("diagnose")
    )
  )
)

# -----------------------------------------------------------------------------
#  Server: what happens when the user clicks "Run"
# -----------------------------------------------------------------------------
server <- function(input, output, session) {

  # eventReactive(): re-run ONLY when the "Run" button is clicked
  # (not every time an input changes).
  result <- eventReactive(input$run, {

    # 1. Ancestral allele frequencies
    p_anc <- if (input$freq_source == "equal") {
      equal_freqs(input$n_loci, input$n_alleles)
    } else {
      req(input$freq_file)                                    # wait until a file is uploaded
      freqs_from_table(utils::read.csv(input$freq_file$datapath))
    }

    # 2. Gene-flow values typed as "0, 1, 10" -> c(0, 1, 10)
    Nm <- as.numeric(strsplit(input$Nm, ",")[[1]])

    # 3. Run the simulations, with a progress message
    withProgress(message = "Simulating...", value = 0.5, {
      lag_power(p_anc = p_anc,
                N1 = input$N1, N2 = input$N2, Nm = Nm,
                generations = input$generations, every = input$every,
                n_sample = input$n_sample,
                ploidy = input$ploidy,
                mutation = input$mutation,
                mu = if (input$mutation == "none") 0 else input$mu,
                test = input$test, alpha = input$alpha,
                power_threshold = input$power_threshold,
                n_rep = input$n_rep,
                generation_time = if (is.na(input$generation_time)) NULL else input$generation_time,
                seed = input$seed)
    })
  })

  # Plot (redrawn when the result or the observed FST changes)
  output$plot <- renderPlot({
    obs <- if (is.na(input$observed_fst)) NULL else input$observed_fst
    plot(result(), observed_fst = obs)
  })

  # Grey zone table
  output$grey_zone <- renderTable(result()$grey_zone)

  # Interpretation table
  output$diagnose <- renderTable(diagnose(result(), input$split_time))
}

# Start the app
shinyApp(ui, server)
