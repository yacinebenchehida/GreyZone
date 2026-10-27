# Shark design study

Open `shark-study.html` to compare three top-view drawings: A, classic shark; B, slender shark; C, hammerhead. Each card selects the character in the freely swimming preview. All shark bodies, fins and tails are grey. Each has a prominent dorsal fin, with moderately sized pectoral fins and a tapering body. These are illustrative design options, not a species-accurate biological simulation. The main GreyZone scene still uses the fish while the shark appearance is being chosen.

`shark-character.js` keeps body shape, pectoral and pelvic fins, dorsal fins, gill slits, eyes and tail attached to the same deforming centreline. The unequal tail lobes use a gently banked projection to make the silhouette readable from above. Designs can be refined before use in the main scene.

`swim-motion.js` chooses random destinations throughout the available water and anticipates the boundaries. Targets expire, and are replaced before an animal reaches them, to avoid orbiting a point. Neither the shark preview nor the current main app follows a fixed loop or a basin-centred route. Randomness is seeded for reproducible development checks. Travel speed and body-wave cadence remain separate. The fish study is retained as an earlier coordinated-motion comparison.

The main app's original yellow tail has been restored, with blue pectoral fins. Its numerical population model is unchanged.

Shape references consulted (no external artwork is copied into the project):

- [Hawaiʻi Sharks: anatomy and swimming](https://dlnr.hawaii.gov/sharks/about-sharks/anatomy/)
- [NOAA Fisheries: shark identification, including blue shark](https://www.fisheries.noaa.gov/new-england-mid-atlantic/atlantic-highly-migratory-species/shark-identification-cooperative-shark)
- [Monterey Bay Aquarium: blacktip reef shark](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/blacktip-reef-shark)
