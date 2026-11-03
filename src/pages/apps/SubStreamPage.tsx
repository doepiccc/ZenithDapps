import { Check, Cloud, Gamepad2, Headphones, Lock, Pause, Play, Radio, TimerReset, Wifi } from 'lucide-react'
import { parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { eventValue, wait } from '../../lib/contracts'
import { DappShell, HowItWorks, Panel, StatusRow, SubmitButton, TrustNote, useAsyncAction } from './shared'

const TREASURY = '0x3333333333333333333333333333333333333333'
const services = [
  { id: 'vpn', name: 'Ghostline VPN', description: 'Private tunnel · 12 regions', priceMinute: 0.06, icon: Wifi, color: '#73f0c3', content: 'VPN SESSION / NL-03 / 42ms' },
  { id: 'music', name: 'Pulse Music', description: 'Lossless indie radio', priceMinute: 0.04, icon: Headphones, color: '#9e86ff', content: 'NOW PLAYING / ORBITAL SUNSET' },
  { id: 'cloud', name: 'Nimbus Cloud', description: 'Encrypted 25 GB workspace', priceMinute: 0.08, icon: Cloud, color: '#54d6ff', content: 'VAULT UNLOCKED / 2.4 GB USED' },
  { id: 'arcade', name: 'Zen Arcade', description: 'Token-gated mini game', priceMinute: 0.1, icon: Gamepad2, color: '#ffbd5a', content: 'SCORE 004280 / COMBO ×12' },
]

interface ActiveStream { id: bigint; service: typeof services[number]; deposit: number; startedAt: number; stoppedAt?: number; cancelled: boolean }

export function SubStreamPage() {
  const app = APP_BY_ID.substream
  const contracts = useContracts()
  const createAction = useAsyncAction()
  const cancelAction = useAsyncAction()
  const [selected, setSelected] = useState(services[0])
  const [deposit, setDeposit] = useState('10')
  const [stream, setStream] = useState<ActiveStream | null>(null)
  const [tick, setTick] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const spent = useMemo(() => {
    if (!stream) return 0
    const elapsed = ((stream.stoppedAt ?? tick) - stream.startedAt) / 1000
    return Math.min(stream.deposit, elapsed * stream.service.priceMinute / 60)
  }, [stream, tick])
  const remaining = Math.max(0, (stream?.deposit ?? 0) - spent)
  const active = Boolean(stream && !stream.cancelled && remaining > 0)

  const start = async () => {
    const value = Number(deposit)
    if (!Number.isFinite(value) || value <= 0) return
    let streamId = BigInt(Date.now())
    const receipt = await createAction.run(async () => {
      if (!contracts.isLive('substream')) { await wait(700); return null }
      const units = parseUnits(deposit, 6)
      const rate = BigInt(Math.max(1, Math.floor(selected.priceMinute * 1_000_000 / 60)))
      await contracts.approve('substream', units)
      return contracts.execute('substream', 'createStream', [TREASURY, contracts.addressOf('demoToken'), units, rate, `0x${new TextEncoder().encode(selected.id).reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '').padEnd(64, '0')}`])
    }, 'Поток запущен', `${selected.name} разблокирован мгновенно.`)
    if (receipt === null && contracts.isLive('substream')) return
    if (receipt) streamId = eventValue<bigint>(receipt, 'substream', 'StreamOpened', 'streamId') ?? streamId
    setStream({ id: streamId, service: selected, deposit: value, startedAt: Date.now(), cancelled: false })
  }

  const cancel = async () => {
    if (!stream) return
    const result = await cancelAction.run(async () => {
      if (!contracts.isLive('substream')) { await wait(500); return null }
      return contracts.execute('substream', 'cancel', [stream.id])
    }, 'Поток остановлен', `${remaining.toFixed(4)} zUSDC возвращаются плательщику.`)
    if (result === null && contracts.isLive('substream')) return
    setStream({ ...stream, stoppedAt: Date.now(), cancelled: true })
  }

  const aside = (
    <>
      <Panel title="Активный поток" eyebrow="STREAM TELEMETRY">
        <div className={`stream-orb ${active ? 'is-active' : ''}`}><span>{active ? <Play /> : <Pause />}</span><b>{active ? 'LIVE' : 'IDLE'}</b><small>{stream ? `#${stream.id.toString().slice(-6)}` : 'no stream'}</small></div>
        <div className="metric-stack"><StatusRow label="Осталось" value={`${remaining.toFixed(4)} zUSDC`} accent /><StatusRow label="Потрачено" value={`${spent.toFixed(4)} zUSDC`} /><StatusRow label="Rate" value={stream ? `${stream.service.priceMinute.toFixed(2)} / min` : '—'} /></div>
        {active && <button className="button button--danger button--full" type="button" onClick={() => void cancel()} disabled={cancelAction.busy}><Pause /> Остановить и вернуть остаток</button>}
        <TrustNote>Cancel рассчитывает unlocked amount по block.timestamp. Сервис не может списать больше депозита.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Fund', text: 'Вы задаёте максимальный депозит.' },
        { title: 'Stream', text: 'Payee получает rate × seconds.' },
        { title: 'Cancel', text: 'Неиспользованный остаток возвращается сразу.' },
      ]} />
    </>
  )

  const SelectedIcon = selected.icon

  return (
    <DappShell app={app} aside={aside}>
      <Panel title="Сервисы с честной поминутной оплатой" eyebrow="SERVICE CATALOG">
        <div className="service-grid">
          {services.map((service) => {
            const Icon = service.icon
            const isSelected = selected.id === service.id
            return <button className={`service-card ${isSelected ? 'is-selected' : ''}`} style={{ '--service-color': service.color } as React.CSSProperties} type="button" onClick={() => setSelected(service)} key={service.id}><span><Icon /></span>{isSelected && <i><Check /></i>}<strong>{service.name}</strong><p>{service.description}</p><b>{service.priceMinute.toFixed(2)} <small>zUSDC / min</small></b></button>
          })}
        </div>
      </Panel>

      <Panel title={active ? `${stream?.service.name} открыт` : 'Настройте депозит'} eyebrow={active ? 'TOKEN-GATED CONTENT' : 'START A STREAM'} className="stream-control-panel">
        {active ? (
          <div className="unlocked-content">
            <div className="unlocked-content__screen"><span className="scan-line" /><div><Radio /><small>ACCESS VERIFIED ONCHAIN</small><strong>{stream?.service.content}</strong><p>Этот раздел заблокируется сразу после cancel.</p></div></div>
            <div className="stream-progress"><span style={{ width: `${Math.min(100, spent / (stream?.deposit ?? 1) * 100)}%` }} /><i /></div>
          </div>
        ) : stream?.cancelled ? (
          <div className="locked-content"><span><Lock /></span><div><strong>Доступ остановлен</strong><p>Поток закрыт, остаток возвращён. Выберите сервис, чтобы запустить новый.</p></div><button className="button button--ghost" type="button" onClick={() => setStream(null)}><TimerReset /> Новый поток</button></div>
        ) : (
          <form className="stream-start-form" onSubmit={(event) => { event.preventDefault(); void start() }}>
            <div className="selected-service"><span style={{ '--service-color': selected.color } as React.CSSProperties}><SelectedIcon /></span><div><strong>{selected.name}</strong><p>{selected.description}</p></div><b>{selected.priceMinute.toFixed(2)} / min</b></div>
            <label className="field"><span>Максимальный депозит</span><div className="amount-input"><input value={deposit} onChange={(event) => setDeposit(event.target.value)} /><b>zUSDC</b></div><small>Примерно {Math.floor(Number(deposit || 0) / selected.priceMinute)} минут доступа</small></label>
            <SubmitButton busy={createAction.busy}><Play /> Запустить поток</SubmitButton>
          </form>
        )}
      </Panel>
    </DappShell>
  )
}
