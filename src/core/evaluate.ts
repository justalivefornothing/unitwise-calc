import { DIMLESS, dimDiv, dimMul, dimPow, type Dim } from './dimension.ts'
import { UnitwiseError } from './errors.ts'
import { formatNumber, prettyUnitLabel, simplifyDim } from './format.ts'
import { parseLine, type Node, type UnitNode } from './parser.ts'
import { add, convert, divide, multiply, negate, power, subtract, type DisplayUnit, type Quantity } from './quantity.ts'
import { isUnitName, lookupUnit } from './units.ts'

/** A finished, display-ready value. `value` is expressed in `unit`, not in SI. */
export interface Result {
  value: number
  unit: string
  dim: Dim
  toString(): string
}

export type LineResult =
  | { kind: 'empty' }
  | { kind: 'comment' }
  | { kind: 'value'; result: Result; name?: string }
  | { kind: 'error'; message: string; start: number; end: number }

type Env = Map<string, Quantity>
type UnitInfo = DisplayUnit & { dim: Dim }

export function toResult(q: Quantity): Result {
  const value = q.unit ? (q.value - (q.unit.offset ?? 0)) / q.unit.scale : q.value
  const unit = q.unit ? q.unit.label : simplifyDim(q.dim)
  return {
    value,
    unit,
    dim: q.dim,
    toString: () => (unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)),
  }
}

/** Resolve a unit expression to a scale, a dimension vector and a display label. */
function evalUnit(node: UnitNode, source: string): UnitInfo {
  switch (node.kind) {
    case 'unit': {
      const hit = lookupUnit(node.name)
      if (!hit) throw new UnitwiseError(`Unknown unit '${node.name}'`, node.start, node.end)
      return { label: hit.label, scale: hit.scale, offset: hit.def.offset, dim: hit.def.dim }
    }
    case 'unitbin': {
      const left = evalUnit(node.left, source)
      const right = evalUnit(node.right, source)
      rejectAffine(left, node)
      rejectAffine(right, node)
      return {
        label: prettyUnitLabel(source.slice(node.start, node.end)),
        scale: node.op === '*' ? left.scale * right.scale : left.scale / right.scale,
        dim: node.op === '*' ? dimMul(left.dim, right.dim) : dimDiv(left.dim, right.dim),
      }
    }
    case 'unitpow': {
      const base = evalUnit(node.base, source)
      rejectAffine(base, node)
      if (Math.abs(node.exp) > 32) throw new UnitwiseError('Exponent is too large for a unit', node.start, node.end)
      return {
        label: prettyUnitLabel(source.slice(node.start, node.end)),
        scale: base.scale ** node.exp,
        dim: dimPow(base.dim, node.exp),
      }
    }
  }
}

function rejectAffine(info: UnitInfo, node: UnitNode): void {
  if (info.offset != null) {
    throw new UnitwiseError(`${info.label} cannot be combined with other units; use K instead`, node.start, node.end)
  }
}

function quantityOf(value: number, unit: UnitInfo): Quantity {
  return {
    value: value * unit.scale + (unit.offset ?? 0),
    dim: unit.dim,
    unit: { label: unit.label, scale: unit.scale, offset: unit.offset },
    affine: unit.offset != null,
  }
}

function evalNode(node: Node, source: string, env: Env): Quantity {
  switch (node.kind) {
    case 'num':
      return node.unit ? quantityOf(node.value, evalUnit(node.unit, source)) : { value: node.value, dim: DIMLESS }
    case 'ident': {
      const variable = env.get(node.name)
      if (variable) return { ...variable }
      if (isUnitName(node.name)) return quantityOf(1, evalUnit({ ...node, kind: 'unit' }, source))
      throw new UnitwiseError(`Unknown variable or unit '${node.name}'`, node.start, node.end)
    }
    case 'neg':
      return negate(evalNode(node.expr, source, env))
    case 'convert':
      return convert(evalNode(node.expr, source, env), evalUnit(node.unit, source), node)
    case 'bin': {
      if (node.implicit && node.right.kind === 'ident' && !env.has(node.right.name) && !isUnitName(node.right.name)) {
        throw new UnitwiseError(`Unknown unit '${node.right.name}'`, node.right.start, node.right.end)
      }
      const left = evalNode(node.left, source, env)
      const right = evalNode(node.right, source, env)
      switch (node.op) {
        case '+':
          return add(left, right, node)
        case '-':
          return subtract(left, right, node)
        case '*':
          return multiply(left, right, node)
        case '/':
          return divide(left, right, node)
        case '^':
          return power(left, right, node)
      }
    }
  }
}

function evalLine(line: string, env: Env): LineResult {
  try {
    const parsed = parseLine(line, { isUnit: (name) => !env.has(name) && isUnitName(name) })
    if (parsed.kind === 'empty' || parsed.kind === 'comment') return { kind: parsed.kind }
    const quantity = evalNode(parsed.expr, line, env)
    if (parsed.kind === 'assign') {
      env.set(parsed.name, quantity)
      return { kind: 'value', result: toResult(quantity), name: parsed.name }
    }
    return { kind: 'value', result: toResult(quantity) }
  } catch (error) {
    if (error instanceof UnitwiseError) {
      return { kind: 'error', message: error.message, start: error.start, end: error.end }
    }
    throw error
  }
}

/**
 * Evaluate a whole notebook. Each line stands on its own and never throws;
 * variables assigned on earlier lines are visible to later ones.
 */
export function evaluateDocument(source: string): LineResult[] {
  const env: Env = new Map()
  return source.split('\n').map((line) => evalLine(line, env))
}

/**
 * Evaluate a snippet and return the result of its last meaningful line.
 * Throws a `UnitwiseError` if that line failed.
 */
export function evaluate(source: string): Result {
  const lines = evaluateDocument(source)
  const last = lines.filter((line) => line.kind === 'value' || line.kind === 'error').at(-1)
  if (!last) throw new UnitwiseError('Nothing to evaluate', 0, 0)
  if (last.kind === 'error') throw new UnitwiseError(last.message, last.start, last.end)
  return last.result
}
