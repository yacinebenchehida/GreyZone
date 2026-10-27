# Animation model and development notes

## Numerical assumptions

Two neutral diploid Wright–Fisher populations with constant sizes, no mutation, and independent biallelic loci. Daughter sizes sum to the ancestral total. Initial frequencies use a common representable grid so both daughter populations start exactly identical, without a founder effect. No demographic burn-in or actual allocation of ancestral individuals is performed.

Frequency migration occurs simultaneously before drift: each receiving population replaces Nm/N of its gene pool. Genetic drift uses exact binomial draws through inverse CDF and beta splitting, avoiding a loop over every individual. Hudson FST uses the ratio of summed within/between diversity. When all loci are identically fixed, the display reports 0 differentiation by convention (the ratio is undefined).

Sampling independently draws 2n copies at each locus, with n capped at the smaller population size. The multilocus Pearson chi-square is an asymptotic homogeneity test (alpha .05), not an exact test or the package's permutation test. Rare variants, small samples and late fixation can compromise calibration; this draft is not validated research software. Power is the rejection fraction across 80 independent population histories, sampled every 5 generations to generation 400, every 20 to 2,000, or every 100 to 10,000. It includes Monte Carlo noise (worst-case SE about .056); the first 80% crossing is an illustrative summary, not a known biological boundary. Sampling randomness is separate from evolutionary randomness. Power runs in a Web Worker.

## Mapping the model to the ocean

`population-display.js` maps numerical settings to the illustration. Up to 200 individuals, every individual is shown. Above 200, the displayed total is `round(200 + 60 * log10(N / 200))`: 200 → 200; 1,000 → 242; 4,000 → 278; 20,000 → 320; 100,000 → 362; 500,000 → 404. Both basins use the same overall compression. The western count is rounded from the displayed total and the split ratio; the eastern count is the remainder. The page shows both displayed headcounts and the approximate individuals per shark. The total shown remains constant during exchanges. Animals in transit can temporarily make the physical basin counts differ from the settled allocation.

The existing grey shark and hammerhead drawings, body wave and smooth steering are retained. Body size adjusts to the number displayed. Local spacing uses a spatial grid instead of comparing every pair of animals. Before the split, they share a single swimming area. When the barrier rises, the exact or proportionally rounded number settles on each side. Random destinations explore the available water without a circular route or a force attracting animals to the basin centre. The sandy landmass and coconut palm remain.

For migration, the expected number of visible exchanges per direction per second is `Nm * displayedTotal / N * generationsPerSecond`. To keep fast playback watchable, the launch rate is compressed to `0.8 * log1p(expected)`. A fractional budget schedules paired departures, one each way, after the barrier has finished rising. Candidates near the channel swim through the existing passage. The rate is zero for complete isolation or stopped generation playback, rises monotonically with Nm and generation playback, and accounts for population compression. This is an illustration of migration intensity, not an exact visual census per generation. Numerical migration in model.js is unchanged.

Travel speed offers Relaxed = 1, Normal = 1.75 (the previous Relaxed speed) and Fast = 3. It controls displacement through the water independently of body-wave cadence. Animal switches the illustration without changing or resetting the experiment. Generations sets numerical playback and the migration launch budget. Pause freezes generations, travel, body waves, the crossing budget and water effects together. Play resumes without replaying elapsed wall time. +1 generation leaves motion paused. The introductory sea swims before model playback starts, without migration. Reduced-motion preferences suppress swimming and animated water, and place the split representatives immediately.

“Show SNPs” is optional. One split-colour dot represents one diploid SNP, with one half per gene copy. The display uses all loci up to ten; beyond that, ten evenly spaced loci are selected across the marker list. Each generation, illustrated genotypes are reconstructed by shuffling the required number of allele copies over the current displayed individuals on each side. For each displayed side, allele copies are rounded from `2 * displayedSideCount * modelFrequency`. Frequencies therefore differ by at most half a displayed gene copy and are exact whenever representable by that headcount. This includes the exact-size settled populations; during crossings, the displayed basin allocation can differ temporarily. Each genotype reconstruction uses a separate seeded RNG and never affects the population model or sampling RNG. These are frequency-based illustrations, not tracked individual pedigrees. During a crossing, the animal retains its displayed dots until the next reconstruction. The close-up shows the same genotype dots at a readable size. Up to five dots use one row; six to ten use two rows of at most five. Their radius is 4.4 drawing units, with a white border and a darker dividing line. Body colour remains grey and does not encode adaptation or selection. Statistical inference always uses all selected SNPs.

After changing browser source files, run `python3 scripts/sync_animation_docs.py` from the GreyZone repository root and commit both source and `docs/` output.

## Checks

From the GreyZone repository root: `node --test tests/animation-model.test.cjs tests/animation-movement.test.cjs tests/shark-motion.test.cjs tests/animation-controls.test.cjs tests/animation-display.test.cjs tests/animation-power.test.cjs`.

Checks cover binomial moments, diploid drift variance and diversity loss, initial equality at unequal split ratios, conservation of total population size, boundary behavior, migration, chi-square tails, null calibration for the default design, and independent sampling.

Background: Bailleul et al. (2018), doi:10.1111/eva.12591; Ben Chehida et al. (2020), doi:10.1038/s41437-019-0284-1; Schleimer et al. (2024), doi:10.1111/icad.12725.


Movement checks cover closed-barrier containment, positive-migration channel crossings, use of twelve regions in each basin, independent travel and body-wave cadence, and reduced-motion placement.

Body-aware margins keep the shark and tail inside the available water. Movement checks also verify that normal straight travel covers at least 8% of the open-water width per second, with a faster option.

Display checks cover exact small-population headcounts, proportional splits, bounded large-population counts, quantitative migration response, the ten-SNP cap, diploid dots, fixed alleles and agreement between illustrated and numerical allele frequencies.

## Detection-time result and progress

The full-width power panel comes before the single-history FST and sampling panels. It estimates automatically after scientific settings change, with a short debounce. A new calculation cancels the previous worker; job IDs reject stale results. Stop estimate cancels work without presenting partial crossings as a final result. Look-ahead changes rerun only the power estimate, preserving the live history.

The worker maintains per-history hits separately and includes only completed histories in the curve. Progress measures `(completedHistories * horizon + generationWithinCurrentHistory) / (80 * horizon)` and is monotonic through 100%; long individual histories send intermediate updates too. The first sampled generation reaching 80% is reported only after all 80 histories finish. This is a pointwise detection probability, not a cumulative probability of detection by that generation. No-crossing results explicitly state the tested horizon. Elevated generation-zero rejection (>12%) is flagged instead of presenting a detection time as reliable. Monte Carlo SE is at most 5.6 percentage points; a first crossing can fluctuate.

The amber horizontal line is the 80% guide. The green vertical line marks the live generation, labelled “Now”, with a separate estimated probability readout. Probabilities between sampled times are linearly interpolated for that readout only; nothing is extrapolated beyond the computed range. The live run pauses at `max(2,000, lookAhead)` generations; extending Look ahead lets it continue without resetting. It can continue beyond a shorter power horizon, at which point the page explains that it is outside the estimate. The shaded grey region is a study-specific visual guide, not a biological/species threshold.

Population choices follow a 1–2–5 sequence from 10 to 500,000. The sample slider supports one-individual increments and is capped by the smaller population. SNP choices are round numbers from 1 to 500, default 50. The numerical engine is unchanged. Channel half-width rises smoothly from 5.3% of canvas height to at most 7.5% at Nm=20, keeping the centre fixed; drawn coast and swimming bounds share this geometry.
