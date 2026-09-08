import { d, type Dim } from './dimension.ts'

export interface UnitDef {
  /** Dimension vector of one unit. */
  dim: Dim
  /** How many SI base units one of this unit is worth (`km` -> 1000). */
  scale: number
  /** Affine units only (°C, °F): SI value = value * scale + offset. */
  offset?: number
  /** Which prefixes may be glued on: SI (k, M, m...), binary (Ki, Mi...) or both. */
  prefix?: 'si' | 'binary' | 'both'
  /** Preferred symbol when the unit is displayed, e.g. `°C` or `Ω`. */
  display?: string
  /** Cheat-sheet group. */
  group: string
}

const u = (group: string, dim: Dim, scale: number, extra: Partial<UnitDef> = {}): UnitDef => ({
  group,
  dim,
  scale,
  ...extra,
})

// Dimension shorthands: d(length, mass, time, current, temperature, amount, luminosity)
const LENGTH = d(1)
const MASS = d(0, 1)
const TIME = d(0, 0, 1)
const CURRENT = d(0, 0, 0, 1)
const TEMP = d(0, 0, 0, 0, 1)
const AMOUNT = d(0, 0, 0, 0, 0, 1)
const LUMINOSITY = d(0, 0, 0, 0, 0, 0, 1)
const AREA = d(2)
const VOLUME = d(3)
const VELOCITY = d(1, 0, -1)
const FREQUENCY = d(0, 0, -1)
const FORCE = d(1, 1, -2)
const ENERGY = d(2, 1, -2)
const POWER = d(2, 1, -3)
const PRESSURE = d(-1, 1, -2)
const CHARGE = d(0, 0, 1, 1)
const VOLTAGE = d(2, 1, -3, -1)
const RESISTANCE = d(2, 1, -3, -2)
const FLUX_DENSITY = d(0, 1, -2, -1)
const NONE = d()

/** Canonical unit table (~60 entries). Keys are the symbols users type. */
export const UNITS: Record<string, UnitDef> = {
  // length
  m: u('length', LENGTH, 1, { prefix: 'si' }),
  inch: u('length', LENGTH, 0.0254),
  ft: u('length', LENGTH, 0.3048),
  yd: u('length', LENGTH, 0.9144),
  mi: u('length', LENGTH, 1609.344),
  nmi: u('length', LENGTH, 1852),
  au: u('length', LENGTH, 149_597_870_700),
  ly: u('length', LENGTH, 9.4607304725808e15),
  // area & volume
  ha: u('area', AREA, 1e4),
  acre: u('area', AREA, 4046.8564224),
  L: u('volume', VOLUME, 1e-3, { prefix: 'si' }),
  gal: u('volume', VOLUME, 3.785411784e-3),
  cup: u('volume', VOLUME, 2.365882365e-4),
  tbsp: u('volume', VOLUME, 1.478676478125e-5),
  tsp: u('volume', VOLUME, 4.92892159375e-6),
  floz: u('volume', VOLUME, 2.95735295625e-5),
  // mass
  g: u('mass', MASS, 1e-3, { prefix: 'si' }),
  t: u('mass', MASS, 1000, { prefix: 'si' }),
  lb: u('mass', MASS, 0.45359237),
  oz: u('mass', MASS, 0.028349523125),
  st: u('mass', MASS, 6.35029318),
  // time
  s: u('time', TIME, 1, { prefix: 'si' }),
  min: u('time', TIME, 60),
  h: u('time', TIME, 3600),
  day: u('time', TIME, 86400),
  wk: u('time', TIME, 604800),
  mo: u('time', TIME, 2629800),
  yr: u('time', TIME, 31557600),
  // electricity
  A: u('electricity', CURRENT, 1, { prefix: 'si' }),
  V: u('electricity', VOLTAGE, 1, { prefix: 'si' }),
  ohm: u('electricity', RESISTANCE, 1, { prefix: 'si', display: 'Ω' }),
  Ah: u('electricity', CHARGE, 3600, { prefix: 'si' }),
  T: u('electricity', FLUX_DENSITY, 1, { prefix: 'si' }),
  // temperature
  K: u('temperature', TEMP, 1, { prefix: 'si' }),
  C: u('temperature', TEMP, 1, { offset: 273.15, display: '°C' }),
  F: u('temperature', TEMP, 5 / 9, { offset: 273.15 - (32 * 5) / 9, display: '°F' }),
  // amount & light
  mol: u('amount', AMOUNT, 1, { prefix: 'si' }),
  cd: u('light', LUMINOSITY, 1, { prefix: 'si' }),
  lm: u('light', LUMINOSITY, 1, { prefix: 'si' }),
  lx: u('light', d(-2, 0, 0, 0, 0, 0, 1), 1, { prefix: 'si' }),
  // frequency & speed
  Hz: u('frequency', FREQUENCY, 1, { prefix: 'si' }),
  rpm: u('frequency', FREQUENCY, 1 / 60),
  mph: u('speed', VELOCITY, 1609.344 / 3600),
  kph: u('speed', VELOCITY, 1000 / 3600),
  kn: u('speed', VELOCITY, 1852 / 3600),
  // mechanics
  N: u('force', FORCE, 1, { prefix: 'si' }),
  lbf: u('force', FORCE, 4.4482216152605),
  J: u('energy', ENERGY, 1, { prefix: 'si' }),
  cal: u('energy', ENERGY, 4.184, { prefix: 'si' }),
  Wh: u('energy', ENERGY, 3600, { prefix: 'si' }),
  eV: u('energy', ENERGY, 1.602176634e-19, { prefix: 'si' }),
  BTU: u('energy', ENERGY, 1055.05585262),
  W: u('power', POWER, 1, { prefix: 'si' }),
  hp: u('power', POWER, 745.69987158227),
  Pa: u('pressure', PRESSURE, 1, { prefix: 'si' }),
  bar: u('pressure', PRESSURE, 1e5, { prefix: 'si' }),
  atm: u('pressure', PRESSURE, 101325),
  psi: u('pressure', PRESSURE, 6894.757293168),
  // data (dimensionless carriers; the display unit follows the value around)
  B: u('data', NONE, 1, { prefix: 'both' }),
  bit: u('data', NONE, 1 / 8, { prefix: 'both' }),
  // angles & ratios (dimensionless)
  rad: u('angle', NONE, 1, { prefix: 'si' }),
  deg: u('angle', NONE, Math.PI / 180),
  sr: u('angle', NONE, 1),
  '%': u('ratio', NONE, 0.01),
}

