# GreyZone animation

## [▶ Open GreyZone](https://yacinebenchehida.github.io/GreyZone/)

Choose Ne, the split ratio, migration proportion m, individuals sampled per basin and SNP count. Run starts one fresh random population history. The full Ne drives drift and migration. At every generation, 1000 independent study datasets are sampled from the exact populations shown by the sharks, using the selected sample size and all selected SNPs. Every study produces sampled FST and an approximate multilocus chi-square p-value. The fraction with p ≤ .05 estimates conditional detection power for this live history.

Grey-zone exit requires five consecutive generations with detection power ≥80%. After the fifth estimate, the large central result reports the first generation of the earliest qualifying sequence (for example, generations 40–44 confirm an exit at 40). A dip below 80% before confirmation restarts the count; the interface shows Confirming and the current count while waiting. The confirmed result remains visible afterwards, even if power later dips. This stability rule filters short spikes; it does not imply permanent detectability. Reaching significance or 80% power never stops evolution.

The FST plot includes a shaded 95% sampling range: the 2.5th and 97.5th percentiles of the sampled Hudson FST estimates from those same 1000 studies, with linear interpolation between ordered values. The true population FST remains the solid line. This is a pointwise sampling range, not a confidence interval for the known population FST or an envelope across different histories. Negative sampled FST estimates are retained.

The run continues until you pause it or every model SNP is in a stable fixed state. Without migration, both populations must be fixed at every locus. With migration, opposite fixation may be transient, so completion requires the same fixed allele on both sides at every locus. There is no generation cutoff. If fixation happens during an unconfirmed above-threshold sequence, up to four further generations of study resampling complete that check before automatic stopping. Completion is based on all numerical SNPs, including those beyond the ten shown on sharks. Run again creates a new history. Switching tabs does not pause the genetics; browsers can throttle background execution.

Pause cancels the animation-frame loop and background timer, freezing generations, sharks, water and study sampling. Resume retains the same history and sampling RNG state. +1 generation leaves playback paused and calculates its 1000 study samples. Both Pause buttons use the same controls. The clock waits for any unfinished study calculation before advancing, while the sharks keep swimming. Generation speed limits remain Slow 1.5, Normal 6 and Fast 25 gen/s; swimming speed is separate.

**Four SNP colours:** light gold/orange = still segregating within at least one basin; grey = the same allele fixed in both basins; turquoise west and coral east = different alleles fixed. Gold marker fill encodes allele-A dosage: empty = 0 (B/B), half-filled = 1 (A/B), filled = 2 (A/A). Animal close-up shows readable 0/1/2 values, genotype labels and matching SNP numbers, including when the overview dots are hidden. Raw genotype copies remain unchanged. Each dot position is the same marker across animals. The animals always show SNPs 1–10, or all selected SNPs if fewer than ten. There is no separate dot numbering. With ten markers, SNPs 1–5 run head-to-tail along the animal’s left side, and 6–10 along its right side. Five or fewer run along the centreline. The close-up states this orientation.

Migration is the receiving gene-pool proportion m, 0 ≤ m < 1. Single illustrative crossings become more frequent with m and are limited to three sharks in transit. They do not count every numerical migrant or implement individual pedigrees. Counts are exact through 200 and logarithmically compressed above that; the display scale is labelled.

[Model and development notes](MODEL.md)

[Earlier fish study](https://yacinebenchehida.github.io/GreyZone/fish-study.html) · [Shark designs](https://yacinebenchehida.github.io/GreyZone/shark-study.html)

The All SNPs panel lists every numerical locus in order, in two columns on desktop and one on narrow phones, within a scrollable region. Each SNP keeps its west/east allele-A bars together and reports exact fixation status. “On animal” badges mark SNPs 1–10 (or all SNPs if fewer). Segregating only is an optional display filter; the summary, evolution and tests still use every selected SNP. Near-endpoint labels use <0.01% and >99.99% instead of rounding an unfixed locus to 0% or 100%.

## Animal and landscape artwork

Hammerhead remains the default, using the accepted shark renderer and swimming movement. Classic shark remains available. The Animal menu also offers sea turtle, the original blue-and-yellow surgeonfish (Blue tang), tuna, orca and harbour seal. Switching artwork keeps the current population history, allele frequencies, samples, actor positions and pause state. All choices support the same SNP overlay and numeric genotype close-up.

The landmass emerges over 4.8 seconds, with a submerged sand ridge, displacement ripples, wet beach, foam, dune detail and coconut palms with pinnate fronds. The settled terrain is cached. Palm sway, foam and animal motion all use the shared scene clock, so both Pause controls freeze them. The migration channel still uses the same gap dimensions.

Live result text keeps its label nodes and updates numerical values in place. The status line no longer switches between checking/completed wording at each generation. +1 generation stays available during live resampling: a click pauses playback, finishes the current batch, advances exactly one generation and completes that batch while remaining paused.

The SNP panel describes population allele frequencies, with separate A and B percentages and a frequency-only legend. At fixation, bars are full state colours and name the fixed allele; a fixed B is never represented by an empty grey background. Individual 0/1/2 genotypes remain in Animal close-up.

## Drawing performance

Full detail remains the default. After eight over-budget canvas draws (more than 20 ms, with good draws reducing the counter), the scene switches to a cached overview. It reuses 24 wave phases and seven bend positions from the original animal renderers, omits soft individual shadows and wakes, caps canvas pixel density at 1.25, and caches the island's surf/palm layer at 8 fps. Only one species' pose bank is retained (at most 168 small 128 × 80 images). Individual SNP overlays stay live and separate from body images; close-ups use the full original renderer. This changes illustration costs, not headcounts, genetics, sampling or the grey-zone rule. No additional user-facing controls or explanations are added.

Dropped animation frames retain elapsed movement time, integrated in steps of at most 50 ms. Gaps above half a second are bounded to avoid replaying long browser suspensions. At normal frame rates the existing rendering and motion are retained. An IntersectionObserver skips ocean drawing while it is scrolled out of view, leaving genetics and plotted results running; returning to the ocean resets its decorative timestamp rather than replaying hidden time. Browsers without IntersectionObserver retain normal rendering.

## Tutorial

The main page links to “How to use this simulator” below the results. The first interface guide is open; concepts, parameter meanings, four comparisons, scope and technical model details are separate native disclosures. Navigation only scrolls and never resets a run. Suggested settings are available in the current controls. Comparisons explicitly require fresh histories/repeated runs; no paired-history claim is made.

The scientific framing follows Bailleul et al. (2018, https://doi.org/10.1111/eva.12591), Ben Chehida et al. (2020, https://doi.org/10.1038/s41437-019-0284-1) and Schleimer et al. (2024, https://doi.org/10.1111/icad.12725): distinguish genetic evidence from demographic independence, consider drift/migration and study power, and account for time since separation. Their numerical results and significance procedures are not transferred to this illustration. The guide explains this app’s actual 1000 conditional resamples, 80%/five-generation rule and planned R-package scope. The references remain in development notes, not as a page bibliography.
