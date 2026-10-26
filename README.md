# Unitwise Calc

A notebook-style calculator language where numbers carry physical units. Dimensional analysis catches mistakes at the language level, and results convert on demand with `in` or `to`.

```
5 km in miles
100 °C to K
```

## How it works

- **Quantities, not floats** — every value is a magnitude plus a unit (`quantity.ts`)
- **Dimension checking** — dimensions are 7-vectors (length, mass, time, current, temperature, amount, luminosity), so `m + s` is rejected while `m * s` works (`dimension.ts`)
- **Unit database** (`units.ts`) — SI and binary prefixes (`k`, `M`, `Ki`, `Mi`, …), affine units like °C and °F with correct offsets, and display symbols (`°C`, `Ω`)
- **Conversion** — the `in` / `to` operators convert a quantity and format the result (`evaluate.ts`, `format.ts`)
- **Notebook UI** — cells with history, built with React (`src/App.tsx`)

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

## Layout

```
src/core/    Lexer, parser, quantity/dimension model, units, evaluator, formatter
src/App.tsx  Notebook UI
```

The language core is DOM-free and unit-tested (`core.test.ts`).

## License

MIT
