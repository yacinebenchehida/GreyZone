# A guided tour of the lagpower code

This guide is for reading and changing the code. It assumes you know R well and learned some C a long time ago. Every line of code in the package is commented, so read this guide first, then the files in the order suggested below.

---

## 1. The big picture

```
 R user
   │   lag_power(N1 = 1000, Nm = c(0, 10), ...)            R/lag_power.R
   ▼
 R checks arguments, converts Nm -> m, loops over gene-flow values
   │   .simulate_split_cpp(...)        ← the bridge to C++
   ▼
 C++ engine (fast)                                          src/simulate.cpp
   for each replicate:
     both populations start with the ancestral frequencies
     for each generation:
        migrate()     gene flow                             src/drift.cpp
        mutate()      mutation                              src/drift.cpp
        reproduce()   genetic drift                         src/drift.cpp
     at each sampling generation:
        sample_individuals()                                src/sampling.cpp
        fst_from_sample(), chisq_test() / permutation_test_fst()   src/statistics.cpp
   returns 3 matrices: true FST, sample FST, p-values (replicates × generations)
   ▼
 R summarises: power = proportion of p ≤ alpha; grey zone = first generation with power ≥ threshold
   ▼
 print() / plot() / diagnose()                              R/methods.R
```

The rule of thumb: **R does everything that runs once** (checking, summarising, plotting). **C++ does everything that runs millions of times** (the generation loop, sampling, permutations).

### Suggested reading order

1. `R/lag_power.R`: the main function (pure R).
2. `src/lagpower.h`: the data types and the list of C++ functions.
3. `src/simulate.cpp`: the main loop.
4. `src/drift.cpp`, `src/sampling.cpp`, `src/statistics.cpp`: the details.
5. `R/methods.R`, `R/allele_frequencies.R`, `inst/app/app.R`.

---

## 2. The model in plain words

The simulation follows **allele frequencies**, not individual animals (Wright–Fisher model).

- **Drift.** The next generation's gene pool is a random draw of 2N gene copies (diploid) from the current one. In R terms this is `rmultinom(1, size = 2 * N, prob = p) / (2 * N)`. That is exactly what `reproduce()` does, using the same R function from C++.
- **Migration.** Each generation, a proportion m of a population's genes comes from the other population: `p1_new = (1 - m) * p1 + m * p2`.
- **Mutation.** Applied to the frequencies before drift. With the K-allele model, a copy becomes any other allele. With the stepwise model, it gains or loses one repeat.
- **Sampling.** n individuals are drawn from each population's frequencies, under Hardy–Weinberg proportions. This adds the sampling error of a real study.
- **Test.** Either a chi-square test on allele counts summed over loci (as in POWSIM), or a permutation test on FST (as in Bailleul et al. 2018 and Ben Chehida et al. 2020).

Because the cost does not depend on N, Ne = 1,000,000 is as fast as Ne = 1,000.

---

## 3. Rcpp for someone who knew C

### What is the same as C

- `int`, `double`, `for (int i = 0; i < n; i++)`, `if / else`, `while`, `+=`, `++`, `return`.
- `struct` groups variables (`Deme` in `lagpower.h`).
- `enum` gives names to integer constants (`DIPLOID`, `HAPLOID`, ...).
- Integer division truncates (`7 / 2 == 3`), hence the casts such as `(double) counts[a] / n_copies`.
- `// comment` and `/* comment */`.
- **Indices start at 0**, unlike R. Allele 1 in R is allele 0 in C++.

### What is new in C++ (and used in this package)

| C++ | Meaning | C or R equivalent |
|---|---|---|
| `std::vector<double> v(K);` | Array of K doubles that knows its length (`v.size()`) and frees itself | `double *v = malloc(K * sizeof(double))` (no `free` needed); R `numeric(K)` |
| `std::vector<std::vector<double>>` | Vector of vectors: a "ragged" table (loci can have different numbers of alleles) | R `list` of numeric vectors |
| `using PopFreqs = ...;` | Gives a short name to a type | `typedef` |
| `void f(Deme& d)` | `d` is a **reference**: the function works on the original, not a copy | `void f(Deme *d)` with `d->` replaced by `d.` |
| `const Deme& d` | Reference that the function promises not to modify | `const Deme *d` |
| `std::string` | Text that can be compared with `==` | `char*` + `strcmp` |
| `std::swap(a, b)` | Exchange two values | three lines with a temporary variable |
| `v.data()` | Pointer to the first element, to call C functions | the array name itself |
| `static` (before a function) | Function private to its file | same as in C |

