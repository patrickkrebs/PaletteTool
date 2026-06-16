# PaletteBuilder

A standalone browser app that turns a dragged image into an editable practical-color table, an aligned Markdown report, a Toon Boom Harmony 25 `.plt` palette, a Photoshop `.aco` swatch set, and an Adobe `.ase` swatch library.

Open `index.html` directly, or serve the folder locally:

```sh
python3 -m http.server 4173
```

The `.plt` exporter matches the supplied Harmony sample:

```txt
ToonBoomAnimationInc PaletteFile 2
Solid    swatch_name                0x0000000000000000 255 255 255 255
```

The `.aco` exporter writes an Adobe Color Swatches file — load it in Photoshop via the Swatches panel menu → **Load Swatches**. Each swatch is written as RGB with its color label as the name, in both the version 1 (legacy) and version 2 (named) blocks Photoshop expects.

The `.ase` exporter writes an Adobe Swatch Exchange file, the cross-app swatch format read by Photoshop, Illustrator, and InDesign (Swatches panel → **Open/Load Swatch Library**). Each swatch is a named RGB color entry (`ASEF` signature, version 1.0, big-endian float channels).

## How the palette is extracted

The tool is tuned for **flat, cel-shaded 2D animation art** (e.g. Photoshop-painted stills), where each material is a few flat colors and the black line art is anti-aliased so edges *look* blended. It recovers the real flat colors at their **exact painted values** rather than averaging them:

1. **Exact-color histogram** of the sampled pixels (no quantization, no averaging).
2. **Mode peaks** via a small non-maximum-suppression cube, so a color spread by JPEG/dither noise still resolves to its true painted byte.
3. **Anti-alias rejection** — a band that is a linear blend between two stronger colors (a fill and the black line, a fill and white, or two fills) is dropped. The discriminator is **solidity** (flat fills are solid; AA bands are thin), backed by a collinearity test with endpoint-dominance, so a genuine midtone that happens to sit between a highlight and a shadow is *kept*, not mistaken for anti-aliasing.
4. **Perceptual merge** (CIEDE2000) folds re-encodings while keeping distinct-but-close tiers (roof tile vs. roof shadow) separate.
5. Every pixel (including the anti-aliased ones) is attributed to its nearest flat color for an accurate coverage %.

The **Color detail** slider trades fewer ↔ more colors; **Max colors** caps the palette.

## How colors are named

Each color gets a perceptual **color label** (e.g. "Pale ochre"). The **associated object** is named by role + material family + lightness tier, computed from CIELab values, coverage, and how much each color borders others: line art, background/sky, skin, foliage, or a plain hue descriptor — with same-family colors sorted by lightness into **highlight / midtone / shadow**.

True scene understanding ("that's a roof") needs vision. The optional **AI object labeling** panel (bring your own Anthropic or OpenAI key) uses a region-matching approach: the whole image (with a faint 0–1000 reference grid) goes to the model, which returns a list of labeled **regions with bounding boxes**; the app then **deterministically matches each color pick's coordinate into those regions** (smallest containing box wins) and assigns lightness tiers locally. Separating *identification* (the model) from *assignment* (app geometry) means a name can't land on the wrong color. A strong vision model (Claude Opus 4.8 / Sonnet 4.6) gives the best region boxes. All names are editable before export.

## License

PaletteBuilder is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE.md).

You may use, copy, modify, and share this software for noncommercial purposes. Commercial use, resale, paid distribution, SaaS use, or inclusion in a paid product or service is not permitted without a separate written commercial license from Patrick Krebs.

If money is involved, see [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md).
