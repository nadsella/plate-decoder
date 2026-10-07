# UK Plate Decoder

Type a UK number plate and see where and when it was first registered.

**Live site:** https://nadsella.github.io/plate-decoder/ — links can include a plate, e.g. `#LV75ZXM`.

## What it decodes

| Style | Example | Tells you |
|---|---|---|
| Current (2001 –) | `AB12 CDE` | Region, DVLA local office, six-month registration window, vehicle age |
| Prefix (1983 – 2001) | `A123 BCD` | Year letter |
| Suffix (1963 – 1983) | `ABC 123D` | Year letter |
| Dateless (before 1963) | `ABC 123` | No age information |
| Northern Ireland | `ABZ 1234` | County |
| Q plate | `Q123 ABC` | Vehicle of unknown age or identity |

It also flags parts DVLA never issues: memory tags with I, Q or Z, the `01` age identifier, identifiers not released yet, and the skipped year letters I, O, Q, U and Z.

Everything runs in the browser. No API keys, no tracking.

## Files

- `index.html` — the page
- `decoder.js` — the decoding rules (no DOM, works in Node too)
- `test/` — run `npm test`

## Run locally

```sh
python3 -m http.server   # then open http://localhost:8000
npm test
```
