import { describe, expect, it } from 'vitest'
import { createTranslator } from './LocaleContext'

const translate = createTranslator([
  ['Open apps', 'Открыть приложения'],
  ['contracts are waiting for deployment', 'контрактов ожидают деплоя'],
])

describe('locale translator', () => {
  it('translates exact values in both directions', () => {
    expect(translate('Открыть приложения', 'en')).toBe('Open apps')
    expect(translate('Open apps', 'ru')).toBe('Открыть приложения')
  })

  it('preserves whitespace and translates dynamic fragments', () => {
    expect(translate('  13 контрактов ожидают деплоя  ', 'en')).toBe('  13 contracts are waiting for deployment  ')
  })

  it('keeps unknown technical identifiers intact', () => {
    expect(translate('ZenithSuiteRegistry', 'ru')).toBe('ZenithSuiteRegistry')
  })
})
