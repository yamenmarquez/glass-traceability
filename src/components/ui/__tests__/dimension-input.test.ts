import { describe, it, expect } from 'vitest'
import { parseInput } from '../dimension-input'

describe('parseInput', () => {
  it('parses "80 1/16"', () => {
    const result = parseInput('80 1/16')
    expect(result).toEqual({ inches: 80, fraction: '1/16' })
  })

  it('parses "80.0625"', () => {
    const result = parseInput('80.0625')
    expect(result).toEqual({ inches: 80, fraction: '1/16' })
  })

  it('parses "80"', () => {
    const result = parseInput('80')
    expect(result).toEqual({ inches: 80, fraction: '0' })
  })

  it('parses "1/2"', () => {
    const result = parseInput('1/2')
    expect(result).toEqual({ inches: 0, fraction: '1/2' })
  })
})
