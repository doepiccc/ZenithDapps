import { Bot, Check, ChevronRight, Clock3, FileCheck2, Handshake, LockKeyhole, PackageCheck, ShieldCheck, UserRound, WalletCards } from 'lucide-react'
import { id, parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { eventValue, wait } from '../../lib/contracts'
import { shortAddress } from '../../lib/network'
import { DappShell, HowItWorks, Panel, StatusRow, SubmitButton, TrustNote, useAsyncAction } from './shared'

interface DealState { id: bigint; createdAt: number; buyerConfirmed: boolean; complete: boolean; bot: boolean }

export function SafeDealPage() {
  const app = APP_BY_ID.safedeal
  const contracts = useContracts()
  const createAction = useAsyncAction()
  const confirmAction = useAsyncAction()
  const completeAction = useAsyncAction()
  const [step, setStep] = useState(1)
  const [terms, setTerms] = useState('Дизайн лендинга: Figma source + desktop/mobile layouts. Срок: 5 дней.')
  const [seller, setSeller] = useState('0x4444444444444444444444444444444444444444')
  const [price, setPrice] = useState('100')
  const [bot, setBot] = useState(true)
  const [deal, setDeal] = useState<DealState | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])

  const collateral = Number(price || 0) * 0.2
  const buyerLocks = Number(price || 0) + collateral
  const botWait = deal ? Math.max(0, 10 - Math.floor((now - deal.createdAt) / 1000)) : 10
  const termsHash = useMemo(() => id(terms), [terms])

  const create = async () => {
    let dealId = BigInt(Date.now())
    const receipt = await createAction.run(async () => {
      if (!contracts.isLive('safedeal')) { await wait(850); return null }
      const locked = parseUnits(buyerLocks.toFixed(6), 6)
      await contracts.approve('safedeal', locked)
      return contracts.execute('safedeal', 'createDeal', [seller, contracts.addressOf('demoToken'), parseUnits(price, 6), termsHash, bot])
    }, 'Сделка создана', `${buyerLocks.toFixed(2)} zUSDC заблокированы в dual-deposit escrow.`)
    if (receipt === null && contracts.isLive('safedeal')) return
    if (receipt) dealId = eventValue<bigint>(receipt, 'safedeal', 'DealCreated', 'dealId') ?? dealId
    setDeal({ id: dealId, createdAt: Date.now(), buyerConfirmed: false, complete: false, bot })
  }

  const confirm = async () => {
    if (!deal) return
    const result = await confirmAction.run(async () => {
      if (!contracts.isLive('safedeal')) { await wait(500); return null }
      return contracts.execute('safedeal', 'confirm', [deal.id])
    }, 'Получение подтверждено', 'Ваш buyer collateral будет возвращён при завершении.')
    if (result === null && contracts.isLive('safedeal')) return
    setDeal({ ...deal, buyerConfirmed: true })
  }

  const finish = async () => {
    if (!deal) return
    const result = await completeAction.run(async () => {
      if (!contracts.isLive('safedeal')) { await wait(650); return null }
      return contracts.execute('safedeal', 'complete', [deal.id])
    }, 'Сделка завершена', 'Цена выплачена продавцу, оба залога возвращены.')
    if (result === null && contracts.isLive('safedeal')) return
    setDeal({ ...deal, complete: true })
  }

  const aside = (
    <>
      <Panel title="Экономика сделки" eyebrow="DUAL DEPOSIT">
        <div className="escrow-math"><div><span>ПОКУПАТЕЛЬ</span><b>{buyerLocks.toFixed(2)}</b><small>price + 20%</small></div><i><Handshake /></i><div><span>ПРОДАВЕЦ</span><b>{collateral.toFixed(2)}</b><small>20% collateral</small></div></div>
        <div className="metric-stack"><StatusRow label="Цена" value={`${Number(price || 0).toFixed(2)} zUSDC`} /><StatusRow label="Залог каждой стороны" value={`${collateral.toFixed(2)} zUSDC`} accent /><StatusRow label="Арбитр" value="Не нужен" /></div>
        <TrustNote>Ни одной стороне невыгодно блокировать сделку: её собственный залог останется в контракте вместе с деньгами второй стороны.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Lock', text: 'Покупатель и продавец вносят collateral.' },
        { title: 'Deliver', text: 'Условия закреплены хешем в calldata.' },
        { title: 'Confirm', text: 'Два подтверждения атомарно закрывают сделку.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      {!deal ? (
        <Panel title="Создать безопасную сделку" eyebrow="ESCROW WIZARD">
          <div className="wizard-steps"><span className={step >= 1 ? 'is-active' : ''}><i>1</i> Условия</span><b /><span className={step >= 2 ? 'is-active' : ''}><i>2</i> Стороны</span><b /><span className={step >= 3 ? 'is-active' : ''}><i>3</i> Проверка</span></div>
          {step === 1 && <div className="wizard-pane"><span className="wizard-icon"><FileCheck2 /></span><h3>Что должно быть передано?</h3><p>Подробное описание не хранится открытым текстом: контракт получает только cryptographic hash.</p><label className="field"><span>Условия сделки</span><textarea value={terms} onChange={(event) => setTerms(event.target.value)} rows={5} /><small>{terms.length}/500 · hash {shortAddress(termsHash, 12, 8)}</small></label><button className="button button--primary" type="button" onClick={() => setStep(2)}>Продолжить <ChevronRight /></button></div>}
          {step === 2 && <div className="wizard-pane"><span className="wizard-icon"><UserRound /></span><h3>Цена и вторая сторона</h3><div className="form-grid"><label className="field"><span>Цена</span><div className="amount-input"><input value={price} onChange={(event) => setPrice(event.target.value)} /><b>zUSDC</b></div></label><label className="field"><span>Адрес продавца</span><input value={seller} onChange={(event) => setSeller(event.target.value)} disabled={bot} /></label><label className="switch-row field--wide"><span><Bot /><div><strong>Симуляция второй стороны</strong><small>Testnet bot внесёт залог и подтвердит через 10 секунд</small></div></span><input type="checkbox" checked={bot} onChange={(event) => setBot(event.target.checked)} /></label></div><div className="wizard-nav"><button className="button button--ghost" type="button" onClick={() => setStep(1)}>Назад</button><button className="button button--primary" type="button" onClick={() => setStep(3)}>Проверить <ChevronRight /></button></div></div>}
          {step === 3 && <div className="wizard-pane review-pane"><span className="wizard-icon"><ShieldCheck /></span><h3>Проверьте escrow</h3><div className="review-grid"><StatusRow label="Предмет" value={terms.slice(0, 54)} /><StatusRow label="Продавец" value={bot ? 'SafeDeal demo bot' : shortAddress(seller)} /><StatusRow label="Цена" value={`${price} zUSDC`} /><StatusRow label="Ваш collateral" value={`${collateral.toFixed(2)} zUSDC`} accent /><StatusRow label="Всего блокируется" value={`${buyerLocks.toFixed(2)} zUSDC`} /></div><form onSubmit={(event) => { event.preventDefault(); void create() }}><SubmitButton busy={createAction.busy}><LockKeyhole /> Создать и заблокировать {buyerLocks.toFixed(2)}</SubmitButton></form><button className="text-button" type="button" onClick={() => setStep(2)}>Изменить параметры</button></div>}
        </Panel>
      ) : (
        <Panel title={`Сделка #${deal.id.toString().slice(-8)}`} eyebrow="ESCROW STATUS" action={<span className={`challenge-state ${deal.complete ? 'is-done' : ''}`}><i /> {deal.complete ? 'COMPLETED' : 'IN PROGRESS'}</span>}>
          <div className="deal-timeline">
            <div className="is-done"><span><WalletCards /></span><div><strong>Деньги заблокированы</strong><p>{buyerLocks.toFixed(2)} zUSDC · buyer deposit</p></div><i><Check /></i></div>
            <div className="is-done"><span>{deal.bot ? <Bot /> : <UserRound />}</span><div><strong>Продавец внёс залог</strong><p>{deal.bot ? 'Demo bot funded automatically' : `${collateral.toFixed(2)} zUSDC`}</p></div><i><Check /></i></div>
            <div className={deal.bot && botWait === 0 ? 'is-done' : 'is-current'}><span><PackageCheck /></span><div><strong>Товар / работа отправлены</strong><p>{deal.bot ? (botWait > 0 ? `Bot confirms in ${botWait}s` : 'Bot confirmed delivery') : 'Waiting for seller'}</p></div>{deal.bot && botWait === 0 ? <i><Check /></i> : <i><Clock3 /></i>}</div>
            <div className={deal.buyerConfirmed ? 'is-done' : 'is-current'}><span><Handshake /></span><div><strong>Подтверждение покупателя</strong><p>{deal.buyerConfirmed ? 'Вы подтвердили получение' : 'Проверьте результат перед подтверждением'}</p></div>{deal.buyerConfirmed ? <i><Check /></i> : null}</div>
          </div>
          <div className="deal-actions">
            {!deal.buyerConfirmed && <button className="button button--primary" type="button" onClick={() => void confirm()} disabled={confirmAction.busy}><PackageCheck /> Всё получено</button>}
            {deal.buyerConfirmed && botWait === 0 && !deal.complete && <button className="button button--primary" type="button" onClick={() => void finish()} disabled={completeAction.busy}><Handshake /> Завершить и вернуть залог</button>}
            {deal.complete && <div className="deal-success"><Check /><div><strong>Сделка успешно закрыта</strong><p>{collateral.toFixed(2)} zUSDC collateral возвращены вам.</p></div></div>}
          </div>
        </Panel>
      )}
    </DappShell>
  )
}