/** Spellings that map onto a canonical key (which may itself be prefixed, e.g. `kg`). */
const ALIASES: Record<string, string> = {
  meter: 'm', meters: 'm', metre: 'm', metres: 'm',
  inches: 'inch',
  foot: 'ft', feet: 'ft',
  yard: 'yd', yards: 'yd',
  mile: 'mi', miles: 'mi',
  liter: 'L', liters: 'L', litre: 'L', litres: 'L', l: 'L', ml: 'mL', cl: 'cL', dl: 'dL',
  gallon: 'gal', gallons: 'gal', cups: 'cup',
  gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg',
  tonne: 't', tonnes: 't', ton: 't', tons: 't',
  pound: 'lb', pounds: 'lb', lbs: 'lb', ounce: 'oz', ounces: 'oz', stone: 'st',
  sec: 's', secs: 's', second: 's', seconds: 's',
  minute: 'min', minutes: 'min', mins: 'min',
  hr: 'h', hrs: 'h', hour: 'h', hours: 'h',
  d: 'day', days: 'day', week: 'wk', weeks: 'wk', month: 'mo', months: 'mo',
  year: 'yr', years: 'yr', yrs: 'yr',
  amp: 'A', amps: 'A', ampere: 'A', amperes: 'A', volt: 'V', volts: 'V',
  ohms: 'ohm', 'Ω': 'ohm', tesla: 'T',
  kelvin: 'K', degC: 'C', '°C': 'C', celsius: 'C', degF: 'F', '°F': 'F', fahrenheit: 'F',
  moles: 'mol', mole: 'mol', candela: 'cd', lumen: 'lm', lumens: 'lm', lux: 'lx',
  hertz: 'Hz', kmh: 'kph', knot: 'kn', knots: 'kn',
  newton: 'N', newtons: 'N', joule: 'J', joules: 'J', calorie: 'cal', calories: 'cal',
  watt: 'W', watts: 'W', horsepower: 'hp', pascal: 'Pa', pascals: 'Pa',
  byte: 'B', bytes: 'B', bits: 'bit', b: 'bit',
  radian: 'rad', radians: 'rad', degree: 'deg', degrees: 'deg', '°': 'deg',
  percent: '%',
}

const SI_PREFIXES: Record<string, number> = {
  Q: 1e30, R: 1e27, Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, G: 1e9, M: 1e6, k: 1e3,
  h: 1e2, da: 1e1, d: 1e-1, c: 1e-2, m: 1e-3, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, n: 1e-9,
  p: 1e-12, f: 1e-15, a: 1e-18, z: 1e-21, y: 1e-24, r: 1e-27, q: 1e-30,
}

/** IEC binary prefixes, plus the informal upper-case `K` (= 1000) seen in `KB`. */
const BINARY_PREFIXES: Record<string, number> = {
  Ki: 2 ** 10, Mi: 2 ** 20, Gi: 2 ** 30, Ti: 2 ** 40, Pi: 2 ** 50, Ei: 2 ** 60, K: 1e3,
}

export interface ResolvedUnit {
  /** Canonical key in `UNITS`. */
  name: string
  def: UnitDef
  /** `def.scale` multiplied by any prefix factor. */
  scale: number
  /** Symbol to show: `display` override for a bare unit, otherwise what was typed. */
  label: string
}

const exact = (name: string): UnitDef | undefined => UNITS[name]

/**
 * Resolve a unit symbol. Exact matches (and aliases) win; otherwise every
 * known prefix is stripped in turn and the remainder looked up, so `km`,
 * `µs`, `GiB`, `kWh` and `mmol` all resolve without being listed.
 */
export function lookupUnit(typed: string): ResolvedUnit | undefined {
  const name = ALIASES[typed] ?? typed
  const direct = exact(name)
  if (direct) return { name, def: direct, scale: direct.scale, label: direct.display ?? typed }

  for (const [prefix, factor] of [...Object.entries(BINARY_PREFIXES), ...Object.entries(SI_PREFIXES)]) {
    if (!name.startsWith(prefix) || name.length === prefix.length) continue
    const rest = name.slice(prefix.length)
    const def = exact(ALIASES[rest] ?? rest)
    if (!def || !def.prefix) continue
    const isBinary = prefix in BINARY_PREFIXES
    if (isBinary && def.prefix === 'si') continue
    if (!isBinary && def.prefix === 'binary') continue
    return { name: rest, def, scale: def.scale * factor, label: typed }
  }
  return undefined
}

export const isUnitName = (name: string): boolean => lookupUnit(name) !== undefined
