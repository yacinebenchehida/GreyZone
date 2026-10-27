# GreyZone animation

## [▶ Open GreyZone](https://yacinebenchehida.github.io/GreyZone/)

1. Choose ancestral Ne, the split ratio, migration proportion **m**, sample size and SNP count.
2. Press **Run simulation**. The barrier rises, a fresh live history starts, and 80 fresh independent histories are used to search for the first checked generation with at least 80% detection power.
3. **Run again** starts a new independent batch. The detection time is calculated from that batch; there is no preset answer or generation window to choose.

The automatic search can stop without finding 80% if its histories settle or its internal computation limit is reached. It reports what was checked, without claiming that later detection is impossible. **Stop search** cancels the background calculation; the live history remains separate.

**Migration is m, not Nm.** It is the fraction of each receiving population's gene pool replaced per generation, with 0 ≤ m < 1. Both sides use the same m; expected immigrant contributions are mNe for each side. Animated crossings are deliberately sparse, capped at one pair in transit with a gap between events. They illustrate exchange intensity rather than count every migrant.

**Show SNPs** displays up to ten neutral diploid SNPs. Each dot has two coloured halves for the two copies. Stable gene-copy ranks prevent reshuffling when frequencies are unchanged. Colours continue to follow genetics after significance or the 80% guide. Fixed SNPs remain stable unless migration reintroduces variation. FST near 1 can coexist with some SNPs fixed for the same allele on both sides; the fixation readout separates shared and opposite fixation.

The shark design and fluid swimming are retained. **Normal** travel uses the earlier Relaxed speed, with a slower Relaxed option. **Pause** freezes live generations, sharks and water; the independent background search can continue. **Reset** returns to the settings-ready state.

Headcounts are exact up to 200 individuals and compressed logarithmically above that: 1,000 → 242 sharks; 20,000 → 320; 500,000 → 404. The split ratio and display scale are labelled.

[Model and development notes](MODEL.md)

[Earlier fish swimming study](https://yacinebenchehida.github.io/GreyZone/fish-study.html) · [Compare shark designs](https://yacinebenchehida.github.io/GreyZone/shark-study.html)
