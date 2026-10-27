# Animation model and development notes

## Numerical assumptions

Two neutral diploid Wright–Fisher populations with constant sizes, no mutation, and independent biallelic loci. Daughter sizes sum to the ancestral total. Initial frequencies use a common representable grid so both daughter populations start exactly identical, without a founder effect. No demographic burn-in or actual allocation of ancestral individuals is performed.

Frequency migration occurs simultaneously before drift: each receiving population replaces Nm/N of its gene pool. Genetic drift uses exact binomial draws through inverse CDF and beta splitting, avoiding a loop over every individual. Hudson FST uses the ratio of summed within/between diversity. When all loci are identically fixed, the display reports 0 differentiation by convention (the ratio is undefined).

Sampling independently draws 2n copies at each locus, with n capped at the smaller population size. The multilocus Pearson chi-square is an asymptotic homogeneity test (alpha .05), not an exact test or the package's permutation test. Rare variants, small samples and late fixation can compromise calibration; this draft is not validated research software. Power is the rejection fraction across 80 independent population histories, sampled every 5 generations to generation 400. It includes Monte Carlo noise (worst-case SE about .056); the first 80% crossing is an illustrative summary, not a known biological boundary. Sampling randomness is separate from evolutionary randomness. Power runs in a Web Worker.

## Mapping the model to the ocean

`population-display.js` maps numerical settings to the illustration. Up to 200 individuals, every individual is shown. Above 200, the displayed total is `round(200 + 60 * log10(N / 200))`: 200 → 200; 1,000 → 242; 4,000 → 278; 20,000 → 320; 100,000 → 362. Both basins use the same overall compression. The western count is rounded from the displayed total and the split ratio; the eastern count is the remainder. The page shows both displayed headcounts and the approximate individuals per shark. The total shown remains constant during exchanges. Animals in transit can temporarily make the physical basin counts differ from the settled allocation.

The existing grey shark and hammerhead drawings, body wave and smooth steering are retained. Body size adjusts to the number displayed. Local spacing uses a spatial grid instead of comparing every pair of animals. Before the split, they share a single swimming area. When the barrier rises, the exact or proportionally rounded number settles on each side. Random destinations explore the available water without a circular route or a force attracting animals to the basin centre. The sandy landmass and coconut palm remain.

For migration, the expected number of visible exchanges per direction per second is `Nm * displayedTotal / N * generationsPerSecond`. To keep fast playback watchable, the launch rate is compressed to `0.8 * log1p(expected)`. A fractional budget schedules paired departures, one each way, after the barrier has finished rising. Candidates near the channel swim through the existing passage. The rate is zero for complete isolation or stopped generation playback, rises monotonically with Nm and generation playback, and accounts for population compression. This is an illustration of migration intensity, not an exact visual census per generation. Numerical migration in model.js is unchanged.

Travel speed controls displacement through the water independently of body-wave cadence. Animal switches the illustration without changing or resetting the experiment. Generations sets numerical playback and the migration launch budget. Pause freezes generations, travel, body waves, the crossing budget and water effects together. Play resumes without replaying elapsed wall time. +1 generation leaves motion paused. The introductory sea swims before model playback starts, without migration. Reduced-motion preferences suppress swimming and animated water, and place the split representatives immediately.

“Show SNPs” is optional. One split-colour dot represents one diploid SNP, with one half per gene copy. The display uses all loci up to ten; beyond that, ten evenly spaced loci are selected across the marker list. Each generation, illustrated genotypes are reconstructed by shuffling the required number of allele copies over the current displayed individuals on each side. At N ≤ 200, allele-copy totals match the model at that generation update; with a compressed headcount, they are rounded to the nearest displayed gene copy. Each genotype reconstruction uses a separate seeded RNG and never affects the population model or sampling RNG. These are frequency-based illustrations, not tracked individual pedigrees. During a crossing, the animal retains its displayed dots until the next reconstruction. The close-up shows the same genotype dots at a readable size. Body colour remains grey and does not encode adaptation or selection. Statistical inference always uses all selected SNPs.

After changing browser source files, run `python3 scripts/sync_animation_docs.py` from the GreyZone repository root and commit both source and `docs/` output.

## Checks

From the GreyZone repository root: `node --test tests/animation-model.test.cjs tests/animation-movement.test.cjs tests/shark-motion.test.cjs tests/animation-controls.test.cjs tests/animation-display.test.cjs`.

Checks cover binomial moments, diploid drift variance and diversity loss, initial equality at unequal split ratios, conservation of total population size, boundary behavior, migration, chi-square tails, null calibration for the default design, and independent sampling.

Background: Bailleul et al. (2018), doi:10.1111/eva.12591; Ben Chehida et al. (2020), doi:10.1038/s41437-019-0284-1; Schleimer et al. (2024), doi:10.1111/icad.12725.


Movement checks cover closed-barrier containment, positive-migration channel crossings, use of twelve regions in each basin, independent travel and body-wave cadence, and reduced-motion placement.

Body-aware margins keep the shark and tail inside the available water. Movement checks also verify that normal straight travel covers at least 14% of the open-water width per second, with a faster option.

Display checks cover exact small-population headcounts, proportional splits, bounded large-population counts, quantitative migration response, the ten-SNP cap, diploid dots, fixed alleles and agreement between illustrated and numerical allele frequencies.
