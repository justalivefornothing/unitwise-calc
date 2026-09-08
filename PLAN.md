# Unitwise — plan

A notebook-style calculator language where numbers carry physical units,
dimensional analysis catches mistakes, and results convert on demand with
`in` or `to`.

## Goal

Type `60 mph * 2.5 h in km` and read `241.4 km`. Type `3 m + 2 s` and get a
red inline error, with the offending span underlined, explaining that length
cannot be added to time. Everything runs in the browser, from scratch, with no
math or units library.

## Features

- Tokenizer + Pratt parser: numbers with SI prefixes and units (`5 km`,
  `3.2 kg`, `60 mph`), operators `+ - * / ^`, parentheses, variables, and the
  conversion keyword `in` / `to`.
- Dimension vectors over 7 base dimensions (length, mass, time, current,
  temperature, amount, luminosity) with multiply, divide and integer powers.
- Unit table of ~60 units including compound units (`N`, `J`, `W`, `Pa`,
  `mph`, `km/h`), SI prefixes (`mm`, `kW`) and binary prefixes for bytes
  (`KiB`, `GiB`).
- Notebook layout: each line evaluates independently, results right-aligned,
  later lines can reference earlier variables, `#` comments.
- Automatic simplification of result units (`kg*m/s^2` shows as `N`) with
  true superscript exponents.
- Dimension mismatch, unknown unit and division-by-zero errors shown inline
  with the source span underlined.
- Temperature (`C`, `F`, `K`) with affine conversions, legal only as
  standalone quantities inside a conversion.
- Document persisted to localStorage plus an export-as-Markdown button.

## Architecture

```
src/
  core/
    dimension.ts   Dim = Int8Array(7); mul/div/pow/eq + naming (length, time…)
    units.ts       unit table, SI + binary prefixes, lookup with prefix stripping
    lexer.ts       tokens: number, ident, op, paren, keyword (in/to), '=' , '#'
    parser.ts      Pratt parser -> AST (implicit multiplication num·unit binds tightest)
    quantity.ts    Quantity {value, dim, offsetUnit?} + arithmetic w/ typed errors
    evaluate.ts    AST -> Quantity, variable env, conversion, error spans
    format.ts      simplify dim -> derived unit name, pretty exponents, toString
    index.ts       evaluate(source) public API used by tests and the UI
  ui/
    Notebook.tsx   line editor + result gutter
    Line.tsx       one source line, error underline, result fade-in
    Toolbar.tsx    export markdown, reset, examples
  App.tsx, main.tsx, index.css
```

Quantities store values already scaled to SI at parse time, so arithmetic
never needs to look at units again: `+`/`-` require equal dims, `*` adds dim
vectors, `/` subtracts them, `^` scales by an integer. `in`/`to` evaluates the
right side as a unit expression, checks dims match, and divides the SI value
by the target scale (or applies the affine map for temperatures).

## Milestones

1. Plan, license, git init.
2. Vite + React + Tailwind scaffold.
3. Core: dimensions, units, lexer, parser, evaluator, formatter + vitest.
4. Notebook UI with inline errors and result column.
5. Persistence, Markdown export, temperature and byte niceties.
6. Build, headless smoke, screenshot, README, publish.
