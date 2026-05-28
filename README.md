# PaletteBuilder

A standalone browser app that turns a dragged image into an editable practical-color table, an aligned Markdown report, and a Toon Boom Harmony 25 `.plt` palette.

Open `index.html` directly, or serve the folder locally:

```sh
python3 -m http.server 4173
```

The `.plt` exporter matches the supplied Harmony sample:

```txt
ToonBoomAnimationInc PaletteFile 2
Solid    swatch_name                0x0000000000000000 255 255 255 255
```

The app automatically determines practical palette colors from the image, grouping anti-aliased edge pixels into representative color families instead of dumping every RGB variant. Color labels and associated objects are generated from a curated color vocabulary plus image-position heuristics, and can be edited before export.

## License

PaletteBuilder is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE.md).

You may use, copy, modify, and share this software for noncommercial purposes. Commercial use, resale, paid distribution, SaaS use, or inclusion in a paid product or service is not permitted without a separate written commercial license from Patrick Krebs.

If money is involved, see [COMMERCIAL_LICENSE.md](./COMMERCIAL_LICENSE.md).
