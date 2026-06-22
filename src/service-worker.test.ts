import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('service worker cache policy', () => {
  it('does not cache API requests', () => {
    const source = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')
    expect(source).toContain("url.pathname.startsWith('/api/')")
    expect(source).toContain('return')
  })
})
