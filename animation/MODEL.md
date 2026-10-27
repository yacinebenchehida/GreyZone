# Animation model and development notes

## Numerical model

Two neutral diploid Wright–Fisher populations, constant Ne, unlinked biallelic loci, no mutation or selection. Daughter sizes sum to the ancestral Ne. Initial frequencies use a common representable grid so the populations start exactly identical, without an initial founder effect.

Migration is now **m**, the fraction of each receiving gene pool replaced per generation, with `0 ≤ m < 1`. Both sides use the same m. Before drift, `q1 = (1-m)*p1 + m*p2` and `q2 = (1-m)*p2 + m*p1`, calculated simultaneously from the old frequencies. Expected contributions to each recipient are `m*Ne1` and `m*Ne2`; equal m does not imply equal migrant counts when Ne differs. The earlier Nm/count parameter has been removed from this browser model.

Drift uses exact binomial draws via inversion and beta splitting, without looping over all individuals. Hudson FST is the ratio of summed within/between diversities. When all markers are identically fixed on both sides, FST is reported as zero by convention (the ratio is undefined). If within-population diversity is zero and any markers fix different alleles, FST is 1; other markers can be fixed for the same allele on both sides.

Sampling draws 2n gene copies independently per locus; n is capped at the smaller Ne. Detection uses an approximate multilocus Pearson chi-square homogeneity test at alpha .05, not an exact test or the package's permutation test. Rare variants and tiny samples can compromise calibration. This is an educational prototype, not validated inference software.

## Run and live detection power

Settings changes return to Ready. Run starts a new live history and a new batch of 500 independent histories. Browser entropy plus a run nonce generates a fresh master seed. Live drift, sampling, display and the reference batch use separate derived RNGs. Each reference history has its own evolution and observation RNGs. A recorded seed reproduces a batch; user-facing Run again creates a fresh seed.

The worker receives an init message followed by advance messages containing the live generation. It advances all 500 reference histories only up to that requested generation, drawing a fresh study sample at each generation. Points are emitted only once all 500 have been evaluated. Work yields after approximately 12 ms so new requests can be received and the page remains responsive. If computation lags, the UI identifies the last checked generation. It never displays a future crossing. Worker and main page import the same versioned model URL to prevent a stale worker dependency after deployment.

There is no forward search, fixed terminal horizon, or absorbing-state early exit. The first checked generation above zero with at least 80% detections is retained and labelled. The curve continues afterwards, including later dips. This is pointwise power, not cumulative detection; repeated looks and Monte Carlo noise can make the first crossing optimistic. Worst-case Monte Carlo SE at 500 histories is about 2.24 percentage points. Generation-zero rejection above 12% flags poor calibration instead of declaring an immediate crossing. The main UI displays 'Not reached yet' before crossing and the numeric generation count in large type afterwards, labelled 'Generations to leave the grey zone'. The same count is repeated directly below the ocean.

The independent live history, FST and genotype colours continue after detection. FST and power share a generation axis, with FST shown on its fixed 0..1 scale. Grey shading stops at the first 80% crossing. Pause freezes the live clock, ocean, worker calculation and displayed power results. Both Pause buttons use the same playback function. The worker handles pause/resume messages while retaining its histories and RNG states. Any result already queued in transit is held without repainting a paused result or chart; Resume applies that result and continues the same batch. +1 generation temporarily permits the reference worker to reach that generation and pause again, while live playback stays paused. Old worker results are rejected by job ID. The live safety pause is 200,000 generations; FST history is thinned beyond 2,000 points.

## Mapping the model to sharks

`population-display.js` maps Ne to representatives: every individual through N=200, then `round(200 + 60 * log10(N/200))`. The west count is rounded from that total and the split ratio; the east is the remainder. The headcount and approximate individuals per shark are labelled. Counts in transit can temporarily differ from the settled allocation. The drawing is not a model of shark life history.

