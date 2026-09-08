import { UnitwiseError } from './errors.ts'
import { tokenize, type Token } from './lexer.ts'

/** A unit expression: `km`, `m/s^2`, `kg*m/s^2`, `(kg*m)/s^2`. */
export type UnitNode =
  | { kind: 'unit'; name: string; start: number; end: number }
  | { kind: 'unitbin'; op: '*' | '/'; left: UnitNode; right: UnitNode; start: number; end: number }
  | { kind: 'unitpow'; base: UnitNode; exp: number; start: number; end: number }

export type Node =
  | { kind: 'num'; value: number; unit?: UnitNode; start: number; end: number }
  | { kind: 'ident'; name: string; start: number; end: number }
  | { kind: 'neg'; expr: Node; start: number; end: number }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Node; right: Node; implicit?: boolean; start: number; end: number }
  | { kind: 'convert'; expr: Node; unit: UnitNode; start: number; end: number }

export type Line =
  | { kind: 'empty' }
  | { kind: 'comment' }
  | { kind: 'expr'; expr: Node }
  | { kind: 'assign'; name: string; nameStart: number; nameEnd: number; expr: Node }

export interface ParseOptions {
  /** True when an identifier should be read as a unit glued to a number (not a variable). */
  isUnit: (name: string) => boolean
}

// Binding powers, lowest to highest.
const BP_CONVERT = 5
const BP_ADD = 10
const BP_MUL = 20
const BP_IMPLICIT = 25
const BP_POW = 30

/**
 * A Pratt parser. Numbers greedily absorb a following unit expression
 * (`3 m/s^2`) so that unit application binds tighter than every operator,
 * while `3 m / 2 s` still divides two quantities because the unit grabber
 * refuses to step over an operator unless a unit symbol follows it.
 */
