import { d, dimEq, formatBaseUnits, isDimless, superscript, type Dim } from './dimension.ts'

/** Named derived units tried, in order, before falling back to base units. */
const DERIVED: Array<[Dim, string]> = [
  [d(1, 1, -2), 'N'],
  [d(2, 1, -2), 'J'],
  [d(2, 1, -3), 'W'],
  [d(-1, 1, -2), 'Pa'],
  [d(0, 0, -1), 'Hz'],
  [d(2, 1, -3, -1), 'V'],
  [d(2, 1, -3, -2), 'Ω'],
  [d(0, 1, -2, -1), 'T'],
]

/** Pick a display unit for a dimension vector: `kg·m/s²` becomes `N`, `m²·kg/s` stays as is. */
export function simplifyDim(dim: Dim): string {
  if (isDimless(dim)) return ''
  const named = DERIVED.find(([v]) => dimEq(v, dim))
  return named ? named[1] : formatBaseUnits(dim)
}

/** Tidy a typed unit expression for display: `kg * m / s ^ 2` -> `kg·m/s²`. */
export function prettyUnitLabel(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[*×]/g, '·')
    .replace(/\^(-?\d+)/g, (_, n: string) => superscript(Number(n)))
}

/**
 * Human-friendly number formatting: integers are printed in full, everything
 * else is rounded to about five significant digits with trailing zeros
 * trimmed, so `241.4016` reads `241.4` and `1073.741824` reads `1073.7`.
 */
export function formatNumber(x: number): string {
  if (Number.isNaN(x)) return 'NaN'
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '-∞'
  if (x === 0) return '0'
  if (Number.isInteger(x)) return Math.abs(x) < 1e21 ? x.toString() : x.toExponential(4)
  const abs = Math.abs(x)
  if (abs < 1e-6 || abs >= 1e21) return Number(x.toPrecision(5)).toExponential()
  if (abs < 1) return Number(x.toPrecision(5)).toString()
  const intDigits = Math.floor(Math.log10(abs)) + 1
  return Number(x.toFixed(Math.max(0, 5 - intDigits))).toString()
}

/** Group thousands with thin spaces for on-screen display: `1073741824` -> `1 073 741 824`. */
export function groupDigits(text: string): string {
  const match = /^(-?)(\d+)(.*)$/.exec(text)
  if (!match || match[2].length < 5) return text
  const [, sign, int, rest] = match
  return sign + int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + rest
}
