import { ArrowDownToLine, ArrowUpRight, BarChart3, Gauge, Landmark, RefreshCw, TrendingUp, Zap } from 'lucide-react'
import { formatUnits, parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { useWallet } from '../../context/WalletContext'
import { eventValue, wait } from '../../lib/contracts'
import { DappShell, HowItWorks, Panel, StatusRow, SubmitButton, TrustNote, useAsyncAction } from './shared'

interface Position { principal: number; depositedAt: number; shares: bigint }

export function MicroRetailPage() {
  const app = APP_BY_ID.microretail
  const contracts = useContracts()
  const wallet = useWallet()
  const depositAction = useAsyncAction()
  const redeemAction = useAsyncAction()
  const [amount, setAmount] = useState('250')
  const [position, setPosition] = useState<Position | null>(null)
  const [demoRate, setDemoRate] = useState(true)
  const [tick, setTick] = useState(Date.now())
  const [calculator, setCalculator] = useState('1000')

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [])

  const accrued = useMemo(() => {
    if (!position) return 0
    const seconds = Math.max(0, (tick - position.depositedAt) / 1000)
    const annualRate = demoRate ? 0.01 / 60 * 31_536_000 : 0.15
    return position.principal * annualRate * seconds / 31_536_000
  }, [position, tick, demoRate])
  const balance = (position?.principal ?? 0) + accrued
  const projected = Number(calculator || 0) * 1.15

  const deposit = async () => {
    const principal = Number(amount)
    if (!Number.isFinite(principal) || principal <= 0) return
    let shares = parseUnits(amount, 6)
    const receipt = await depositAction.run(async () => {
      if (!contracts.isLive('microretail')) { await wait(800); return null }
      const account = wallet.account ?? await (await wallet.getSigner()).getAddress()
      const assets = parseUnits(amount, 6)
      await contracts.approve('microretail', assets)
      return contracts.execute('microretail', 'deposit', [assets, account])
    }, 'Депозит принят', 'zTBILL shares начислены в этом же блоке.')
    if (receipt === null && contracts.isLive('microretail')) return
    if (receipt) shares = eventValue<bigint>(receipt, 'microretail', 'Deposit', 'shares') ?? shares
    setPosition({ principal, depositedAt: Date.now(), shares })
  }

  const redeem = async () => {
    if (!position) return
    const result = await redeemAction.run(async () => {
      if (!contracts.isLive('microretail')) { await wait(750); return null }
      const account = wallet.account ?? await (await wallet.getSigner()).getAddress()
      return contracts.execute('microretail', 'redeem', [position.shares, account, account])
    }, 'Средства выведены', `${balance.toFixed(4)} zUSDC возвращены без lock-up.`)
    if (result === null && contracts.isLive('microretail')) return
    setPosition(null)
  }

  const aside = (
    <>
      <Panel title="Параметры vault" eyebrow="ERC-4626 STYLE">
        <div className="metric-stack"><StatusRow label="Базовая доходность" value="15% APY" /><StatusRow label="Demo acceleration" value="1% / minute" accent /><StatusRow label="Lock-up" value="Нет" /><StatusRow label="Underlying" value="zUSDC" /></div>
        <TrustNote>Доход синтетический и существует только в testnet. Mock vault не является инвестиционным продуктом.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Deposit', text: 'zUSDC конвертируются в доли zTBILL.' },
        { title: 'Accrue', text: 'Share price растёт с каждой секундой.' },
        { title: 'Redeem', text: 'Vault минтит demo-yield и возвращает актив.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      <Panel title="Мой Micro T-Bond" eyebrow="LIVE SAVINGS ACCOUNT" action={<label className="mode-toggle"><span>NORMAL</span><input type="checkbox" checked={demoRate} onChange={(event) => setDemoRate(event.target.checked)} /><span>DEMO ×</span></label>}>
        <div className="yield-display">
          <span className="yield-display__icon"><Landmark /></span>
          <span className="yield-display__label"><i /> BALANCE ACCRUING</span>
          <div className="yield-display__value"><small>$</small><strong>{balance.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</strong><span>zUSDC</span></div>
          <div className="yield-display__earned"><TrendingUp /> +{accrued.toFixed(7)} earned {position ? 'since deposit' : '— deposit to start'}</div>
          <svg viewBox="0 0 720 120" preserveAspectRatio="none" className="yield-chart" aria-hidden="true"><defs><linearGradient id="yield-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#73f0c3" stopOpacity=".35"/><stop offset="1" stopColor="#73f0c3" stopOpacity="0"/></linearGradient></defs><path d="M0 105 C90 101 145 95 210 89 S330 76 390 67 S510 55 570 38 S660 24 720 8 L720 120 L0 120Z" fill="url(#yield-fill)"/><path d="M0 105 C90 101 145 95 210 89 S330 76 390 67 S510 55 570 38 S660 24 720 8" fill="none" stroke="#73f0c3" strokeWidth="3"/></svg>
        </div>
        {!position ? (
          <form className="deposit-bar" onSubmit={(event) => { event.preventDefault(); void deposit() }}><label><span>Сумма депозита</span><div className="amount-input"><input value={amount} onChange={(event) => setAmount(event.target.value)} /><b>zUSDC</b></div></label><SubmitButton busy={depositAction.busy}><ArrowDownToLine /> Deposit</SubmitButton></form>
        ) : (
          <div className="position-actions"><div><span>YOUR SHARES</span><strong>{Number(formatUnits(position.shares, 6)).toFixed(4)} zTBILL</strong></div><div><span>SHARE PRICE</span><strong>${(balance / Math.max(Number(formatUnits(position.shares, 6)), 0.000001)).toFixed(6)}</strong></div><button className="button button--ghost" type="button" onClick={() => void redeem()} disabled={redeemAction.busy}><ArrowUpRight /> Redeem all</button></div>
        )}
      </Panel>

      <div className="rwa-grid">
        <Panel title="Калькулятор" eyebrow="12 MONTH PROJECTION" className="calculator-card">
          <label className="field"><span>Если вложить сегодня</span><div className="amount-input"><input value={calculator} onChange={(event) => setCalculator(event.target.value)} /><b>zUSDC</b></div></label>
          <div className="projection"><span>Через 12 месяцев</span><strong>${projected.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong><small>при 15% simple APY</small></div>
        </Panel>
        <div className="rwa-stat-cards"><article><Gauge /><span><b>1 sec</b><small>accrual resolution</small></span></article><article><Zap /><span><b>Instant</b><small>liquidity</small></span></article><article><BarChart3 /><span><b>Onchain</b><small>share price</small></span></article><article><RefreshCw /><span><b>24 / 7</b><small>redemption</small></span></article></div>
      </div>
    </DappShell>
  )
}
