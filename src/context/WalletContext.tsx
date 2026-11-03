import {
  BrowserProvider,
  formatEther,
  type Eip1193Provider,
  type JsonRpcSigner,
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
import { publicProvider, ZENITH_NETWORK, WALLET_CHAIN } from '../lib/network'

interface WalletContextValue {
  available: boolean
  account: string | null
  chainId: number | null
  balance: string | null
  connecting: boolean
  changingNetwork: boolean
  correctNetwork: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchToZenith: () => Promise<void>
  getSigner: () => Promise<JsonRpcSigner>
  refreshBalance: () => Promise<void>
}

type EventfulProvider = Eip1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

function injected(): EventfulProvider | null {
  return (window.ethereum as EventfulProvider | undefined) ?? null
}

function parseChain(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, value.startsWith('0x') ? 16 : 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

async function currentChain(provider: Eip1193Provider): Promise<number | null> {
  return parseChain(await provider.request({ method: 'eth_chainId' }))
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [changingNetwork, setChangingNetwork] = useState(false)
  const available = Boolean(injected())

  const refreshBalance = useCallback(async () => {
    if (!account) return setBalance(null)
    try {
      setBalance(formatEther(await publicProvider.getBalance(account)))
    } catch {
      setBalance(null)
    }
  }, [account])

  const switchToZenith = useCallback(async () => {
    const provider = injected()
    if (!provider) throw new Error('Установите MetaMask или другой EIP-1193 кошелёк.')
    setChangingNetwork(true)
    try {
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ZENITH_NETWORK.chainIdHex }] })
      } catch (error) {
        const code = (error as { code?: number }).code
        if (code !== 4902) throw error
        await provider.request({ method: 'wallet_addEthereumChain', params: [WALLET_CHAIN] })
      }
      setChainId(await currentChain(provider))
    } finally {
      setChangingNetwork(false)
    }
  }, [])

  const connect = useCallback(async () => {
    const provider = injected()
    if (!provider) throw new Error('В браузере не найден EVM-кошелёк.')
    setConnecting(true)
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
      if (!accounts[0]) throw new Error('Кошелёк не вернул аккаунт.')
      setAccount(accounts[0])
      const nextChain = await currentChain(provider)
      setChainId(nextChain)
      if (nextChain !== ZENITH_NETWORK.chainId) await switchToZenith()
    } finally {
      setConnecting(false)
    }
  }, [switchToZenith])

  const disconnect = useCallback(() => {
    setAccount(null)
    setBalance(null)
  }, [])

  const getSigner = useCallback(async () => {
    const provider = injected()
    if (!provider) throw new Error('В браузере не найден EVM-кошелёк.')
    if (!account) await connect()
    if (await currentChain(provider) !== ZENITH_NETWORK.chainId) await switchToZenith()
    return new BrowserProvider(provider).getSigner()
  }, [account, connect, switchToZenith])

  useEffect(() => {
    const provider = injected()
    if (!provider) return
    void Promise.all([
      provider.request({ method: 'eth_accounts' }),
      provider.request({ method: 'eth_chainId' }),
    ]).then(([accounts, chain]) => {
      setAccount((accounts as string[])[0] ?? null)
      setChainId(parseChain(chain))
    }).catch(() => undefined)
    const onAccounts = (...args: unknown[]) => setAccount((args[0] as string[])[0] ?? null)
    const onChain = (...args: unknown[]) => setChainId(parseChain(args[0]))
    provider.on?.('accountsChanged', onAccounts)
    provider.on?.('chainChanged', onChain)
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts)
      provider.removeListener?.('chainChanged', onChain)
    }
  }, [])

  useEffect(() => { void refreshBalance() }, [refreshBalance])

  const value = useMemo<WalletContextValue>(() => ({
    available,
    account,
    chainId,
    balance,
    connecting,
    changingNetwork,
    correctNetwork: chainId === ZENITH_NETWORK.chainId,
    connect,
    disconnect,
    switchToZenith,
    getSigner,
    refreshBalance,
  }), [available, account, chainId, balance, connecting, changingNetwork, connect, disconnect, switchToZenith, getSigner, refreshBalance])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used inside WalletProvider')
  return context
}