export function parseLine(source: string, opts: ParseOptions): Line {
  const tokens = tokenize(source)
  let pos = 0
  const peek = (offset = 0): Token => tokens[Math.min(pos + offset, tokens.length - 1)]
  const next = (): Token => tokens[pos++]

  const fail = (message: string, tok: Token): never => {
    throw new UnitwiseError(message, tok.start, tok.end)
  }
  const expectOp = (op: string, what: string): Token => {
    const tok = peek()
    if (tok.type === 'op' && tok.op === op) return next()
    return fail(`Expected ${what}`, tok)
  }
  const isOp = (tok: Token, op: string) => tok.type === 'op' && tok.op === op
  const isUnitTok = (tok: Token) => tok.type === 'ident' && opts.isUnit(tok.text)

  // --- unit expressions -----------------------------------------------------

  function unitAtom(): UnitNode {
    const tok = peek()
    if (isOp(tok, '(')) {
      next()
      const inner = unitExpr(true)
      const close = expectOp(')', "')' to close the unit")
      return { ...inner, start: tok.start, end: close.end }
    }
    if (tok.type === 'ident') {
      next()
      return { kind: 'unit', name: tok.text, start: tok.start, end: tok.end }
    }
    return fail(tok.type === 'eof' ? 'Expected a unit' : `Expected a unit, found '${tok.text}'`, tok)
  }

  function unitTerm(): UnitNode {
    let base = unitAtom()
    if (isOp(peek(), '^')) {
      next()
      let sign = 1
      if (isOp(peek(), '-')) {
        next()
        sign = -1
      }
      const e = peek()
      if (e.type !== 'num' || !Number.isInteger(e.value)) return fail('Unit exponents must be whole numbers', e)
      next()
      base = { kind: 'unitpow', base, exp: sign * (e.value as number), start: base.start, end: e.end }
    }
    return base
  }

  /**
   * `greedy` (after `in`/`to`): keep consuming `*` and `/` as long as a unit follows.
   * Otherwise (glued to a number) also require the following identifier to be a
   * known unit, so `3 m / x` leaves `/ x` to the expression parser.
   */
  function unitExpr(greedy: boolean): UnitNode {
    let left = unitTerm()
    for (;;) {
      const tok = peek()
      if (!isOp(tok, '*') && !isOp(tok, '/')) break
      const after = peek(1)
      const continues = greedy ? after.type === 'ident' || isOp(after, '(') : isUnitTok(after)
      if (!continues) break
      next()
      const right = unitTerm()
      left = { kind: 'unitbin', op: tok.op as '*' | '/', left, right, start: left.start, end: right.end }
    }
    return left
  }

  // --- expressions ----------------------------------------------------------

  function prefix(): Node {
    const tok = next()
    switch (tok.type) {
      case 'num': {
        const node: Node = { kind: 'num', value: tok.value as number, start: tok.start, end: tok.end }
        if (isUnitTok(peek())) {
          node.unit = unitExpr(false)
          node.end = node.unit.end
        }
        return node
      }
      case 'ident':
        return { kind: 'ident', name: tok.text, start: tok.start, end: tok.end }
      case 'op':
        if (tok.op === '(') {
          const inner = expr(0)
          const close = expectOp(')', "')'")
          return { ...inner, start: tok.start, end: close.end }
        }
        if (tok.op === '-') {
          const operand = expr(BP_IMPLICIT)
          return { kind: 'neg', expr: operand, start: tok.start, end: operand.end }
        }
        if (tok.op === '+') return expr(BP_IMPLICIT)
        return fail(`Unexpected '${tok.text}'`, tok)
      case 'kw':
        return fail(`'${tok.text}' needs a value on its left`, tok)
      case 'bad':
        return fail(`Unexpected character '${tok.text}'`, tok)
      default:
        return fail('Expected a value', tok)
    }
  }

  function bindingPower(tok: Token): number {
    if (tok.type === 'kw') return BP_CONVERT
    if (tok.type === 'ident') return BP_IMPLICIT
    if (tok.type !== 'op') return 0
    switch (tok.op) {
      case '+':
      case '-':
        return BP_ADD
      case '*':
      case '/':
        return BP_MUL
      case '^':
        return BP_POW
      default:
        return 0
    }
  }

  function expr(minBp: number): Node {
    let left = prefix()
    for (;;) {
      const tok = peek()
      const bp = bindingPower(tok)
      if (bp === 0 || bp <= minBp) break
      if (tok.type === 'kw') {
        next()
        const unit = unitExpr(true)
        left = { kind: 'convert', expr: left, unit, start: left.start, end: unit.end }
        continue
      }
      if (tok.type === 'ident') {
        // implicit multiplication: `2 x`, `x km`, `(1 + 2) km`
        const right: Node = opts.isUnit(tok.text) ? unitToNode(unitExpr(false)) : prefix()
        left = { kind: 'bin', op: '*', left, right, implicit: true, start: left.start, end: right.end }
        continue
      }
      next()
      const op = tok.op as '+' | '-' | '*' | '/' | '^'
      const right = expr(op === '^' ? bp - 1 : bp)
      left = { kind: 'bin', op, left, right, start: left.start, end: right.end }
    }
    return left
  }

  // A unit expression used where a value is expected: `x km` is `x * (1 km)`.
  function unitToNode(unit: UnitNode): Node {
    return { kind: 'num', value: 1, unit, start: unit.start, end: unit.end }
  }

  // --- line -----------------------------------------------------------------

  const first = peek()
  if (first.type === 'eof') return { kind: 'empty' }
  if (first.type === 'comment') return { kind: 'comment' }

  let line: Line
  if (first.type === 'ident' && isOp(peek(1), '=')) {
    next()
    next()
    if (peek().type === 'eof' || peek().type === 'comment') fail(`'${first.text}' needs a value after '='`, peek())
    line = { kind: 'assign', name: first.text, nameStart: first.start, nameEnd: first.end, expr: expr(0) }
  } else {
    line = { kind: 'expr', expr: expr(0) }
  }

  const rest = peek()
  if (rest.type !== 'eof' && rest.type !== 'comment') {
    if (rest.type === 'bad') fail(`Unexpected character '${rest.text}'`, rest)
    if (isOp(rest, ')')) fail("Unmatched ')'", rest)
    if (isOp(rest, '=')) fail('Assignments look like: name = value', rest)
    fail(`Unexpected '${rest.text}'`, rest)
  }
  return line
}
