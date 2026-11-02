#!/bin/zsh
# Verkleinert das gebackene Modell fürs Handy: Texturen höchstens 1K, WebP, Draco mit genauen Farben
# (darin steckt das Möbellicht) und genauen Lichtkarten-Koordinaten.  zsh 3d/nachbearbeiten.sh [ordner]
set -e
ORDNER=${1:-prototyp/campus3d}
T=$(mktemp -d)
npx --yes @gltf-transform/cli@4 resize "$ORDNER/campus.glb" "$T/a.glb" --width 1024 --height 1024
npx --yes @gltf-transform/cli@4 webp "$T/a.glb" "$T/b.glb" --quality 80
npx --yes @gltf-transform/cli@4 draco "$T/b.glb" "$T/c.glb" --quantize-color 12 --quantize-texcoord 14
mv "$T/c.glb" "$ORDNER/campus.glb"; rm -rf "$T"
ls -la "$ORDNER/campus.glb"
