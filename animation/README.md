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

The main page links to “How to use this simulator” below the results. The first interface guide is open; concepts, parameter meanings, four comparisons and a short calculation note are separate native disclosures. Navigation only scrolls and never resets a run. Suggested settings are available in the current controls. Comparisons explicitly require fresh histories/repeated runs; no paired-history claim is made.

The scientific framing follows Bailleul et al. (2018, https://doi.org/10.1111/eva.12591), Ben Chehida et al. (2020, https://doi.org/10.1038/s41437-019-0284-1) and Schleimer et al. (2024, https://doi.org/10.1111/icad.12725): distinguish genetic evidence from demographic independence, consider drift/migration and study power, and account for time since separation. Their numerical results and significance procedures are not transferred to this illustration. The guide explains this app’s actual 1000 conditional resamples and 80%/five-generation rule. Numbered screenshots show the real controls and results. The first experiment contrasts ancestral Ne 100 and 50000; the other experiments isolate migration, sample size and marker count. The references remain in development notes, not as a page bibliography.

The tutorial describes the transition from a connected ancestral population to demographic independence under complete isolation, followed by a lag before detectable genetic differentiation. Migration scenarios remain labelled as connected by migration, without inferring demographic independence from m alone. The power plot names the approximate allele-frequency chi-square test and p ≤ 0.05 threshold; the tutorial distinguishes its evidence from the magnitude measured by FST.

## Larger SNP panels

All existing SNP choices are retained, with 750 and 1000 added. Up to 100 SNPs, the population panel shows the complete individual-marker list and its segregating-only filter. Above 100, no individual cards or frequency bars are constructed; only counts of segregating, opposite-fixed and shared-fixed loci are shown. Counts use every selected locus and retain their text nodes as values change. The numerical model, 1000 study resamples, fixation rule and first-ten animal markers are unchanged. Case examples remain unimplemented.

## Prepared repeated studies

The single power worker now builds reusable binomial alias tables for each population and locus at each generation. Probabilities are constructed from the binomial mode by recurrence, with exact fixed endpoints. Sampled allele counts still follow the same binomial distributions. Count-pair contributions to Hudson FST and Pearson chi-square are precomputed for the selected sample size. The worker accumulates scalar totals directly, retaining the 1000 FST estimates for the same percentile calculation instead of allocating two allele-frequency arrays for every study. Significance cutoffs are cached by degrees of freedom by inverting the same gamma-tail function at 0.05. Table preparation and study sampling both yield in short chunks for Pause. All 1000 independent study samples, every selected SNP, per-generation updates, and the five-generation detection rule are retained.

`model.js`, population evolution and single-study inspection are unchanged. The prepared sampling algorithm consumes its random stream differently, so exact Monte Carlo draws differ from earlier versions. Runs remain deterministic within this version, and the population-history RNG remains independent. Multiprocessing is not implemented; the public SNP limit remains 1000.

Validation includes recovery of the full binomial probability mass at sample-size and allele-frequency extremes, reference-formula comparisons on identical sampled counts, cached cutoff decisions, repeated-study power and FST distribution comparisons, retained percentile calculation, and pause/resume during preparation and partial sampling.

Run `node scripts/benchmark_studies.cjs 40 3` to compare the unchanged reference sampler and the prepared sampler at 1000 and 5000 SNPs. Each timing includes generation-specific table preparation, 1000 studies, and sorting the FST estimates; sampler allocation occurs outside the timer. Change the first argument to compare different study sample sizes.

A browser worker comparison used 1000 studies and identical population frequencies for both implementations. Median warm generation updates from three successive batches were:

| Sampled per population | SNPs | Reference worker | Prepared worker |
| --- | --- | --- | --- |
| 40 | 1000 | 476 ms | 37 ms |
| 40 | 5000 | 2218 ms | 506 ms |
| 100 | 1000 | 790 ms | 38 ms |
| 100 | 5000 | 3847 ms | 561 ms |

These measurements include worker scheduling and the sampling interval, exclude ocean rendering, and apply to the test browser rather than a measured phone. Repeated runs varied; the earlier 40-individual run measured 439 → 36 ms and 2304 → 298 ms respectively. No fixed device-independent speedup is assumed.

## Reproducible experiments and design

Open **Save & reproduce** below the settings. A whole-number seed in 0–4,294,967,295 controls the independent evolutionary, power-resampling and manual-sampling RNG streams. Entering a seed selects **Reuse this seed**; repeated runs then reproduce the population and power curves at each generation. Otherwise, Run again chooses a fresh seed. New seed prepares a different history at generation zero. Playback, pauses, animal choices and manual samples cannot change the evolutionary or power RNG streams. Animal poses depend on frame timing, so their exact motion is not a replay guarantee.

Save settings downloads a JSON file; Load settings validates and restores it without automatically starting. Copy link embeds the same configuration in the URL. Both include effective population/sampling settings, seed, display options and the sampling engine version. They restart from generation zero, not a saved checkpoint. Invalid files leave the active run untouched. Exact numerical replay requires this engine version; imports from unsupported engines are rejected.

The default observation-station design is in `observatory.css`, applied over the preserved base stylesheet. **Previous design** in the footer switches to `?design=classic` and carries the current settings and seed, ready to restart at generation zero. **New design** switches back. The exact pre-redesign release is preserved in GitHub branch `backup/before-observatory-design`, commit `d9a4ea5d3499c3acf0db48771e2b65ea4566d8e2`. Model, sampling algorithms and animal renderers were not changed for this release.

## Marine atlas design

The default design now uses `atlas.css`: a bespoke marine chart header, a full-width live ocean with the controls above it, and a horizontal population/sampling dock underneath. Settings, Results and How to use are direct in-page navigation. Essential demographic-state text is enlarged to 16 px on desktop and 14 px on phones. The tutorial starts collapsed and its three screenshot views show the current dock, ocean and results. The model, power worker, sampler, accepted shark rendering and swimming code are unchanged.

The footer's Previous design opens `?design=observatory`; Original layout opens `?design=classic`. The pre-atlas release is preserved in branch `backup/before-coastal-redesign`, commit `a67c6c9203b1c566e8afd30e6f3ad4febede49f5`. The earlier backup before release 24 also remains available. Switching the main design link carries the current experiment settings and seed and prepares generation zero.

The decorative header is AI-generated marine atlas artwork, stored and served locally as `assets/atlas/marine-chart.webp`; it is unrelated to the numerical state or coastline in the live canvas. See its asset README for provenance. No additional generation-time or animation-time computations were added by the design.

## Cetacean options

The Animal menu offers Fin whale and Harbour porpoise. Hammerhead remains the default. Both have distinct anatomy, a curved turning spine and vertical-stroke fluke foreshortening. Full and cached rendering keep genotype dots independent of the body artwork. The fin whale replaces the previous humpback option while retaining the `whale` settings identifier. Tutorial screenshot cache URLs load the current atlas layout.

## Fin whale and larger illustrated populations

The whale choice now depicts a fin whale, retaining the `whale` identifier for settings-file compatibility. It uses a slender body with a tapered V-shaped head, short swept pectorals, a modest falcate dorsal at about two-thirds body length, broad notched flukes, a pale right lower-jaw edge and subdued shoulder chevron. Humpback tubercles and long pale flippers have been removed. References: NOAA Fisheries fin-whale species description and NOAA marine-mammal identification guide (https://www.fisheries.noaa.gov/species/fin-whale and https://repository.library.noaa.gov/view/noaa/35695/noaa_35695_DS1.pdf). The top-view rendering remains an illustration with a shared curved body spine, vertical-stroke foreshortening and intermittent mist at the paired blowholes.

Displayed headcounts remain exact up to 200. Above that, the count is `min(700, round(200 + 150 log10(total / 200)))`, giving 305 at ancestral Ne 1,000, 455 at 10,000, 605 at 100,000 and 700 at 500,000. All counts are totals across both basins and preserve the selected split ratio. Above 400 visible animals, body size no longer keeps shrinking with increasing headcount. Genetics still uses the full numerical population and original sampling model.

Fin-whale breathing uses one brief, narrow mist plume with soft dispersing puffs, falling droplets and an expanding surface ripple. The effect is occasional, is drawn separately from cached body poses and freezes with the ocean clock on Pause. It is an overhead illustration of a columnar blow, rather than a literal water jet.

The fin whale uses detailed transparent artwork (`assets/atlas/fin-whale.webp`) generated specifically for this view. Thirty-six image strips follow the curved body spine, including fluke foreshortening; the same renderer supplies cached poses. The cache distinguishes loaded skin from the lightweight fallback, so early cached fallback frames cannot permanently replace the detailed animal. The porpoise and shark artwork are unchanged. The NOAA references guide anatomical features; this remains generated illustrative artwork rather than a photograph.


## Fin-whale movement

Fin whales now use their own propulsion and steering rather than the shark motion. Three vertical strokes ease into a glide; momentum changes gradually, and stroke cadence follows the travel-speed control. Turns use slower angular acceleration and a curved body, with earlier coastal avoidance and reduced forward speed in tight turns. Random destinations still cover the available basin and migrants still use the channel. Shark and other animal movement is unchanged.

Every whale stays fully visible at the surface at all times. Independent breathing schedules produce occasional mist blows. Fluke pitch changes the projected fore-aft chord, not its transverse span. Full rendering and cached bodies both retain full opacity. Both Pause controls freeze propulsion, breathing, mist and the ocean clock together. These are illustrative movements, not a hydrodynamic or energetics model. The population model and study sampling are unchanged.

The ocean header includes discreet numeric FST and detection-power readouts beneath the demographic status. FST follows the live population; power retains the latest completed estimate while the next batch runs. Its tooltip and accessible label identify the estimate's generation. Text nodes are retained to avoid flickering. User-facing repeated “studies” are labelled “simulated datasets”; the numerical sampling procedure is unchanged.