### What Rcpp adds

| Rcpp | Meaning |
|---|---|
| `// [[Rcpp::export(name = ".simulate_split_cpp")]]` | Makes the next C++ function callable from R under that name. Rcpp writes the glue code (`src/RcppExports.cpp`, `R/RcppExports.R`) automatically. **Never edit these two files by hand.** |
| `Rcpp::List`, `Rcpp::NumericMatrix`, `Rcpp::IntegerVector` | C++ views of R objects. A `NumericMatrix` created in C++ arrives in R as a normal matrix. |
| `Rcpp::as<std::vector<double>>(x)` | Converts an R object into a C++ type |
| `Rcpp::List::create(Rcpp::Named("a") = x, ...)` | Builds a named R list to return, like `list(a = x, ...)` |
| `R::rmultinom`, `R::runif`, `R::pchisq` | R's own C functions (same as `rmultinom()`, `runif()`, `pchisq()` in R). They use **R's random number generator**, so `set.seed()` in R makes the C++ code reproducible. |
| `NA_REAL` | R's `NA` for numbers |
| `Rcpp::stop("message")` | Like R's `stop()`: the error appears in R |
| `Rcpp::checkUserInterrupt()` | Lets the user interrupt a long run with Esc or Ctrl+C |

### The development cycle

```r
# after editing any file (R or C++), from the package folder:
Rcpp::compileAttributes()   # regenerate the R <-> C++ glue (only needed if an exported C++ function changed)
roxygen2::roxygenise()      # regenerate NAMESPACE and help pages from the #' comments
devtools::install()         # compile the C++ and install the package
devtools::test()            # run the automatic tests
```

`devtools::load_all()` is a quicker way to try changes without installing.

If the C++ does not compile, the compiler error gives the file and line number. Most errors are a missing `;`, a type mismatch (`int` vs `double`), or a function used before it is declared in `lagpower.h`.

---

## 4. Where to make common changes

| I want to... | Edit |
|---|---|
| Add a new argument visible to users | `R/lag_power.R` (argument + `#' @param`), then pass it to `.simulate_split_cpp()` and add it to the C++ function in `src/simulate.cpp` |
| Change what happens each generation (e.g. population size changes) | `src/drift.cpp` + the generation loop in `src/simulate.cpp` |
| Add a new test of differentiation | a new function in `src/statistics.cpp`, declared in `src/lagpower.h`, called in `src/simulate.cpp`, plus the new choice in `test = c(...)` in R |
| Add a new input format | `R/allele_frequencies.R` (must return a list of frequency vectors) |
| Change the plot or the interpretation | `R/methods.R` |
| Change the app | `inst/app/app.R` |
| Check nothing broke | `devtools::test()`; add a `test_that()` block in `tests/testthat/` for new features |

---

## 5. Known simplifications (to discuss as a team)

- **FST estimator.** We use Hudson's FST (Bhatia et al. 2013), because its expectation under drift is exactly 1 − (1 − 1/2N)ᵗ, which makes validation easy. Weir & Cockerham's θ could be added as an option, to match GENETIX, Arlequin or hierfstat outputs.
- **Haplodiploids.** The model assumes an equal sex ratio and samples females only. A `sex_ratio` argument and male sampling could be added.
- **Constant sizes.** Bottlenecks and declines, as in Bailleul's scenarios, are the next obvious feature: replace the constant N with a vector of N per generation.
- **Two populations only.** More demes and stepping-stone migration would need a migration matrix.
- **Mutation is deterministic on frequencies.** This is fine for small μ. An infinite-allele model would need allele vectors that grow over time.
