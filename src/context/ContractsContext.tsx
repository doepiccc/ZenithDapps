import {
  Contract,
  type ContractTransactionReceipt,
  type InterfaceAbi,
} from 'ethers'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CONTRACT_ABIS } from '../generated/contracts'
import { publicProvider, ZENITH_NETWORK } from '../lib/network'
import type { DeploymentManifest, DeploymentRecord } from '../types'
import { useWallet } from './WalletContext'

interface ContractsContextValue {
  manifest: DeploymentManifest | null
  loading: boolean
  error: string | null
  liveCount: number
  addressOf: (key: string) => string | null
  isLive: (key: string) => boolean
  read: (key: string, method: string, args?: unknown[]) => Promise<any>
  execute: (key: string, method: string, args?: unknown[], overrides?: { value?: bigint }) => Promise<ContractTransactionReceipt>
  approve: (spenderKey: string, amount: bigint) => Promise<ContractTransactionReceipt>
  reload: () => Promise<void>
}

const ContractsContext = createContext<ContractsContextValue | null>(null)

function recordAddress(value: string | DeploymentRecord | undefined): string | null {
  if (typeof value === 'string') return value || null
  return value?.address ?? null
}

function abiFor(key: string): InterfaceAbi {
  const abi = (CONTRACT_ABIS as Record<string, unknown>)[key]
  if (!abi) throw new Error(`ABI для ${key} не найден`)
  return abi as InterfaceAbi
}

export function ContractsProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet()
  const [manifest, setManifest] = useState<DeploymentManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL('deployments/zenith-testnet.json', document.baseURI)
      url.searchParams.set('v', String(Date.now()))
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`)
      const next = await response.json() as DeploymentManifest
      if (next.chainId !== ZENITH_NETWORK.chainId) throw new Error('Deployment manifest относится к другой сети.')
      setManifest(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось прочитать deployment manifest.')
      setManifest({ schemaVersion: 1, chainId: ZENITH_NETWORK.chainId, network: ZENITH_NETWORK.name, updatedAt: null, deployer: null, contracts: {} })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const addressOf = useCallback((key: string) => recordAddress(manifest?.contracts[key]), [manifest])
  const isLive = useCallback((key: string) => Boolean(addressOf(key)), [addressOf])

  const read = useCallback(async (key: string, method: string, args: unknown[] = []) => {
    const address = addressOf(key)
    if (!address) throw new Error(`${key}: контракт ещё не задеплоен. Используйте Zenith Control Panel.`)
    const contract = new Contract(address, abiFor(key), publicProvider)
    return contract.getFunction(method)(...args)
  }, [addressOf])

  const execute = useCallback(async (key: string, method: string, args: unknown[] = [], overrides?: { value?: bigint }) => {
    const address = addressOf(key)
    if (!address) throw new Error(`${key}: контракт ещё не задеплоен. Используйте Zenith Control Panel.`)
    const signer = await wallet.getSigner()
    const contract = new Contract(address, abiFor(key), signer)
    const transaction = await contract.getFunction(method)(...args, ...(overrides ? [overrides] : []))
    const receipt = await transaction.wait()
    if (!receipt) throw new Error('Транзакция отправлена, но receipt не получен.')
    return receipt as ContractTransactionReceipt
  }, [addressOf, wallet])

  const approve = useCallback(async (spenderKey: string, amount: bigint) => {
    const token = addressOf('demoToken')
    const spender = addressOf(spenderKey)
    if (!token || !spender) throw new Error('Demo USDC или целевой контракт ещё не задеплоен.')
    const signer = await wallet.getSigner()
    const contract = new Contract(token, abiFor('demoToken'), signer)
    const transaction = await contract.approve(spender, amount)
    const receipt = await transaction.wait()
    if (!receipt) throw new Error('Approve receipt не получен.')
    return receipt as ContractTransactionReceipt
  }, [addressOf, wallet])

  const liveCount = useMemo(() => Object.values(manifest?.contracts ?? {}).filter((value) => Boolean(recordAddress(value))).length, [manifest])
  const value = useMemo<ContractsContextValue>(() => ({ manifest, loading, error, liveCount, addressOf, isLive, read, execute, approve, reload }), [manifest, loading, error, liveCount, addressOf, isLive, read, execute, approve, reload])
  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>
}

export function useContracts(): ContractsContextValue {
  const context = useContext(ContractsContext)
  if (!context) throw new Error('useContracts must be used inside ContractsProvider')
  return context
}
