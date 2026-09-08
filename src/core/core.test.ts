import { describe, expect, it } from 'vitest'
import { describeDim, evaluate, evaluateDocument, formatNumber, lookupUnit, prettyUnitLabel, tokenize } from './index.ts'

describe('spec examples', () => {
  it('converts a speed times a duration into kilometres', () => {
    expect(evaluate('60 mph * 2.5 h in km').toString()).toBe('241.4 km')
  })
  it('simplifies kg·m/s² to newtons', () => {
    expect(evaluate('2 kg * 3 m/s^2').toString()).toBe('6 N')
  })
  it('refuses to add length to time', () => {
    expect(() => evaluate('3 m + 2 s')).toThrow(/Cannot add length to time/)
  })
  it('converts celsius to fahrenheit', () => {
    expect(evaluate('100 C in F').value).toBeCloseTo(212)
  })
  it('lets later lines use earlier variables', () => {
    expect(evaluate('x = 5 km\nx / 2 h in m/s').value).toBeCloseTo(0.6944, 3)
  })
  it('handles binary and decimal byte prefixes', () => {
    expect(evaluate('1 GiB in MB').value).toBeCloseTo(1073.74, 1)
  })
})

describe('lexer', () => {
  it('splits numbers, units, operators and keywords', () => {
    const types = tokenize('60 mph * 2.5 h in km # note').map((t) => t.type)
    expect(types).toEqual(['num', 'ident', 'op', 'num', 'ident', 'kw', 'ident', 'comment', 'eof'])
  })
  it('does not swallow eV as an exponent', () => {
    expect(tokenize('1eV').slice(0, 2).map((t) => t.text)).toEqual(['1', 'eV'])
    expect(tokenize('1e3')[0].value).toBe(1000)
  })
  it('reads unicode operators and digit separators', () => {
    expect(tokenize('1_000 × 2 ÷ 4')[1].op).toBe('*')
    expect(tokenize('1_000')[0].value).toBe(1000)
  })
})

describe('units', () => {
  it('strips SI and binary prefixes', () => {
    expect(lookupUnit('km')?.scale).toBe(1000)
    expect(lookupUnit('kg')?.scale).toBeCloseTo(1)
    expect(lookupUnit('µs')?.scale).toBeCloseTo(1e-6)
    expect(lookupUnit('KiB')?.scale).toBe(1024)
    expect(lookupUnit('kWh')?.scale).toBe(3.6e6)
  })
  it('prefers exact matches over prefix parses', () => {
    expect(lookupUnit('min')?.name).toBe('min')
    expect(lookupUnit('cd')?.name).toBe('cd')
    expect(lookupUnit('Pa')?.name).toBe('Pa')
  })
  it('rejects binary prefixes on non-data units', () => {
    expect(lookupUnit('Kim')).toBeUndefined()
    expect(lookupUnit('furlong')).toBeUndefined()
  })
  it('understands long-form aliases', () => {
    expect(evaluate('3 hours in minutes').toString()).toBe('180 minutes')
    expect(evaluate('2 miles in km').value).toBeCloseTo(3.2187, 3)
  })
})

describe('arithmetic and dimensions', () => {
  it('keeps the display unit when scaling by a plain number', () => {
    expect(evaluate('5 km * 2').toString()).toBe('10 km')
    expect(evaluate('2 * 5 km').toString()).toBe('10 km')
    expect(evaluate('10 km / 4').toString()).toBe('2.5 km')
    expect(evaluate('5 km + 300 m').toString()).toBe('5.3 km')
  })
  it('drops the display unit when two units combine', () => {
    expect(evaluate('10 m / 2 s').toString()).toBe('5 m/s')
    expect(evaluate('3 kg * 2 m').toString()).toBe('6 kg·m')
    expect(evaluate('4 N * 3 m').toString()).toBe('12 J')
    expect(evaluate('12 J / 4 s').toString()).toBe('3 W')
    expect(evaluate('1 / 4 s').toString()).toBe('0.25 Hz')
  })
  it('raises quantities to integer powers', () => {
    expect(evaluate('(5 km)^2').toString()).toBe('25 km²')
    expect(evaluate('2 m^3 in L').toString()).toBe('2000 L')
    expect(evaluate('2 ^ 0.5').value).toBeCloseTo(Math.SQRT2)
    expect(() => evaluate('(2 m) ^ 0.5')).toThrow(/whole number/)
    expect(() => evaluate('2 ^ 3 m')).toThrow(/exponent cannot have units/i)
  })
  it('binds a unit tighter than division on the following term', () => {
    expect(evaluate('100 km / 2 h in km/h').toString()).toBe('50 km/h')
    expect(evaluate('3 m / 2 s').toString()).toBe('1.5 m/s')
  })
  it('treats data sizes as carrier units', () => {
    expect(evaluate('2 GB * 3').toString()).toBe('6 GB')
    expect(evaluate('8 bit in B').toString()).toBe('1 B')
    expect(evaluate('100 GB / 25 MB').toString()).toBe('4000')
  })
  it('supports percent and angles', () => {
    expect(evaluate('50 % * 80 km').toString()).toBe('40 km')
    expect(evaluate('180 deg in rad').value).toBeCloseTo(Math.PI)
  })
  it('subtracts and negates', () => {
    expect(evaluate('1 h - 15 min in min').toString()).toBe('45 min')
    expect(evaluate('-3 m * 2').toString()).toBe('-6 m')
    expect(() => evaluate('5 kg - 2 m')).toThrow(/Cannot subtract length from mass/)
  })
  it('names common derived dimensions in errors', () => {
    expect(() => evaluate('3 m/s + 2 kg')).toThrow(/Cannot add velocity to mass/)
    expect(() => evaluate('3 m + 2')).toThrow(/Cannot add length to a dimensionless number/)
    expect(describeDim(evaluate('1 kg * 1 m^4 / 1 s').dim)).toBe('kg·m⁴/s')
  })
})

