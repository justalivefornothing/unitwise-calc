export type TokenType = 'num' | 'ident' | 'op' | 'kw' | 'comment' | 'bad' | 'eof'

export interface Token {
  type: TokenType
  /** Source text exactly as typed. */
  text: string
  /** Normalised operator (`·`/`×` -> `*`, `÷`/`per` -> `/`), keyword, or number value. */
  op?: string
  value?: number
  start: number
  end: number
}

const KEYWORDS = new Set(['in', 'to'])
const OPERATORS: Record<string, string> = {
  '+': '+', '-': '-', '−': '-', '*': '*', '·': '*', '×': '*', '/': '/', '÷': '/',
  '^': '^', '(': '(', ')': ')', '=': '=',
}

const isDigit = (c: string) => c >= '0' && c <= '9'
const isIdentStart = (c: string) => /[A-Za-z_°µμΩ%]/.test(c)
const isIdentPart = (c: string) => /[A-Za-z0-9_°µμΩ]/.test(c)

/**
 * Tokenise one line. Never throws: unknown characters become `bad` tokens so
 * the highlighter can still colour the line; the parser reports them.
 */
export function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < line.length) {
    const c = line[i]
    if (c === ' ' || c === '\t' || c === '\r') {
      i++
      continue
    }
    const start = i
    if (c === '#') {
      tokens.push({ type: 'comment', text: line.slice(i), start, end: line.length })
      break
    }
    if (isDigit(c) || (c === '.' && isDigit(line[i + 1] ?? ''))) {
      while (i < line.length && (isDigit(line[i]) || line[i] === '_')) i++
      if (line[i] === '.' && isDigit(line[i + 1] ?? '')) {
        i++
        while (i < line.length && isDigit(line[i])) i++
      }
      // exponent only when followed by digits, so `1eV` stays `1` + `eV`
      if ((line[i] === 'e' || line[i] === 'E') && /^[+-]?\d/.test(line.slice(i + 1, i + 3))) {
        i += 2
        while (i < line.length && isDigit(line[i])) i++
      }
      const text = line.slice(start, i)
      tokens.push({ type: 'num', text, value: Number(text.replace(/_/g, '')), start, end: i })
      continue
    }
    if (c === '%') {
      tokens.push({ type: 'ident', text: '%', start, end: ++i })
      continue
    }
    if (isIdentStart(c)) {
      while (i < line.length && isIdentPart(line[i])) i++
      const text = line.slice(start, i)
      if (KEYWORDS.has(text)) tokens.push({ type: 'kw', text, op: text, start, end: i })
      else if (text === 'per') tokens.push({ type: 'op', text, op: '/', start, end: i })
      else tokens.push({ type: 'ident', text, start, end: i })
      continue
    }
    if (c in OPERATORS) {
      tokens.push({ type: 'op', text: c, op: OPERATORS[c], start, end: ++i })
      continue
    }
    tokens.push({ type: 'bad', text: c, start, end: ++i })
  }
  tokens.push({ type: 'eof', text: '', start: line.length, end: line.length })
  return tokens
}
