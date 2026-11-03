import { ArrowDown, ArrowUp, Gift, History, Radio, RefreshCw, Timer, TrendingDown, TrendingUp, Trophy, Zap } from 'lucide-react'
import { parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { eventValue, wait } from '../../lib/contracts'
import { DappShell, HowItWorks, Panel, StatusRow, TrustNote, useAsyncAction } from './shared'

type Side = 'up' | 'down'
interface BetState { roundId: bigint; side: Side; amount: number; startPrice: number; result?: 'won' | 'lost' }

function chartPath(points: number[]) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = Math.max(1, max - min)
  return points.map((point, index) => `${index ? 'L' : 'M'}${index / (points.length - 1) * 700},${130 - (point - min) / range * 115}`).join(' ')
}

export function FlashPredictPage() {
  const app = APP_BY_ID.flashpredict
  const contracts = useContracts()
  const betAction = useAsyncAction()
  const roundAction = useAsyncAction()
  const faucetAction = useAsyncAction()
  const [price, setPrice] = useState(65_042.18)
  const [points, setPoints] = useState<number[]>([64920, 64980, 64962, 65010, 64996, 65042])
  const [roundStarted, setRoundStarted] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const [amount, setAmount] = useState('10')
  const [bet, setBet] = useState<BetState | null>(null)
  const [history, setHistory] = useState<Array<{ id: number; result: Side; change: number }>>([])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
      setPrice((current) => {
        const next = Math.max(1, current + (Math.random() - 0.48) * 36)
        setPoints((values) => [...values.slice(-19), next])
        return next
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = Math.max(0, 120 - Math.floor((now - roundStarted) / 1000))
  const movement = price - points[0]
  const poolUp = 1240 + (bet?.side === 'up' ? bet.amount : 0)
  const poolDown = 980 + (bet?.side === 'down' ? bet.amount : 0)
  const total = poolUp + poolDown
  const path = useMemo(() => chartPath(points), [points])

  const faucet = async () => {
    await faucetAction.run(async () => {
      if (!contracts.isLive('demoToken')) { await wait(450); return null }
      return contracts.execute('demoToken', 'faucet')
    }, '1 000 test chips получено')
  }

  const placeBet = async (side: Side) => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    let roundId = BigInt(Date.now())
    const receipt = await betAction.run(async () => {
      if (!contracts.isLive('flashpredict')) { await wait(650); return null }
      const units = parseUnits(amount, 6)
      await contracts.approve('flashpredict', units)
      return contracts.execute('flashpredict', 'bet', [side === 'up', units])
    }, `Ставка: ${side === 'up' ? 'ВЫШЕ' : 'НИЖЕ'}`, `${amount} zUSDC добавлены в pari-mutuel pool.`)
    if (receipt === null && contracts.isLive('flashpredict')) return
    if (receipt) roundId = eventValue<bigint>(receipt, 'flashpredict', 'BetPlaced', 'roundId') ?? roundId
    setBet({ roundId, side, amount: value, startPrice: price })
  }

  const settleRound = async () => {
    const oldStart = bet?.startPrice ?? points[0]
    const side: Side = price >= oldStart ? 'up' : 'down'
    const result = await roundAction.run(async () => {
      if (!contracts.isLive('flashpredict')) { await wait(600); return null }
      return contracts.execute('flashpredict', 'rollRound')
    }, 'Раунд рассчитан', `BTC ${side === 'up' ? 'выше' : 'ниже'} стартовой цены.`)
    if (result === null && contracts.isLive('flashpredict')) return
    setHistory((items) => [{ id: history.length + 1, result: side, change: price - oldStart }, ...items].slice(0, 4))
    if (bet) setBet({ ...bet, result: bet.side === side ? 'won' : 'lost' })
    setRoundStarted(Date.now())
  }

  const aside = (
    <>
      <Panel title="Round liquidity" eyebrow="PARIMUTUEL POOL">
        <div className="pool-split"><div className="up" style={{ width: `${poolUp / total * 100}%` }}><span>UP</span><b>{(poolUp / total * 100).toFixed(0)}%</b></div><div className="down" style={{ width: `${poolDown / total * 100}%` }}><span>DOWN</span><b>{(poolDown / total * 100).toFixed(0)}%</b></div></div>
        <div className="metric-stack"><StatusRow label="Выше pool" value={`${poolUp.toFixed(0)} zUSDC`} /><StatusRow label="Ниже pool" value={`${poolDown.toFixed(0)} zUSDC`} /><StatusRow label="Total" value={`${total.toFixed(0)} zUSDC`} accent /></div>
        <button className="button button--ghost button--full" type="button" onClick={() => void faucet()} disabled={faucetAction.busy}><Gift /> Получить test chips</button>
        <TrustNote>Биржевой график служит визуализацией. Финальный result берётся только из DemoPriceOracle в контракте.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Open', text: 'Oracle price фиксируется в начале раунда.' },
        { title: 'Bet', text: 'UP и DOWN формируют общий pool.' },
        { title: 'Settle', text: 'Победители пропорционально делят проигравшую сторону.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      <Panel title="BTC / USD · 2 minute market" eyebrow="FLASH ROUND" action={<div className={`round-timer ${remaining < 20 ? 'is-ending' : ''}`}><Timer /><span><small>ENDS IN</small><b>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</b></span></div>}>
        <div className="market-price"><div><span>ORACLE PRICE <i><Radio /></i></span><strong>${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small className={movement >= 0 ? 'positive' : 'negative'}>{movement >= 0 ? <TrendingUp /> : <TrendingDown />}{movement >= 0 ? '+' : ''}{movement.toFixed(2)} this round</small></div><span className="live-price"><i /> LIVE</span></div>
        <div className="price-chart"><svg viewBox="0 0 700 145" preserveAspectRatio="none"><defs><linearGradient id="price-area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ff5e9a" stopOpacity=".28"/><stop offset="1" stopColor="#ff5e9a" stopOpacity="0"/></linearGradient></defs><path d={`${path} L700,145 L0,145Z`} fill="url(#price-area)"/><path d={path} fill="none" stroke="#ff5e9a" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><span className="chart-line"><i /> START ${points[0].toFixed(0)}</span></div>
        {!bet || bet.result ? (
          <div className="bet-zone">
            {bet?.result && <div className={`round-result round-result--${bet.result}`}>{bet.result === 'won' ? <Trophy /> : <RefreshCw />}<div><strong>{bet.result === 'won' ? 'Прогноз выиграл' : 'Раунд завершён'}</strong><p>{bet.result === 'won' ? `Ожидаемая выплата ≈ ${(bet.amount * 1.79).toFixed(2)} zUSDC` : 'Попробуйте следующий двухминутный рынок.'}</p></div></div>}
            <label className="bet-amount"><span>Сумма прогноза</span><div className="amount-input"><input value={amount} onChange={(event) => setAmount(event.target.value)} /><b>zUSDC</b></div></label>
            <div className="bet-buttons"><button className="bet-button bet-button--up" type="button" onClick={() => void placeBet('up')} disabled={betAction.busy || remaining === 0}><span><ArrowUp /></span><div><small>BTC WILL BE</small><strong>ВЫШЕ</strong><b>×{(total / poolUp).toFixed(2)}</b></div></button><button className="bet-button bet-button--down" type="button" onClick={() => void placeBet('down')} disabled={betAction.busy || remaining === 0}><span><ArrowDown /></span><div><small>BTC WILL BE</small><strong>НИЖЕ</strong><b>×{(total / poolDown).toFixed(2)}</b></div></button></div>
          </div>
        ) : (
          <div className={`placed-bet placed-bet--${bet.side}`}><span>{bet.side === 'up' ? <ArrowUp /> : <ArrowDown />}</span><div><small>YOUR POSITION</small><strong>{bet.side === 'up' ? 'ВЫШЕ' : 'НИЖЕ'} · {bet.amount} zUSDC</strong><p>Entry price ${bet.startPrice.toFixed(2)}</p></div><i><Zap /> LOCKED</i></div>
        )}
        {remaining === 0 && <button className="button button--primary button--full" type="button" onClick={() => void settleRound()} disabled={roundAction.busy}><RefreshCw /> Закрыть раунд и открыть следующий</button>}
      </Panel>
      <Panel title="Последние раунды" eyebrow="MARKET HISTORY" action={<History />} className="history-panel">
        {history.length ? <div className="round-history">{history.map((item) => <div key={item.id}><span>#{String(item.id).padStart(3, '0')}</span><b className={item.result}>{item.result === 'up' ? <ArrowUp /> : <ArrowDown />}{item.result.toUpperCase()}</b><small>{item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} USD</small></div>)}</div> : <p className="muted-copy">Завершённые раунды появятся здесь после первого settlement.</p>}
      </Panel>
    </DappShell>
  )
}