Single illustrative crossings alternate directions. Launches use `min(0.65, m * displayedTotal * generationsPerSecond * 0.25)` events/second: linear in m below the visual cap. There are at most three sharks in transit, with no accumulated queue. Events cannot launch for m=0 or stopped playback. Approaches and channel transit use 1.2 times ordinary travel speed; there is no near-entry slowdown. Counts are illustrative, especially with unequal Ne, rather than an implementation of the numerical migration matrix. Completing a crossing invalidates the genotype cache immediately, even when no new numerical generation has occurred.

The channel centre is fixed. Its half-width grows smoothly from 5.3% to at most 7.5% of scene height with m; land rendering and crossings use the same gap. Random destinations explore the available water, without a circular route or attraction to the basin centre. Local spacing uses a spatial grid. The accepted shark and hammerhead shape, body wave and eased turns are retained. Normal travel = 1.3, Relaxed = 0.8, Fast = 2.2, independent of body-wave phase. Reduced motion suppresses animation and places the split immediately.

## SNP colours and fixation

Show SNPs displays every locus up to ten; above ten it selects ten evenly spaced indices. Each dot is one diploid SNP, with one half for each copy. Marker state controls the palette: `segregating` uses two violet tones (#7257b5 / #d8c6f0) while either basin retains variation; `shared-fixed` uses gold (#e5b344) for the same fixed allele in both basins; `opposite-fixed` uses turquoise west and coral east. A full violet dot can be a homozygous individual at a locus that still segregates in that or the other basin. Thus individual genotype and locus-level fixation remain distinct. `markerPalettes` is a pure mapping of current frequencies, with no reference-history state. Raw gene copies, allele-A frequencies, FST and detection power are unchanged. Both swimming sharks and close-ups use the same palettes. The drawing has up to two rows of five, radius 4.4, a white outline; only heterozygotes have a dark half-divider. Homozygotes are solid circles.

Displayed allele totals are rounded from `2 * displayedSideCount * modelFrequency`. Stable per-copy ranks are derived from the run seed, actor ID, locus, copy and side. They do **not** depend on generation. Consequently unchanged frequencies produce unchanged colours, and small frequency changes alter only the required ranked copies rather than repainting the school. Pure fixation at frequency 0 or 1 is always drawn uniformly. This is a frequency illustration, not an individual pedigree. Migration can reintroduce an allele after fixation; significance has no role in updating colours.

The live fixation readout counts all model SNPs fixed on both sides and how many fix opposite alleles. This separates within-population sorting from between-population contrasts and explains why FST=1 does not require all displayed loci to have opposite colours. The statistical test always uses all selected loci. An expandable table lists the same displayed SNP IDs, current west/east allele-A frequencies, and whether each is segregating, shared fixed or opposite fixed.

## Development checks

Run `python3 scripts/sync_animation_docs.py` after source changes and commit both `animation/` and `docs/` copies.

Run `node --test tests/animation-model.test.cjs tests/animation-display.test.cjs tests/animation-movement.test.cjs tests/shark-motion.test.cjs tests/animation-controls.test.cjs tests/animation-power.test.cjs`.

Checks cover model moments and drift, m as a proportion with unequal Ne, invalid migration inputs, exact initial equality, sampling, headcounts, sparse crossings and containment, stable and fixed SNP colours, FST=1 with shared fixed alleles, fresh/reproducible worker batches, no calculation beyond the requested clock, continued power after crossing, stale-job cancellation, pause/resume, and the isolated 100-individual case through full fixation of the actual drawn genotypes.

Background: Bailleul et al. (2018), doi:10.1111/eva.12591; Ben Chehida et al. (2020), doi:10.1038/s41437-019-0284-1; Schleimer et al. (2024), doi:10.1111/icad.12725.


Generation playback uses half the earlier rates: Slow 1.5, Normal 6 and Fast 25 generations/second. These are upper limits. The live clock permits only one outstanding generation and waits for all 500 reference studies to finish before advancing. The worker reports completed histories within that generation. Sharks keep swimming while calculation is underway; explicit Pause still freezes both clocks and worker results. The histories, test and model equations are otherwise unchanged.
