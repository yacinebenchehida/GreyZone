# Animation model and development notes

## Numerical model

Two neutral diploid Wright–Fisher populations, constant Ne, unlinked biallelic loci, no mutation or selection. Daughter sizes sum to the ancestral Ne. Initial frequencies use a common representable grid so the populations start exactly identical, without an initial founder effect.

Migration is now **m**, the fraction of each receiving gene pool replaced per generation, with `0 ≤ m < 1`. Both sides use the same m. Before drift, `q1 = (1-m)*p1 + m*p2` and `q2 = (1-m)*p2 + m*p1`, calculated simultaneously from the old frequencies. Expected contributions to each recipient are `m*Ne1` and `m*Ne2`; equal m does not imply equal migrant counts when Ne differs. The earlier Nm/count parameter has been removed from this browser model.

Drift uses exact binomial draws via inversion and beta splitting, without looping over all individuals. Hudson FST is the ratio of summed within/between diversities. When all markers are identically fixed on both sides, FST is reported as zero by convention (the ratio is undefined). If within-population diversity is zero and any markers fix different alleles, FST is 1; other markers can be fixed for the same allele on both sides.

Sampling draws 2n gene copies independently per locus; n is capped at the smaller Ne. Detection uses an approximate multilocus Pearson chi-square homogeneity test at alpha .05, not an exact test or the package's permutation test. Rare variants and tiny samples can compromise calibration. This is an educational prototype, not validated inference software.

## One live history and conditional study power

Only the main app evolves a population pair. A fresh master seed supplies separate streams for its drift, its interactive Take sample button, the study worker and the illustration. At each generation the app sends the worker the exact live population frequencies. The worker copies that snapshot and draws 1000 independent study datasets from it with the selected n per basin and all selected SNPs. It computes each sampled FST and chi-square p-value, then reports hits / 1000, the mean sample FST, and the live population FST. It never calls `initial` or `advance`, and never evolves another demographic history. A recorded seed and trajectory reproduce its output. This estimates sampling power conditional on the realised live history, not average power across independent drift histories.

Each completed generation also reports the 2.5th and 97.5th percentiles of those same 1000 sampled Hudson FST estimates, using linear interpolation at index (1000−1) × p. The FST plot shades this pointwise sampling range alongside the exact live population FST line. Negative estimates remain in the percentiles and the plot expands its lower axis when necessary. No extra samples, populations, or RNG draws are used for the band; partial generations never draw a band. This is not a confidence interval on the known population FST.

The worker yields after about 12 ms and reports completed studies during the current generation. The app allows one outstanding generation and waits for all 1000 studies before advancing. Partial results do not enter the plotted curve. No future generations are extrapolated. The first generation above zero with ≥80% detection remains visible; subsequent dips do not erase that crossing. Generation-zero detection >12% flags an unreliable null calibration. Power is pointwise, not cumulative; repeated looks and finite-simulation noise can shift its first crossing. Worst-case MCSE for 1000 independent study draws is about 1.58 percentage points.

Evolution continues after detection. Automatic completion occurs only after every numerical locus is stably fixed: both basins fixed for m=0, or both fixed for the same allele at all loci for m>0. Opposite fixation with migration does not end the run because migration can reintroduce variation. The final generation's 1000 study results are included before completion. There is no maximum-generation stop. Chart histories are thinned beyond 2,000 points, retaining generation zero, the first detection crossing and the latest point.

Explicit Pause cancels the animation-frame callback and background timer, and pauses the worker. No animation callbacks run while paused; inspection can redraw a frozen scene. Queued messages cannot repaint paused results. Resume retains population and sampling RNG state. Single-step temporarily completes one generation's study task and pauses again. Changing tab visibility no longer pauses the run: a background timer advances genetics while requestAnimationFrame is unavailable, subject to browser throttling. Both controls reject old worker job IDs. Playback speed limits are 1.5, 6 and 25 gen/s; swimming speed is independent.

## Mapping the model to sharks

