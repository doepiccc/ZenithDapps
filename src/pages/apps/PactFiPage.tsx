import { BadgeCheck, CalendarDays, Check, Download, FastForward, Flame, Plus, Trophy, Users } from 'lucide-react'
import { parseUnits } from 'ethers'
import { useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { useToast } from '../../context/ToastContext'
import { eventValue, wait } from '../../lib/contracts'
import { DappShell, HowItWorks, Panel, StatusRow, SubmitButton, TrustNote, useAsyncAction } from './shared'

interface PactState {
  id: bigint
  title: string
  stake: string
  duration: number
  day: number
  checkedDays: number[]
  participants: number
  finalized: boolean
}

export function PactFiPage() {
  const app = APP_BY_ID.pactfi
  const contracts = useContracts()
  const { notify } = useToast()
  const createAction = useAsyncAction()
  const checkAction = useAsyncAction()
  const warpAction = useAsyncAction()
  const [title, setTitle] = useState('Бегать каждое утро')
  const [stake, setStake] = useState('25')
  const [duration, setDuration] = useState('7')
  const [demo, setDemo] = useState(true)
  const [pact, setPact] = useState<PactState | null>(null)

  const create = async () => {
    const days = Number(duration)
    const receipt = await createAction.run(async () => {
      if (!contracts.isLive('pactfi')) { await wait(800); return null }
      const amount = parseUnits(stake, 6)
      await contracts.approve('pactfi', amount)
      return contracts.execute('pactfi', 'createChallenge', [title, contracts.addressOf('demoToken'), amount, days, '0x0000000000000000000000000000000000000000', demo])
    }, 'Pact создан', 'Первый взнос уже находится в prize pool.')
    if (receipt === null && contracts.isLive('pactfi')) return
    const id = receipt ? eventValue<bigint>(receipt, 'pactfi', 'ChallengeCreated', 'challengeId') ?? 1n : BigInt(Date.now())
    setPact({ id, title, stake, duration: days, day: 0, checkedDays: [], participants: 1, finalized: false })
  }

  const checkIn = async () => {
    if (!pact || pact.checkedDays.includes(pact.day)) return
    const result = await checkAction.run(async () => {
      if (!contracts.isLive('pactfi')) { await wait(550); return null }
      return contracts.execute('pactfi', 'checkIn', [pact.id])
    }, 'Check-in записан', `День ${pact.day + 1} подтверждён в Zenith.`)
    if (result === null && contracts.isLive('pactfi')) return
    setPact({ ...pact, checkedDays: [...pact.checkedDays, pact.day] })
  }

  const warp = async () => {
    if (!pact || pact.day >= pact.duration) return
    const result = await warpAction.run(async () => {
      if (!contracts.isLive('pactfi')) { await wait(420); return null }
      return contracts.execute('pactfi', 'demoTimeWarp', [pact.id])
    }, 'Demo-время сдвинуто', '+24 часа к block.timestamp этого Pact.')
    if (result === null && contracts.isLive('pactfi')) return
    setPact({ ...pact, day: Math.min(pact.duration, pact.day + 1) })
  }

  const finalize = async () => {
    if (!pact) return
    const result = await checkAction.run(async () => {
      if (!contracts.isLive('pactfi')) { await wait(600); return null }
      return contracts.execute('pactfi', 'finalize', [pact.id])
    }, 'Pact завершён', 'Победители могут забрать долю пула.')
    if (result === null && contracts.isLive('pactfi')) return
    setPact({ ...pact, finalized: true })
  }

  const shareCard = () => {
    if (!pact) return
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1080
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#0b1015'; context.fillRect(0, 0, 1080, 1080)
    const gradient = context.createLinearGradient(0, 0, 1080, 1080)
    gradient.addColorStop(0, '#ffbd5a'); gradient.addColorStop(1, '#baff4a')
    context.fillStyle = gradient; context.fillRect(70, 70, 940, 12)
    context.fillStyle = '#8e9aaa'; context.font = '600 28px Manrope'; context.fillText('PACTFI / ZENITH TESTNET', 80, 150)
    context.fillStyle = '#ffffff'; context.font = '800 70px Manrope'; context.fillText(pact.title.slice(0, 24), 80, 270)
    context.font = '800 180px Manrope'; context.fillStyle = '#ffbd5a'; context.fillText(`${pact.checkedDays.length}/${pact.duration}`, 80, 520)
    context.fillStyle = '#ffffff'; context.font = '700 34px Manrope'; context.fillText('DAYS COMPLETED', 85, 590)
    context.fillStyle = '#28313c'; context.fillRect(80, 680, 920, 34)
    context.fillStyle = '#ffbd5a'; context.fillRect(80, 680, 920 * pact.checkedDays.length / pact.duration, 34)
    context.fillStyle = '#8e9aaa'; context.font = '500 28px Manrope'; context.fillText(`${pact.stake} zUSDC at stake · zenith.doepic.cc`, 80, 940)
    const link = document.createElement('a'); link.download = 'pactfi-progress.png'; link.href = canvas.toDataURL('image/png'); link.click()
    notify('success', 'Карточка прогресса сохранена')
  }

  const aside = (
    <>
      <Panel title="Механика пула" eyebrow="SOCIAL STAKES">
        <div className="metric-stack"><StatusRow label="Вход" value={`${pact?.stake ?? stake} zUSDC`} /><StatusRow label="Участники" value={pact?.participants ?? 1} /><StatusRow label="Победители" value="100% pool / finishers" accent /></div>
        <TrustNote>Если никто не выполнит цель, контракт возвращает участникам их доли вместо блокировки средств.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Commit', text: 'Участники вносят одинаковую ставку.' },
        { title: 'Check-in', text: 'Одно подтверждение в каждый день challenge.' },
        { title: 'Split', text: 'Финишировавшие делят весь накопленный pool.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      {!pact ? (
        <Panel title="Новый социальный Pact" eyebrow="CREATE CHALLENGE">
          <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void create() }}>
            <label className="field field--wide"><span>Цель</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={96} /><small>Формулировка записывается onchain</small></label>
            <label className="field"><span>Ставка</span><div className="amount-input"><input value={stake} onChange={(event) => setStake(event.target.value)} /><b>zUSDC</b></div></label>
            <label className="field"><span>Продолжительность</span><select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="3">3 дня</option><option value="7">7 дней</option><option value="14">14 дней</option><option value="30">30 дней</option></select></label>
            <label className="switch-row field--wide"><span><FastForward /><div><strong>Demo Time-Warp</strong><small>Разрешить создателю сдвигать время на +24 часа</small></div></span><input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} /></label>
            <SubmitButton busy={createAction.busy}><Plus /> Создать Pact и внести ставку</SubmitButton>
          </form>
        </Panel>
      ) : (
        <>
          <Panel title={pact.title} eyebrow={`ACTIVE PACT / #${pact.id.toString()}`} action={<span className={`challenge-state ${pact.finalized ? 'is-done' : ''}`}><i /> {pact.finalized ? 'FINISHED' : `DAY ${Math.min(pact.day + 1, pact.duration)} / ${pact.duration}`}</span>}>
            <div className="pact-progress-head"><div className="pact-ring" style={{ '--progress': `${pact.checkedDays.length / pact.duration * 360}deg` } as React.CSSProperties}><span><b>{pact.checkedDays.length}</b><small>из {pact.duration}</small></span></div><div><span className="streak"><Flame /> CURRENT STREAK</span><h3>{pact.checkedDays.length} {pact.checkedDays.length === 1 ? 'день' : 'дней'}</h3><p>{pact.day < pact.duration ? 'Сделайте check-in до следующего дневного окна.' : 'Период завершён — рассчитайте пул.'}</p></div></div>
            <div className="day-track">{Array.from({ length: pact.duration }, (_, day) => <span className={`${pact.checkedDays.includes(day) ? 'is-checked' : ''} ${day === pact.day ? 'is-current' : ''}`} key={day}>{pact.checkedDays.includes(day) ? <Check /> : day + 1}</span>)}</div>
            <div className="pact-actions">
              {pact.day < pact.duration && <form onSubmit={(event) => { event.preventDefault(); void checkIn() }}><SubmitButton busy={checkAction.busy} disabled={pact.checkedDays.includes(pact.day)}><BadgeCheck /> {pact.checkedDays.includes(pact.day) ? 'Сегодня выполнено' : 'Check-in сегодня'}</SubmitButton></form>}
              {demo && pact.day < pact.duration && <button className="button button--ghost" type="button" onClick={() => void warp()} disabled={warpAction.busy}><FastForward /> +24 часа</button>}
              {pact.day >= pact.duration && !pact.finalized && <button className="button button--primary" type="button" onClick={() => void finalize()}><Trophy /> Рассчитать победителей</button>}
              <button className="button button--ghost" type="button" onClick={shareCard}><Download /> Share card</button>
            </div>
          </Panel>
          <div className="pact-mini-grid"><article><Users /><div><strong>{pact.participants}</strong><span>участник</span></div></article><article><CalendarDays /><div><strong>{pact.duration * 24}h</strong><span>challenge window</span></div></article><article><Trophy /><div><strong>{Number(pact.stake) * pact.participants}</strong><span>zUSDC pool</span></div></article></div>
        </>
      )}
    </DappShell>
  )
}
