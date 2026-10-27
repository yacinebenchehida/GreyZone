# Animation model and development notes

## Numerical model

Two neutral diploid Wright–Fisher populations, constant Ne, unlinked biallelic loci, no mutation or selection. Daughter sizes sum to the ancestral Ne. Initial frequencies use a common representable grid so the populations start exactly identical, without an initial founder effect.

Migration is now **m**, the fraction of each receiving gene pool replaced per generation, with `0 ≤ m < 1`. Both sides use the same m. Before drift, `q1 = (1-m)*p1 + m*p2` and `q2 = (1-m)*p2 + m*p1`, calculated simultaneously from the old frequencies. Expected contributions to each recipient are `m*Ne1` and `m*Ne2`; equal m does not imply equal migrant counts when Ne differs. The earlier Nm/count parameter has been removed from this browser model.

Drift uses exact binomial draws via inversion and beta splitting, without looping over all individuals. Hudson FST is the ratio of summed within/between diversities. When all markers are identically fixed on both sides, FST is reported as zero by convention (the ratio is undefined). If within-population diversity is zero and any markers fix different alleles, FST is 1; other markers can be fixed for the same allele on both sides.

Sampling draws 2n gene copies independently per locus; n is capped at the smaller Ne. Detection uses an approximate multilocus Pearson chi-square homogeneity test at alpha .05, not an exact test or the package's permutation test. Rare variants and tiny samples can compromise calibration. This is an educational prototype, not validated inference software.

## Run and detection-time search

Settings changes return the page to Ready. Nothing is precomputed as a default answer. Run simulation starts both a new live history and a new batch of 80 independent histories. Browser entropy plus a run nonce generates a fresh master seed. Live drift, live sampling, illustration and the power batch use separate derived RNGs. The worker derives fresh evolution and observation streams for every replicate. A recorded seed reproduces a batch for development, while user-facing Run again always creates a fresh seed.

The worker holds 80 populations and advances all of them to successive checkpoints. It evaluates a new genetic sample at each checkpoint, then appends the detection share only once all 80 are checked. It stops at the first checkpoint reaching 80%, or flags elevated generation-zero rejection (>12%). Checkpoints are spaced by 1 generation below 20, by 5 below 200, by 20 below 2,000, by 100 below 20,000 and by 500 thereafter. The reported generation is the first *checked* crossing; the unobserved crossing could be earlier within that interval. Power is pointwise, not the cumulative probability of having detected by that time. Its worst-case Monte Carlo SE at 80 histories is about 5.6 percentage points.

The search range is managed internally. Safeguards stop computation after about 20 seconds or 200,000 generations. It can also stop when every history is in an absorbing genetic state: both populations fixed at each SNP for m=0, or fixed for the same allele when m>0. Results distinguish finding 80% from stopping without a crossing. A stop reports the last complete checkpoint and does not infer a later crossing or universal impossibility. Partial checkpoint data are excluded from the curve.

Progress is stated as the generation and number of histories being checked, rather than a fabricated overall percentage for an unknown search duration. Stop search cancels the worker, and job IDs reject stale results. The live history continues independently, including after reaching the estimated 80% guide. Pause freezes live generations and animation, not the independent worker.

The power panel and the summary under the animation show the result and its input settings. The amber line is the 80% guide, and the green line is the live generation when it lies in the plotted range. No probabilities are extrapolated beyond checked times. Passing the guide never freezes the allele frequencies. A live-history safeguard pauses at 200,000 generations; chart history is thinned to bound SVG size.

## Mapping the model to sharks

`population-display.js` maps Ne to representatives: every individual through N=200, then `round(200 + 60 * log10(N/200))`. The west count is rounded from that total and the split ratio; the east is the remainder. The headcount and approximate individuals per shark are labelled. Counts in transit can temporarily differ from the settled allocation. The drawing is not a model of shark life history.

Migration crossings are intentionally sparse. The illustrative paired-event rate is `min(0.2, 0.045 * log1p(m * displayedTotal * 0.5 * generationsPerSecond))` events/second. The scene waits until the prior pair has finished, clears accumulated backlog, and permits at most two animals in transit. Events cannot occur for m=0 or stopped generation playback. Paired icons illustrate intensity; they do not implement the numerical migration matrix or represent exact numbers in unequal populations.

The channel centre is fixed. Its half-width grows smoothly from 5.3% to at most 7.5% of scene height with m; land rendering and crossings use the same gap. Random destinations explore the available water, without a circular route or attraction to the basin centre. Local spacing uses a spatial grid. The accepted shark and hammerhead shape, body wave and eased turns are retained. Normal travel = 1.75, Relaxed = 1, Fast = 3, independent of body-wave phase. Reduced motion suppresses animation and places the split immediately.

## SNP colours and fixation

Show SNPs displays every locus up to ten; above ten it selects ten evenly spaced indices. Each dot is one diploid SNP, with one half for each copy. The halves are turquoise or coral for the two neutral alleles. The drawing has up to two rows of five, radius 4.4, a white outline and a dark half-divider.

Displayed allele totals are rounded from `2 * displayedSideCount * modelFrequency`. Stable per-copy ranks are derived from the run seed, actor ID, locus, copy and side. They do **not** depend on generation. Consequently unchanged frequencies produce unchanged colours, and small frequency changes alter only the required ranked copies rather than repainting the school. Pure fixation at frequency 0 or 1 is always drawn uniformly. This is a frequency illustration, not an individual pedigree. Migration can reintroduce an allele after fixation; significance has no role in updating colours.

The live fixation readout counts all model SNPs fixed on both sides and how many fix opposite alleles. This separates within-population sorting from between-population contrasts and explains why FST=1 does not require all displayed loci to have opposite colours. The statistical test always uses all selected loci.

## Development checks

Run `python3 scripts/sync_animation_docs.py` after source changes and commit both `animation/` and `docs/` copies.

Run `node --test tests/animation-model.test.cjs tests/animation-display.test.cjs tests/animation-movement.test.cjs tests/shark-motion.test.cjs tests/animation-controls.test.cjs tests/animation-power.test.cjs`.

Checks cover model moments and drift, m as a proportion with unequal Ne, invalid migration inputs, exact initial equality, sampling, headcounts, sparse crossings and containment, stable and fixed SNP colours, FST=1 with shared fixed alleles, fresh/reproducible worker batches, automatic search beyond the former window, honest computation stops, stale-job cancellation and pause/resume.

Background: Bailleul et al. (2018), doi:10.1111/eva.12591; Ben Chehida et al. (2020), doi:10.1038/s41437-019-0284-1; Schleimer et al. (2024), doi:10.1111/icad.12725.
