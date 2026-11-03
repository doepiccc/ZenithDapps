import { ErrorDescription } from 'ethers'

export function errorMessage(error: unknown): string {
  if (error instanceof ErrorDescription) return error.name
  if (error && typeof error === 'object') {
    const value = error as { shortMessage?: string; reason?: string; message?: string; info?: { error?: { message?: string } } }
    const message = value.shortMessage ?? value.reason ?? value.info?.error?.message ?? value.message
    if (message) {
      return message
        .replace(/^execution reverted:\s*/i, '')
        .replace(/^Error:\s*/i, '')
        .slice(0, 240)
    }
  }
  return typeof error === 'string' ? error.slice(0, 240) : 'Неизвестная ошибка'
}
