# Fish swimming study

Open `fish-study.html` in a browser, or use the published link in README.md. This visual study uses the same fish renderer as the main population-genetics experiment.

The first character is a stylised blue surgeonfish with opaque blue pectoral fins and a yellow forked tail, seen from above. It is an illustrative design, not a species-accurate anatomical or behavioural model. Colours do not encode genotype or selection.

`fish-character.js` draws the animal around a continuous bending centreline. The travelling lateral wave increases toward the tail; the outline, markings, eyes, gill covers, pectoral fins and tail are positioned from that same centreline. The head is relatively steady. The tail follows the final body segment. No raster sprites or external dependencies are used.

`FishCharacter.profiles` holds the appearance independently of the route. A future species can provide its own palette, width multiplier and an array of half-widths from snout to tail stock (`widths`). Further fin or marking changes can be made in this renderer without changing the population model.

`fish-study.js` supplies four offset paths around a broad oval, with small phase differences in tail beats. Curvature anticipates the turn and bends the body. The coordinated paths are a visual swimming test, not an emergent schooling model. The fish are underwater throughout; no surface masking or foam is applied. Soft seabed shadows and small moving highlights suggest water depth.

Pause freezes the route, body motion and water effects. Reduced-motion preferences start the page paused. The solo view enlarges one character, and the Travel speed selector changes progression along the swimming route independently of the body-wave cadence and water effects. The route covers most of the pool while leaving room to turn. The main app uses the same renderer with random-destination wandering, spacing, a geographic barrier and illustrative channel crossings. The original standalone fish study retains its coordinated oval as an earlier movement comparison; it is not the main app’s movement controller. The numerical population-genetics model runs separately.
