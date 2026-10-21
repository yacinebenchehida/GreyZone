# GreyZone package

**Genetic lag time and power to detect population differentiation**

*Yacine Ben Chehida, Anna Schleimer, Xenia Moreira Lopez* · first draft (v0.0.1)

When a population-genetic study finds **no structure**, three explanations compete:

1. **Lag time**: the populations separated too recently for drift to change allele frequencies detectably (the *grey zone* of differentiation; Bailleul et al. 2018).
2. **Low power**: too few loci or individuals to detect the differentiation that exists.
3. **Genuine connectivity**: gene flow keeps the populations homogeneous.

`lagpower` simulates the split of an ancestral population into two populations, with drift, gene flow and mutation. It reports, generation by generation, the probability of detecting the split **with your own markers and sampling design**. The package turns into a reusable tool the simulation approach of Bailleul et al. (2018), Ben Chehida et al. (2020) and Schleimer et al. (2024), which all used simuPOP scripts plus POWSIM.

---

## Installation

```r
# install.packages("remotes")
remotes::install_github("yacinebenchehida/lagpower")   # once the repository exists
```

Optional packages: `adegenet` (microsatellite input), `vcfR` (VCF input), `shiny` (app).

## Quick start

```r
library(lagpower)

# Ben Chehida et al. (2020) design: 10 microsatellites, Ne = 1000 per population,
# 50 individuals sampled per population, four levels of gene flow
res <- lag_power(p_anc    = equal_freqs(n_loci = 10, n_alleles = 10),
                 N1       = 1000,
                 Nm       = c(0, 1, 10, 100),
                 generations = 100, every = 5,
                 n_sample = 50,
                 test     = "fst_perm",      # or "chisq" (POWSIM-like, faster)
                 n_rep    = 100,
                 generation_time = 10,       # optional: report years too
                 seed     = 1)

res                                # grey zone for each gene-flow value
plot(res, observed_fst = 0.001)    # power and FST over time
diagnose(res, split_time = 15)     # lag, power, or connectivity?
launch_app()                       # point-and-click interface
```

### Using your own data as the ancestral population

The ancestral population cannot be sampled. It is approximated by **pooling all present-day samples**. Drift is unbiased, so pooled frequencies estimate the ancestral ones, as in POWSIM.

```r
p <- freqs_from_genind(my_genind)                 # microsatellites (adegenet)
p <- freqs_from_vcf("my_snps.vcf.gz", max_loci = 2000)   # SNPs (vcfR)
p <- freqs_from_table(my_data_frame)              # columns: locus, allele, count (or freq)
p <- pad_alleles(p, 5)                            # extra allele sizes, for mutation = "smm"
```

## Main options

| Argument | Meaning |
|---|---|
| `N1`, `N2` | Effective size of each daughter population |
| `Nm` or `m` | Gene flow: number of migrants, or migration rate. A vector gives several scenarios |
| `ploidy` | `"diploid"`, `"haploid"` (e.g. mtDNA), `"haplodiploid"` |
| `mutation`, `mu` | `"none"`, `"kam"` (K-allele), `"smm"` (stepwise, microsatellites) |
| `n_sample` | Individuals sampled per population (one value or two) |
| `test` | `"chisq"` (POWSIM-like), `"fst_perm"` (permutation test on FST), `"none"` |
| `alpha`, `power_threshold` | Significance level; power marking the end of the grey zone (0.8; Bailleul et al. used 0.95) |

## Validation (first results)

These are reproduced with `inst/validation/ben_chehida_2020.R`: Ne = 1000, 10 loci × 10 alleles, n = 50, permutation test, 100 replicates.

| Nm | Power at 7 generations | at 14 | at 21 | Paper |
|---|---|---|---|---|
| 0 | 0.76 | 0.97 | 1.00 | ≈100% within ~7 generations |
| 1 | 0.75 | 0.99 | 0.99 | ≈100% within ~7 generations |
| 10 | 0.57 | 0.91 | 0.98 | > 80% within 20 generations |
| 100 | 0.14 | 0.19 | 0.23 (max 0.36) | stays < 40% |

Bailleul et al. (2018) scale (Nm = 0, 95% threshold): grey zone ≈ 150 generations for Ne = 10⁴ and ≈ 1,300 for Ne = 10⁵. The paper reports ≈ 200 and ≥ 1,000–1,600. Ne = 10⁶, which was out of reach with simuPOP, runs in the same time as Ne = 10⁴, because the engine follows allele frequencies.

Unit tests (`tests/testthat/`) check the simulator against theory: E[FST] = 1 − (1 − 1/2N)ᵗ under drift (diploid, haploid, haplodiploid), false-positive rate ≈ α at generation 0, and reproducibility with a seed.

## How the code is organised

See **[CODE_GUIDE.md](CODE_GUIDE.md)** for a guided tour, including a short Rcpp primer.

```
R/                     user-facing functions (R)
  lag_power.R          main function
  allele_frequencies.R ancestral frequencies: equal, table, genind, VCF
  methods.R            print(), plot(), diagnose()
  launch_app.R         starts the Shiny app
src/                   simulation engine (C++ via Rcpp)
  lagpower.h           shared declarations
  drift.cpp            migration, mutation, drift
  sampling.cpp         sampling individuals
  statistics.cpp       Hudson FST, chi-square and permutation tests
  simulate.cpp         main loop called from R
inst/app/app.R         Shiny interface
inst/validation/       scripts reproducing published results
tests/testthat/        automatic tests
```

## Current assumptions and limitations

- Wright–Fisher populations with discrete generations; N is taken as Ne; unlinked loci; neutral markers.
- Two daughter populations with constant size (size changes and bottlenecks are planned).
- Haplodiploid: equal sex ratio, females sampled.
- Mutation is applied to frequencies (good approximation for small μ). The number of allelic states is fixed, so use `pad_alleles()` with SMM.
- Genotypes in samples follow Hardy–Weinberg proportions within each population.

## References

- Bailleul D. et al. (2018) *Evolutionary Applications*. doi:10.1111/eva.12591
- Ben Chehida Y. et al. (2020) *Heredity*. doi:10.1038/s41437-019-0284-1
- Schleimer A. et al. (2024) *Insect Conservation and Diversity* 17: 601–615. doi:10.1111/icad.12725
- Ryman N. & Palm S. (2006) POWSIM. *Molecular Ecology Notes* 6: 600–602.
- Bhatia G. et al. (2013) Estimating and interpreting FST. *Genome Research* 23: 1514–1521.
