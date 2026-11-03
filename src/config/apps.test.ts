import { describe, expect, it } from 'vitest'
import { APPS, CATEGORY_META } from './apps'

describe('Zenith Apps catalog', () => {
  it('contains ten unique consumer applications', () => {
    expect(APPS).toHaveLength(10)
    expect(new Set(APPS.map((app) => app.id)).size).toBe(10)
    expect(new Set(APPS.map((app) => app.contractKey)).size).toBe(10)
  })

  it('assigns every application to a visible category', () => {
    for (const app of APPS) expect(CATEGORY_META[app.category]).toBeDefined()
  })
})
