# GreyZone animation

## [▶ Open GreyZone](https://yacinebenchehida.github.io/GreyZone/)

Choose Ne, the split ratio, migration proportion m, individuals sampled per basin and SNP count. Run starts one fresh random population history. The full Ne drives drift and migration. At every generation, 500 independent study datasets are sampled from the exact populations shown by the sharks, using the selected sample size and all selected SNPs. Every study produces sampled FST and an approximate multilocus chi-square p-value. The fraction with p ≤ .05 estimates conditional detection power for this live history.

The first generation with at least 80% detection is the large central result. It remains visible afterwards. Reaching significance or 80% power never stops evolution.

The run continues until you pause it or every model SNP is in a stable fixed state. Without migration, both populations must be fixed at every locus. With migration, opposite fixation may be transient, so completion requires the same fixed allele on both sides at every locus. There is no generation cutoff. Completion is based on all numerical SNPs, including those beyond the ten shown on sharks. Run again creates a new history. Switching tabs does not pause the genetics; browsers can throttle background execution.

Pause cancels the animation-frame loop and background timer, freezing generations, sharks, water and study sampling. Resume retains the same history and sampling RNG state. +1 generation leaves playback paused and calculates its 500 study samples. Both Pause buttons use the same controls. The clock waits for any unfinished study calculation before advancing, while the sharks keep swimming. Generation speed limits remain Slow 1.5, Normal 6 and Fast 25 gen/s; swimming speed is separate.

**Four SNP colours:** light gold/orange = still segregating within at least one basin; grey = the same allele fixed in both basins; turquoise west and coral east = different alleles fixed. A dividing line in a gold dot identifies a heterozygote; solid gold is a homozygote, without distinguishing A/A from B/B by fill colour. The raw genotype copies and frequency table remain unchanged. Each dot position is the same marker across animals. Up to ten actual model loci are displayed.

Migration is the receiving gene-pool proportion m, 0 ≤ m < 1. Single illustrative crossings become more frequent with m and are limited to three sharks in transit. They do not count every numerical migrant or implement individual pedigrees. Counts are exact through 200 and logarithmically compressed above that; the display scale is labelled.

[Model and development notes](MODEL.md)

[Earlier fish study](https://yacinebenchehida.github.io/GreyZone/fish-study.html) · [Shark designs](https://yacinebenchehida.github.io/GreyZone/shark-study.html)
