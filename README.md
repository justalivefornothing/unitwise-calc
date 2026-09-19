# Unitwise Calc

Notebook-style calculator language where numbers carry physical units. Dimensional analysis catches mistakes; results convert with `in` / `to`.

## Features

- Values are magnitude + unit, not bare floats
- Dimensional checks on arithmetic (reject `m + s`)
- Convert on demand: `5 km in miles`, `100 °C to K`
- Notebook cells for exploratory calculation

## Run

```bash
npm install
npm run dev
npm test
```

## License

MIT
