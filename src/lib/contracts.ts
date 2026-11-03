import { Interface, type ContractTransactionReceipt } from 'ethers'
import { CONTRACT_ABIS } from '../generated/contracts'

export function eventValue<T = unknown>(
  receipt: ContractTransactionReceipt,
  contractKey: keyof typeof CONTRACT_ABIS,
  eventName: string,
  argument: string,
): T | null {
  const parser = new Interface(CONTRACT_ABIS[contractKey])
  for (const log of receipt.logs) {
    try {
      const parsed = parser.parseLog(log)
      if (parsed?.name === eventName) return parsed.args.getValue(argument) as T
    } catch {
      // A receipt can include ERC-20 and other dependency logs.
    }
  }
  return null
}

export function hashQuery(): URLSearchParams {
  const query = window.location.hash.split('?')[1] ?? ''
  return new URLSearchParams(query)
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
