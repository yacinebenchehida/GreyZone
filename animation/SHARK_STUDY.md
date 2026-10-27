# Shark design study

Open `shark-study.html` to compare three top-view drawings: A, classic shark; B, slender shark; C, hammerhead. Each card selects the character in the freely swimming preview. All shark bodies, fins and tails are grey. Each has moderately sized pectoral fins and a tapering body. Raised side-profile dorsal-fin shapes are omitted in this overhead design preview. These are illustrative design options, not a species-accurate biological simulation. The main scene offers classic shark and hammerhead, with hammerhead selected initially. Choosing the animal changes the illustration only, without restarting the numerical experiment.

`shark-character.js` keeps body shape, pectoral and pelvic fins, gill slits, eyes and tail attached to the same deforming centreline. The unequal tail lobes use a gently banked projection to make the silhouette readable from above. Designs can be refined before use in the main scene.

`swim-motion.js` chooses random destinations throughout the available water and anticipates the boundaries. Targets expire, and are replaced before an animal reaches them, to avoid orbiting a point. Neither the shark preview nor the current main app follows a fixed loop or a basin-centred route. Randomness is seeded for reproducible development checks. Travel speed and body-wave cadence remain separate. The fish study is retained as an earlier coordinated-motion comparison.

The main app uses grey sharks throughout. The earlier fish drawings remain in the standalone fish study. The numerical population model is unchanged. In the main app, population counts, migration intensity and optional SNP dots are now mapped to the model through population-display.js; the standalone design study remains separate.

Shape references consulted (no external artwork is copied into the project):

- [Hawaiʻi Sharks: anatomy and swimming](https://dlnr.hawaii.gov/sharks/about-sharks/anatomy/)
- [NOAA Fisheries: shark identification, including blue shark](https://www.fisheries.noaa.gov/new-england-mid-atlantic/atlantic-highly-migratory-species/shark-identification-cooperative-shark)
- [Monterey Bay Aquarium: blacktip reef shark](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/blacktip-reef-shark)

The current rig reuses the earlier fish's travelling-wave envelope and wavelength, scaled to the shark. A smoothed turn bend curves the whole body, while the head stays steady and the rear body and attached tail sweep farther. Steering eases angular velocity and limits angular acceleration. The main scene and shark preview share this steering and renderer. Local spacing uses displayed body size, with no alignment force or crowd-induced stops. The numerical model is unchanged.

Run `node --test tests/shark-motion.test.cjs` to check turn bending, gradual straightening, a steady head, continuous waving geometry and bounded steering acceleration.
