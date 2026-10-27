# GreyZone animation

## [▶ Open GreyZone](https://yacinebenchehida.github.io/GreyZone/)

1. Choose ancestral Ne, the split ratio, migration proportion **m**, sample size and SNP count.
2. Press **Run simulation**, then watch or use **Pause** and **+1 generation**.
3. The result says **Not reached yet** until at least 80% of 80 independent studies detect differentiation at a checked generation. It then displays the first crossing as a large **X generations** result, both in the main result panel and directly below the ocean. That number remains visible afterwards.
4. Both FST and detection power continue on the same live time axis after that first crossing. **Run again** creates a fresh random history and batch.

The 80 reference histories follow the live clock. There is no advance search, terminal search result, preset detection time or generation-window control. A slow calculation reports its last checked generation explicitly. Pause freezes the live clock, ocean, reference calculation and displayed result. Queued worker messages are held until Resume or an explicit step. The first crossing is a pointwise Monte Carlo estimate, not an irreversible biological change. Later power can fall again.

**Migration is m, not Nm.** It is the fraction of each receiving population's gene pool replaced per generation, with 0 ≤ m < 1. Both sides use the same m; expected immigrant contributions are mNe for each side. Single animated crossings alternate directions, with at most three sharks in transit. Their launch rate increases linearly with m below a visual cap. They illustrate intensity rather than count every migrant.

**Show SNPs** displays up to ten neutral diploid SNPs. Every dot position corresponds to the same SNP across all sharks. At a western-fixed SNP, the western allele is turquoise and its alternative coral, with the same mapping used in both basins. Shared fixation is grey. This is a display convention; the genotype arrays are unchanged. Two matching copies appear as a solid circle; a heterozygote has two different-coloured halves. Stable gene-copy ranks prevent reshuffling when frequencies are unchanged. Colours continue after detection. Fixed SNPs remain stable unless migration reintroduces variation. A table identifies the displayed markers, their live frequencies and fixation state. FST near 1 does not mean all ten dots should be the same colour: different loci can fix different alleles, and some loci can be fixed for the same allele on both sides.

The accepted shark and hammerhead shape, travelling body wave and flexible turns are retained. Swimming is slower: Relaxed 0.8, Normal 1.3, Fast 2.2. Migration approaches no longer slow to a crawl. **Pause** freezes live generations, sharks, water and the power calculation. **Resume** continues the same history and batch. **Reset** returns to Ready.

Headcounts are exact up to 200 individuals and compressed logarithmically above that: 1,000 → 242 sharks; 20,000 → 320; 500,000 → 404.

[Model and development notes](MODEL.md)

[Earlier fish swimming study](https://yacinebenchehida.github.io/GreyZone/fish-study.html) · [Compare shark designs](https://yacinebenchehida.github.io/GreyZone/shark-study.html)
