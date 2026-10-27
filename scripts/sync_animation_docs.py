#!/usr/bin/env python3
"""Copy the standalone animation to the GitHub Pages /docs source."""
from pathlib import Path
from shutil import copyfile, copytree

root = Path(__file__).resolve().parents[1]
source = root / "animation"
target = root / "docs"
target.mkdir(exist_ok=True)
for name in ("index.html", "styles.css", "app.js", "model.js", "power-worker.js", "ocean-scene.js", "whale-character.js", "fish-study.html", "fish-study.css", "fish-study.js", "fish-character.js", "swim-motion.js", "shark-character.js", "shark-study.html", "shark-study.css", "shark-study.js"):
    copyfile(source / name, target / name)
copytree(source / "assets", target / "assets", dirs_exist_ok=True)
(target / ".nojekyll").write_text("")
print("Updated docs/ from animation/. Commit both after changes.")