`population-display.js` maps Ne to representatives: every individual through N=200, then `round(200 + 60 * log10(N/200))`. The west count is rounded from that total and the split ratio; the east is the remainder. The headcount and approximate individuals per shark are labelled. Counts in transit can temporarily differ from the settled allocation. The drawing is not a model of shark life history.

Single illustrative crossings alternate directions. Launches use `min(0.65, m * displayedTotal * generationsPerSecond * 0.25)` events/second: linear in m below the visual cap. There are at most three sharks in transit, with no accumulated queue. Events cannot launch for m=0 or stopped playback. Approaches and channel transit use 1.2 times ordinary travel speed; there is no near-entry slowdown. Counts are illustrative, especially with unequal Ne, rather than an implementation of the numerical migration matrix. Completing a crossing invalidates the genotype cache immediately, even when no new numerical generation has occurred.

The channel centre is fixed. Its half-width grows smoothly from 5.3% to at most 7.5% of scene height with m; land rendering and crossings use the same gap. Random destinations explore the available water, without a circular route or attraction to the basin centre. Local spacing uses a spatial grid. The accepted shark and hammerhead shape, body wave and eased turns are retained. Normal travel = 0.95, Relaxed = 0.6, Fast = 1.6, independent of body-wave phase. Reduced motion suppresses animation and places the split immediately.

## SNP colours and fixation

The display uses exactly four SNP fill colours: light gold/orange `#f4c98b` for a locus segregating within at least one basin, grey `#aab0b2` for shared fixation, turquoise `#29d1be` in the west and coral `#f6a183` in the east for opposite fixation. Within the gold state, fill encodes copies of allele A: empty = 0 (B/B), half-filled = 1 (A/B), filled = 2 (A/A). The portrait shows numeric dosage and genotype for every shown dot, labelled with its original SNP index and dot number. The same copy pair drives the animal marker and the portrait. Fixed states keep their existing full state colours. These state palettes only affect the drawing, not genotype copies, allele frequencies or tests.

All loci up to ten are shown; above ten, ten evenly spaced indices are selected. Each diploid dot follows the body spine. Displayed allele totals round `2 * displayedSideCount * modelFrequency`. Stable ranks depend on the run seed, actor, locus, copy and side, so unchanged frequencies do not reshuffle genotype illustrations. Pure fixation is uniform at a corresponding SNP within a basin. Shared fixed loci can coexist with opposite-fixed loci at FST=1. Both body and portrait use the same palettes. The all-SNP fixation status determines completion, not just the displayed ten loci.

## Development checks

Run `python3 scripts/sync_animation_docs.py` after source changes and commit both `animation/` and `docs/` copies.

Run `node --test tests/animation-model.test.cjs tests/animation-display.test.cjs tests/animation-movement.test.cjs tests/shark-motion.test.cjs tests/animation-controls.test.cjs tests/animation-power.test.cjs`.

Checks cover model moments and drift, m as a proportion with unequal Ne, invalid migration inputs, exact initial equality, sampling, headcounts, sparse crossings and containment, stable and fixed SNP colours, FST=1 with shared fixed alleles, conditional study resampling without independent demographic evolution, reproducible study streams, 1000 samples of each live snapshot, continued evolution after crossing, stable-fixation stopping, background continuation, stale-job cancellation, pause/resume, and the isolated 100-individual case through full fixation of the actual drawn genotypes.

Background: Bailleul et al. (2018), doi:10.1111/eva.12591; Ben Chehida et al. (2020), doi:10.1038/s41437-019-0284-1; Schleimer et al. (2024), doi:10.1111/icad.12725.


## Full SNP frequency view

All selected loci are listed in stable index order, with paired west/east allele-A frequency bars per SNP. The panel uses a scrollable two-column layout (one column on narrow phones), marks the ten displayed dot indices, and can filter to loci still segregating within at least one basin. Summary counts are computed before filtering. Exact 0/1 frequencies determine fixation. Unfixed near-endpoint frequencies use <0.01% or >99.99% labels. Display filters do not alter population frequencies, study samples, FST, or stopping. Rendering is cached for the current population snapshot and filter, so completing study resampling does not rebuild an unchanged list.
