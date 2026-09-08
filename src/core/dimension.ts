/**
 * Dimension vectors over the seven SI base dimensions.
 *
 * A `Dim` is an Int8Array of integer exponents in this order:
 *   0 length (m)  1 mass (kg)  2 time (s)  3 current (A)
 *   4 temperature (K)  5 amount (mol)  6 luminosity (cd)
 *
 * Multiplying quantities adds the vectors, dividing subtracts them, raising
 * to an integer power scales them. Two quantities can be added only when the
 * vectors are equal.
 */
export type Dim = Int8Array

export const BASE_SYMBOLS = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd'] as const
const BASE_NAMES = ['length', 'mass', 'time', 'current', 'temperature', 'amount', 'luminosity'] as const

/** Build a dimension vector from positional exponents; missing ones are 0. */
export function d(...exponents: number[]): Dim {
  const v = new Int8Array(7)
  exponents.forEach((e, i) => {
    v[i] = e
  })
  return v
}

export const DIMLESS: Dim = d()

export function dimMul(a: Dim, b: Dim): Dim {
  return a.map((e, i) => e + b[i]) as Dim
}

export function dimDiv(a: Dim, b: Dim): Dim {
  return a.map((e, i) => e - b[i]) as Dim
}

export function dimPow(a: Dim, n: number): Dim {
  return a.map((e) => e * n) as Dim
}

export function dimEq(a: Dim, b: Dim): boolean {
  return a.every((e, i) => e === b[i])
}

export function isDimless(a: Dim): boolean {
  return a.every((e) => e === 0)
}

/** Stable string key, handy for table lookups. */
export function dimKey(a: Dim): string {
  return Array.from(a).join(',')
}

const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** `2` -> `²`, `-1` -> `⁻¹`, `1` -> `` (an implicit exponent is not shown). */
export function superscript(n: number): string {
  if (n === 1) return ''
  const digits = String(Math.abs(n))
    .split('')
    .map((c) => SUPERSCRIPTS[Number(c)])
    .join('')
  return (n < 0 ? '⁻' : '') + digits
}

/**
 * Render a dimension vector in SI base units, e.g. `kg·m/s²`. Positive
 * exponents come first joined by `·`; negative ones go after a single `/`
 * (parenthesised when there is more than one). With no positive part the
 * negative exponents are written directly, e.g. `s⁻¹`.
 */
/** Conventional order for writing base units: kg·m·s·A·K·mol·cd. */
const DISPLAY_ORDER = [1, 0, 2, 3, 4, 5, 6]

export function formatBaseUnits(dim: Dim): string {
  const pos: string[] = []
  const neg: string[] = []
  for (const i of DISPLAY_ORDER) {
    const e = dim[i]
    if (e > 0) pos.push(BASE_SYMBOLS[i] + superscript(e))
    else if (e < 0) neg.push(BASE_SYMBOLS[i] + superscript(-e))
  }
  if (pos.length === 0) {
    return DISPLAY_ORDER.filter((i) => dim[i] < 0)
      .map((i) => BASE_SYMBOLS[i] + superscript(dim[i]))
      .join('·')
  }
  const head = pos.join('·')
  if (neg.length === 0) return head
  return neg.length === 1 ? `${head}/${neg[0]}` : `${head}/(${neg.join('·')})`
}

/** Human names used in error messages: "length", "velocity", "energy"... */
const NAMED_DIMS: Array<[Dim, string]> = [
  ...BASE_NAMES.map((name, i): [Dim, string] => {
    const v = new Int8Array(7)
    v[i] = 1
    return [v, name]
  }),
  [d(2), 'area'],
  [d(3), 'volume'],
  [d(1, 0, -1), 'velocity'],
  [d(1, 0, -2), 'acceleration'],
  [d(1, 1, -2), 'force'],
  [d(2, 1, -2), 'energy'],
  [d(2, 1, -3), 'power'],
  [d(-1, 1, -2), 'pressure'],
  [d(0, 0, -1), 'frequency'],
  [d(0, 0, 1, 1), 'charge'],
  [d(2, 1, -3, -1), 'voltage'],
  [d(2, 1, -3, -2), 'resistance'],
  [d(-3, 1), 'density'],
  [d(1, 1, -1), 'momentum'],
  [d(0, 1, -2, -1), 'magnetic flux density'],
]

export function describeDim(dim: Dim): string {
  if (isDimless(dim)) return 'a dimensionless number'
  const hit = NAMED_DIMS.find(([v]) => dimEq(v, dim))
  return hit ? hit[1] : formatBaseUnits(dim)
}
