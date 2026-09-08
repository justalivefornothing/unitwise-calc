/** An error anchored to a `[start, end)` character span of the source line. */
export class UnitwiseError extends Error {
  start: number
  end: number

  constructor(message: string, start: number, end: number) {
    super(message)
    this.name = 'UnitwiseError'
    this.start = start
    this.end = end
  }
}