describe('conversion', () => {
  it('accepts both in and to', () => {
    expect(evaluate('1 mi to m').toString()).toBe('1609.3 m')
    expect(evaluate('1 mi to m').value).toBe(1609.344)
    expect(evaluate('mph in m/s').value).toBeCloseTo(0.44704)
  })
  it('rejects mismatched dimensions', () => {
    expect(() => evaluate('5 km in s')).toThrow(/Cannot convert length to time/)
  })
  it('handles compound targets with pretty exponents', () => {
    expect(evaluate('9.81 m/s^2 in km/h^2').unit).toBe('km/h²')
    expect(evaluate('1 atm in kPa').value).toBeCloseTo(101.325)
    expect(evaluate('1 kg*m/s^2 in N').toString()).toBe('1 N')
  })
})

describe('temperature', () => {
  it('converts between affine scales', () => {
    expect(evaluate('0 C in K').value).toBeCloseTo(273.15)
    expect(evaluate('-40 C in F').value).toBeCloseTo(-40)
    expect(evaluate('300 K in C').value).toBeCloseTo(26.85)
    expect(evaluate('100 C in F').toString()).toBe('212 °F')
  })
  it('only allows offset scales inside conversions', () => {
    expect(() => evaluate('20 C + 5 C')).toThrow(/only be converted/)
    expect(() => evaluate('2 * 30 F')).toThrow(/only be converted/)
    expect(() => evaluate('5 m in C*s')).toThrow(/cannot be combined/)
    expect(evaluate('(20 C in K) * 2').value).toBeCloseTo(586.3)
    expect(evaluate('20 K + 5 K').toString()).toBe('25 K')
  })
})

describe('documents', () => {
  it('reports each line independently with error spans', () => {
    const lines = evaluateDocument('# heading\n\nx = 2 kg\nx * 3 m/s^2\n3 m + 2 s\n5 furlongs\n1 / 0')
    expect(lines.map((l) => l.kind)).toEqual(['comment', 'empty', 'value', 'value', 'error', 'error', 'error'])
    expect(lines[2]).toMatchObject({ kind: 'value', name: 'x' })
    expect(lines[3].kind === 'value' && lines[3].result.toString()).toBe('6 N')
    expect(lines[4]).toMatchObject({ kind: 'error', message: 'Cannot add length to time', start: 0, end: 9 })
    expect(lines[5]).toMatchObject({ kind: 'error', message: "Unknown unit 'furlongs'", start: 2, end: 10 })
    expect(lines[6]).toMatchObject({ kind: 'error', message: 'Division by zero' })
  })
  it('lets variables shadow units', () => {
    expect(evaluate('m = 3\n2 m').toString()).toBe('6')
  })
  it('reports parse errors with positions', () => {
    const [line] = evaluateDocument('2 * (3 + ')
    expect(line).toMatchObject({ kind: 'error', message: 'Expected a value', start: 9, end: 9 })
    expect(evaluateDocument('5 km in')[0]).toMatchObject({ kind: 'error', message: 'Expected a unit' })
    expect(evaluateDocument('3 $')[0]).toMatchObject({ kind: 'error', message: "Unexpected character '$'" })
  })
})

describe('formatting', () => {
  it('rounds to about five significant digits and keeps integers whole', () => {
    expect(formatNumber(241.4016)).toBe('241.4')
    expect(formatNumber(1073.741824)).toBe('1073.7')
    expect(formatNumber(0.694444)).toBe('0.69444')
    expect(formatNumber(1073741824)).toBe('1073741824')
    expect(formatNumber(1.5e-9)).toBe('1.5e-9')
    expect(formatNumber(-0)).toBe('0')
  })
  it('pretty-prints unit expressions', () => {
    expect(prettyUnitLabel('kg * m / s ^ 2')).toBe('kg·m/s²')
    expect(prettyUnitLabel('m^-1')).toBe('m⁻¹')
  })
})
