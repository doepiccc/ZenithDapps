import { ArrowDownUp, Coins } from 'lucide-react'
import { formatUnits, parseUnits } from 'ethers'
import { useEffect, useState } from 'react'
import { useContracts } from '../../context/ContractsContext'
import { useToast } from '../../context/ToastContext'
import { useWallet } from '../../context/WalletContext'
import { wait } from '../../lib/contracts'
import { Panel, StatusRow, SubmitButton, useAsyncAction } from './shared'

const TOKEN_DECIMALS = 6
const DEMO_RATE = 100 // zUSDC per 1 ZTH when the swap contract is not deployed yet
const SLIPPAGE_BPS = 100n

export function SwapPanel() {
  const contracts = useContracts()
  const wallet = useWallet()
  const { notify } = useToast()
  const action = useAsyncAction()
  const [zthToToken, setZthToToken] = useState(true)
  const [amount, setAmount] = useState('1')
  const [quote, setQuote] = useState<bigint | null>(null)
  const live = contracts.isLive('swap') && contracts.isLive('demoToken')
  const inSymbol = zthToToken ? 'ZTH' : 'zUSDC'
  const outSymbol = zthToToken ? 'zUSDC' : 'ZTH'
  const inDecimals = zthToToken ? 18 : TOKEN_DECIMALS
  const outDecimals = zthToToken ? TOKEN_DECIMALS : 18

  const parsed = (() => {
    try { return amount.trim() ? parseUnits(amount, inDecimals) : 0n } catch { return 0n }
  })()

  useEffect(() => {
    let cancelled = false
    const compute = async () => {
      if (parsed <= 0n) return setQuote(null)
      try {
        if (live) {
          const token = contracts.addressOf('demoToken')
          const result = await contracts.read('swap', zthToToken ? 'quoteZthToToken' : 'quoteTokenToZth', [token, parsed]) as bigint
          if (!cancelled) setQuote(result)
        } else {
          const result = zthToToken
            ? parsed * BigInt(DEMO_RATE) / 10n ** 12n
            : parsed * 10n ** 12n / BigInt(DEMO_RATE)
          if (!cancelled) setQuote(result)
        }
      } catch {
        if (!cancelled) setQuote(null)
      }
    }
    void compute()
    return () => { cancelled = true }
  }, [parsed, zthToToken, live, contracts])

  const swap = async () => {
    if (parsed <= 0n || quote === null || quote <= 0n) return notify('error', 'Проверьте сумму')
    const minOut = quote * (10000n - SLIPPAGE_BPS) / 10000n
    await action.run(async () => {
      if (!live) {
        await wait(900)
        return null
      }
      const token = contracts.addressOf('demoToken')
      if (zthToToken) return contracts.execute('swap', 'swapZthForToken', [token, minOut], { value: parsed })
      await contracts.approve('swap', parsed)
      return contracts.execute('swap', 'swapTokenForZth', [token, parsed, minOut])
    }, 'Обмен выполнен', `${amount} ${inSymbol} → ${quote === null ? '' : formatUnits(quote, outDecimals)} ${outSymbol}`)
    await wallet.refreshBalance?.()
  }

  const rate = zthToToken ? `1 ZTH ≈ ${DEMO_RATE} zUSDC` : `${DEMO_RATE} zUSDC ≈ 1 ZTH`

  return (
    <Panel title="Обменять ZTH" eyebrow="ZENITH SWAP">
      <form className="zenlink-form" onSubmit={(event) => { event.preventDefault(); void swap() }}>
        <label className="field"><span>Отдаёте</span><div className="amount-input"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /><b>{inSymbol}</b></div></label>
        <button className="mini-action" type="button" onClick={() => setZthToToken((value) => !value)} aria-label="Поменять направление"><ArrowDownUp /> Поменять направление</button>
        <StatusRow label="Получите" value={`${quote === null ? '—' : formatUnits(quote, outDecimals)} ${outSymbol}`} accent />
        <StatusRow label="Курс" value={live ? 'On-chain' : rate} />
        <StatusRow label="Проскальзывание" value="до 1%" />
        <SubmitButton busy={action.busy} disabled={quote === null}><Coins /> Обменять</SubmitButton>
      </form>
    </Panel>
  )
}
