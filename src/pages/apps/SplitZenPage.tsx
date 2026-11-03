import { ArrowRight, BedDouble, Check, CircleDollarSign, Plus, ReceiptText, Sparkles, Utensils, Users, WalletCards } from 'lucide-react'
import { parseUnits } from 'ethers'
import { useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { useWallet } from '../../context/WalletContext'
import { eventValue, wait } from '../../lib/contracts'
import { shortAddress } from '../../lib/network'
import { DappShell, HowItWorks, Panel, SubmitButton, TrustNote, useAsyncAction } from './shared'

const MAYA = '0x1111111111111111111111111111111111111111'
const LEO = '0x2222222222222222222222222222222222222222'

interface Expense { id: number; title: string; payer: string; amount: number; icon: 'hotel' | 'food' | 'other' }
interface DemoGroup { id: bigint; name: string; expenses: Expense[]; settled: boolean }

export function SplitZenPage() {
  const app = APP_BY_ID.splitzen
  const contracts = useContracts()
  const wallet = useWallet()
  const loadAction = useAsyncAction()
  const expenseAction = useAsyncAction()
  const settleAction = useAsyncAction()
  const [group, setGroup] = useState<DemoGroup | null>(null)
  const [memo, setMemo] = useState('Такси в аэропорт')
  const [amount, setAmount] = useState('42')

  const loadTrip = async () => {
    if (!wallet.account && contracts.isLive('splitzen')) await wallet.connect()
    const receipt = await loadAction.run(async () => {
      if (!contracts.isLive('splitzen')) { await wait(760); return null }
      return contracts.execute('splitzen', 'createDemoTrip', [contracts.addressOf('demoToken'), MAYA, LEO])
    }, 'Демо-поездка загружена', 'Группа и два чека созданы одной транзакцией.')
    if (receipt === null && contracts.isLive('splitzen')) return
    const id = receipt ? eventValue<bigint>(receipt, 'splitzen', 'GroupCreated', 'groupId') ?? 1n : BigInt(Date.now())
    setGroup({ id, name: 'Lisbon · 3 days', settled: false, expenses: [
      { id: 1, title: 'Hotel · 3 nights', payer: 'Maya', amount: 420, icon: 'hotel' },
      { id: 2, title: 'Dinner · Bairro Alto', payer: 'Leo', amount: 96, icon: 'food' },
    ] })
  }

  const addExpense = async () => {
    if (!group) return
    const result = await expenseAction.run(async () => {
      if (!contracts.isLive('splitzen')) { await wait(500); return null }
      const payer = wallet.account ?? await (await wallet.getSigner()).getAddress()
      return contracts.execute('splitzen', 'addExpense', [group.id, payer, parseUnits(amount, 6), [payer, MAYA, LEO], memo])
    }, 'Чек добавлен', 'ExpenseAdded доступен напрямую из событий контракта.')
    if (result === null && contracts.isLive('splitzen')) return
    setGroup({ ...group, expenses: [...group.expenses, { id: group.expenses.length + 1, title: memo, payer: 'You', amount: Number(amount), icon: 'other' }] })
  }

  const settle = async () => {
    if (!group) return
    const result = await settleAction.run(async () => {
      if (!contracts.isLive('splitzen')) { await wait(700); return null }
      await contracts.approve('splitzen', parseUnits('172', 6))
      return contracts.execute('splitzen', 'settleUp', [group.id])
    }, 'Все ваши долги закрыты', 'Контракт распределил выплаты кредиторам в одной транзакции.')
    if (result === null && contracts.isLive('splitzen')) return
    setGroup({ ...group, settled: true })
  }

  const aside = (
    <>
      <Panel title="Ваш net balance" eyebrow="GROUP POSITION">
        <div className={`balance-orb ${group?.settled ? 'is-settled' : ''}`}><span>{group?.settled ? <Check /> : '−'}</span><b>{group?.settled ? '0.00' : '172.00'}</b><small>zUSDC</small></div>
        <p className="center-copy">{group?.settled ? 'Все расчёты завершены.' : 'Вы должны группе после взаимозачёта.'}</p>
        {group && !group.settled && <button className="button button--primary button--full" type="button" onClick={() => void settle()} disabled={settleAction.busy}><CircleDollarSign /> Settle up once</button>}
        <TrustNote>Контракт переводит ровно net debt. Промежуточные долги между каждой парой не нужны.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Группа', text: 'Адреса получают читаемые ончейн-никнеймы.' },
        { title: 'Чеки', text: 'Expense events становятся общей историей.' },
        { title: 'Netting', text: 'Один settle закрывает все долги участника.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      {!group ? (
        <Panel title="Разделите поездку без таблиц" eyebrow="GROUP TAB / QUICK START" className="split-empty-panel">
          <div className="trip-visual"><span><Users /></span><i><ArrowRight /></i><span><ReceiptText /></span><i><ArrowRight /></i><span><WalletCards /></span></div>
          <h3>Попробуйте готовый weekend trip</h3>
          <p>Три участника, отель и ужин — чтобы сразу увидеть взаимозачёт вместо пустого dashboard.</p>
          <button className="button button--primary" type="button" onClick={() => void loadTrip()} disabled={loadAction.busy}><Sparkles /> Загрузить демо-поездку</button>
          <span className="single-tx-note">ONE TRANSACTION · NO BACKEND</span>
        </Panel>
      ) : (
        <>
          <Panel title={group.name} eyebrow={`GROUP #${group.id.toString()}`} action={<span className="member-stack"><i>Y</i><i>M</i><i>L</i><b>3</b></span>}>
            <div className="expense-list">
              {group.expenses.map((expense) => (
                <div className="expense-row" key={expense.id}>
                  <span className={`expense-icon expense-icon--${expense.icon}`}>{expense.icon === 'hotel' ? <BedDouble /> : expense.icon === 'food' ? <Utensils /> : <ReceiptText />}</span>
                  <div><strong>{expense.title}</strong><small>Paid by {expense.payer} · split 3 ways</small></div>
                  <span><b>{expense.amount.toFixed(2)}</b><small>zUSDC</small></span>
                </div>
              ))}
            </div>
            <form className="inline-expense-form" onSubmit={(event) => { event.preventDefault(); void addExpense() }}>
              <label><span>Новый чек</span><input value={memo} onChange={(event) => setMemo(event.target.value)} /></label>
              <label><span>Сумма</span><div className="amount-input"><input value={amount} onChange={(event) => setAmount(event.target.value)} /><b>zUSDC</b></div></label>
              <SubmitButton busy={expenseAction.busy}><Plus /> Добавить</SubmitButton>
            </form>
          </Panel>
          <Panel title="Кто кому должен" eyebrow="NET POSITIONS" className="positions-panel">
            <div className="position-row"><span className="avatar">Y</span><div><strong>You</strong><small>{wallet.account ? shortAddress(wallet.account) : 'connected wallet'}</small></div><b className={group.settled ? '' : 'negative'}>{group.settled ? '0.00' : '−172.00'}</b></div>
            <div className="position-row"><span className="avatar maya">M</span><div><strong>Maya</strong><small>{shortAddress(MAYA)}</small></div><b className={group.settled ? '' : 'positive'}>{group.settled ? '0.00' : '+248.00'}</b></div>
            <div className="position-row"><span className="avatar leo">L</span><div><strong>Leo</strong><small>{shortAddress(LEO)}</small></div><b className={group.settled ? '' : 'negative'}>{group.settled ? '0.00' : '−76.00'}</b></div>
          </Panel>
        </>
      )}
    </DappShell>
  )
}
