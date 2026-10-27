# Animation model and development notes

## Numerical assumptions

Two neutral diploid Wright–Fisher populations with constant sizes, no mutation, and independent biallelic loci. Daughter sizes sum to the ancestral total. Initial frequencies use a common representable grid so both daughter populations start exactly identical, without a founder effect. No demographic burn-in or actual allocation of ancestral individuals is performed.

Frequency migration occurs simultaneously before drift: each receiving population replaces Nm/N of its gene pool. Genetic drift uses exact binomial draws through inverse CDF and beta splitting, avoiding a loop over every individual. Hudson FST uses the ratio of summed within/between diversity. When all loci are identically fixed, the display reports 0 differentiation by convention (the ratio is undefined).

Sampling independently draws 2n copies at each locus, with n capped at the smaller population size. The multilocus Pearson chi-square is an asymptotic homogeneity test (alpha .05), not an exact test or the package's permutation test. Rare variants, small samples and late fixation can compromise calibration; this draft is not validated research software. Power is the rejection fraction across 80 independent population histories, sampled every 5 generations to generation 400. It includes Monte Carlo noise (worst-case SE about .056); the first 80% crossing is an illustrative summary, not a known biological boundary. Sampling randomness is separate from evolutionary randomness. Power runs in a Web Worker.

The ocean uses a top view with twenty-four representative grey sharks, with a choice of hammerhead or classic shark. The torso, markings, fins and tail bend around the same centreline in shark-character.js. Bodies, fins and tails are grey. The raised side-profile dorsal-fin shapes are omitted, as in the accepted top-view preview. The travelling body wave reuses the earlier fish renderer’s wave envelope and wavelength, with a smoothed bend for the torso and tail during turns. Steering eases angular velocity and limits its rate of change. Swimming, spacing and seabed shadows are decorative and do not implement population dynamics. Body colour does not encode genetic identity, adaptation or selection.

Sharks choose random destinations across the available water, with smooth steering, boundary anticipation and local spacing. There is no circular route or force attracting them to a basin centre. Before the split, they share a single swimming area. When the barrier rises, representatives settle on the chosen sides, with counts approximating the split ratio. The sandy landmass and coconut palm remain part of the scene. With positive migration, paired illustrative crossings use the channel; their timing and count are not the numerical migrants per generation. A closed barrier prevents subsequent crossings. The population-genetics model is independent of these decorative positions.

Travel speed controls displacement through the water independently of the body-wave cadence. Animal switches the illustration without changing or resetting the experiment. The Generations control sets the numerical simulation playback rate. Pause freezes the generations and the ocean clock together, including shark travel, body waves, crossings and water effects. Play resumes from the frozen state without replaying elapsed wall time; +1 generation leaves the scene paused. Shark close-up or clicking a shark shows the same character at a larger size. Reduced-motion preferences suppress swimming and animated water, and place sharks on the selected sides without a moving split transition.

Gene-copy dots are hidden by default. The optional “Show gene copies” overlay depicts two copies of the current first SNP; the statistical test uses all selected SNPs. Each dot is a gene copy, and its colour identifies the allele at that marker.

After changing browser source files, run `python3 scripts/sync_animation_docs.py` from the GreyZone repository root and commit both source and `docs/` output.

## Checks

From the GreyZone repository root: `node --test tests/animation-model.test.cjs tests/animation-movement.test.cjs tests/shark-motion.test.cjs tests/animation-controls.test.cjs`.

Checks cover binomial moments, diploid drift variance and diversity loss, initial equality at unequal split ratios, conservation of total population size, boundary behavior, migration, chi-square tails, null calibration for the default design, and independent sampling.

Background: Bailleul et al. (2018), doi:10.1111/eva.12591; Ben Chehida et al. (2020), doi:10.1038/s41437-019-0284-1; Schleimer et al. (2024), doi:10.1111/icad.12725.


Movement checks cover closed-barrier containment, positive-migration channel crossings, use of twelve regions in each basin, independent travel and body-wave cadence, and reduced-motion placement.

Body-aware margins keep the shark and tail inside the available water. Movement checks also verify that normal straight travel covers at least 14% of the open-water width per second, with a faster option.
