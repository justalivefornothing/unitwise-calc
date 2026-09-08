import { describeDim, dimDiv, dimEq, dimMul, dimPow, isDimless, superscript, type Dim } from './dimension.ts'
import { UnitwiseError } from './errors.ts'

/** The unit a quantity would like to be shown in (`km`, `m/s²`, `°F`). */
export interface DisplayUnit {
  label: string
  /** SI base units per one display unit. */
  scale: number
  /** Affine temperature scales only. */
  offset?: number
}

/**
 * Every quantity is stored in SI base units the moment it is parsed, so the
 * arithmetic below never has to think about units again, only about
 * dimension vectors. `unit` is a display preference that rides along while it
 * still makes sense (`5 km * 2` stays in km) and is dropped when it does not
 * (`5 km * 2 h` falls back to SI, or to whatever the user converts to).
 */
export interface Quantity {
  value: number
  dim: Dim
  unit?: DisplayUnit
  /** True for °C / °F values, which are only meaningful inside a conversion. */
  affine?: boolean
}

export interface Span {
  start: number
  end: number
}

function guardAffine(q: Quantity, span: Span): void {
  if (q.affine) {
    const label = q.unit?.label ?? 'This temperature'
    throw new UnitwiseError(
      `${label} is an offset scale and can only be converted (e.g. '20 ${label} in K'); use K for arithmetic`,
      span.start,
      span.end,
    )
  }
}

export function add(a: Quantity, b: Quantity, span: Span): Quantity {
  guardAffine(a, span)
  guardAffine(b, span)
  if (!dimEq(a.dim, b.dim)) {
    throw new UnitwiseError(`Cannot add ${describeDim(a.dim)} to ${describeDim(b.dim)}`, span.start, span.end)
  }
  return { value: a.value + b.value, dim: a.dim, unit: a.unit ?? b.unit }
}

export function subtract(a: Quantity, b: Quantity, span: Span): Quantity {
  guardAffine(a, span)
  guardAffine(b, span)
  if (!dimEq(a.dim, b.dim)) {
    throw new UnitwiseError(`Cannot subtract ${describeDim(b.dim)} from ${describeDim(a.dim)}`, span.start, span.end)
  }
  return { value: a.value - b.value, dim: a.dim, unit: a.unit ?? b.unit }
}

/** A plain number, possibly written as a percentage: scaling by it keeps the other side's unit. */
const isScalar = (q: Quantity): boolean => isDimless(q.dim) && (!q.unit || q.unit.label === '%')

/** Which display unit survives a product: the non-scalar side's, if the other side is a scalar. */
function carriedUnit(a: Quantity, b: Quantity): DisplayUnit | undefined {
  if (isScalar(b) && a.unit && a.unit.label !== '%') return a.unit
  if (isScalar(a) && b.unit && b.unit.label !== '%') return b.unit
  if (isScalar(a) && isScalar(b)) return a.unit ?? b.unit
  return undefined
}

export function multiply(a: Quantity, b: Quantity, span: Span): Quantity {
  guardAffine(a, span)
  guardAffine(b, span)
  return { value: a.value * b.value, dim: dimMul(a.dim, b.dim), unit: carriedUnit(a, b) }
}

export function divide(a: Quantity, b: Quantity, span: Span): Quantity {
  guardAffine(a, span)
  guardAffine(b, span)
  if (b.value === 0) throw new UnitwiseError('Division by zero', span.start, span.end)
  return {
    value: a.value / b.value,
    dim: dimDiv(a.dim, b.dim),
    unit: isScalar(b) ? a.unit : undefined,
  }
}

export function power(base: Quantity, exponent: Quantity, span: Span): Quantity {
  guardAffine(base, span)
  guardAffine(exponent, span)
  if (!isDimless(exponent.dim)) throw new UnitwiseError('An exponent cannot have units', span.start, span.end)
  const n = exponent.value
  const dimensioned = !isDimless(base.dim)
  if (dimensioned && !Number.isInteger(n)) {
    throw new UnitwiseError('The exponent must be a whole number when the base has units', span.start, span.end)
  }
  if (dimensioned && Math.abs(n) > 32) throw new UnitwiseError('Exponent is too large for a unit', span.start, span.end)
  const simple = base.unit && Number.isInteger(n) && n !== 0 && /^[^/·⁰-⁹⁻]+$/.test(base.unit.label)
  return {
    value: base.value ** n,
    dim: dimensioned ? dimPow(base.dim, n) : base.dim,
    unit: simple && base.unit ? { label: base.unit.label + superscript(n), scale: base.unit.scale ** n } : undefined,
  }
}

/** Negation is the one operation an offset scale allows: `-40 C` means minus forty degrees. */
export function negate(a: Quantity): Quantity {
  if (a.affine && a.unit) {
    const shown = (a.value - (a.unit.offset ?? 0)) / a.unit.scale
    return { ...a, value: -shown * a.unit.scale + (a.unit.offset ?? 0) }
  }
  return { ...a, value: -a.value }
}

/** `a in target`: same dimensions required; the value stays SI, only the display unit changes. */
export function convert(a: Quantity, target: DisplayUnit & { dim: Dim }, span: Span): Quantity {
  if (!dimEq(a.dim, target.dim)) {
    throw new UnitwiseError(
      `Cannot convert ${describeDim(a.dim)} to ${describeDim(target.dim)} (${target.label})`,
      span.start,
      span.end,
    )
  }
  return {
    value: a.value,
    dim: a.dim,
    unit: { label: target.label, scale: target.scale, offset: target.offset },
    affine: target.offset != null,
  }
}
