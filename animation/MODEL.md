# Animation model and development notes

## Numerical assumptions

Two neutral diploid Wright–Fisher populations with constant sizes, no mutation, and independent biallelic loci. Daughter sizes sum to the ancestral total. Initial frequencies use a common representable grid so both daughter populations start exactly identical, without a founder effect. No demographic burn-in or actual allocation of ancestral individuals is performed.

Frequency migration occurs simultaneously before drift: each receiving population replaces Nm/N of its gene pool. Genetic drift uses exact binomial draws through inverse CDF and beta splitting, avoiding a loop over every individual. Hudson FST uses the ratio of summed within/between diversity. When all loci are identically fixed, the display reports 0 differentiation by convention (the ratio is undefined).

Sampling independently draws 2n copies at each locus, with n capped at the smaller population size. The multilocus Pearson chi-square is an asymptotic homogeneity test (alpha .05), not an exact test or the package's permutation test. Rare variants, small samples and late fixation can compromise calibration; this draft is not validated research software. Power is the rejection fraction across 80 independent population histories, sampled every 5 generations to generation 400. It includes Monte Carlo noise (worst-case SE about .056); the first 80% crossing is an illustrative summary, not a known biological boundary. Sampling randomness is separate from evolutionary randomness. Power runs in a Web Worker.

The ocean and whales are seen from above. Twenty-four representative whales steer, gather in loose pods, surface, and leave fading wakes. Their rounded heads, full bodies, paddling pectoral fins and attached articulated flukes are drawn by whale-character.js. Eyes blink and surface breaths create small water plumes. A Whale close-up button or clicking an animal shows the same character at a larger size. Size differences are decorative; age classes are not part of the numerical model. A winding sandy landmass rises across the sea, with a coconut palm on its northern section. Swimming, social encounters and surfacing are decorative and do not implement population dynamics. Gene-copy dots are hidden by default. The optional “Show gene copies” overlay depicts two copies of the current first SNP; the statistical test uses all selected SNPs. Each dot is a gene copy, and its colour identifies the allele at that marker. Click a whale to highlight it. Reduced-motion preferences suppress swimming, surfacing and moving water effects. Animated channel crossings illustrate gene flow and do not count migrants. Body colour does not encode genotype, adaptation or selection.

After changing browser source files, run `python3 scripts/sync_animation_docs.py` from the GreyZone repository root and commit both source and `docs/` output.

## Checks

From the GreyZone repository root: `node --test tests/animation-model.test.cjs`.

Checks cover binomial moments, diploid drift variance and diversity loss, initial equality at unequal split ratios, conservation of total population size, boundary behavior, migration, chi-square tails, null calibration for the default design, and independent sampling.

Background: Bailleul et al. (2018), doi:10.1111/eva.12591; Ben Chehida et al. (2020), doi:10.1038/s41437-019-0284-1; Schleimer et al. (2024), doi:10.1111/icad.12725.

