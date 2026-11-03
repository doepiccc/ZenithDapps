import { JsonRpcProvider } from 'ethers'

export const ZENITH_NETWORK = {
  name: 'Zenith EVM Testnet',
  shortName: 'Zenith Testnet',
  chainId: 936485,
  chainIdHex: '0xe4a25',
  rpcUrl: 'https://rpc.testnet.zenith.network/',
  explorerUrl: 'https://explorer.testnet.zenith.network',
  faucetUrl: 'https://explorer.testnet.zenith.network/faucet',
  docsUrl: 'https://docs.zenith.network/zenith-testnet',
  currency: { name: 'Zenith Token', symbol: 'ZTH', decimals: 18 },
} as const

export const WALLET_CHAIN = {
  chainId: ZENITH_NETWORK.chainIdHex,
  chainName: ZENITH_NETWORK.name,
  nativeCurrency: ZENITH_NETWORK.currency,
  rpcUrls: [ZENITH_NETWORK.rpcUrl],
  blockExplorerUrls: [ZENITH_NETWORK.explorerUrl],
} as const

export const publicProvider = new JsonRpcProvider(
  ZENITH_NETWORK.rpcUrl,
  { name: 'zenith-testnet', chainId: ZENITH_NETWORK.chainId },
  { staticNetwork: true },
)

export function shortAddress(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 2) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function explorerTx(hash: string): string {
  return `${ZENITH_NETWORK.explorerUrl}/transactions/${hash}`
}

export function explorerAddress(address: string): string {
  return `${ZENITH_NETWORK.explorerUrl}/addresses/${address}`
}
