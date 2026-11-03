import { Check, Clock3, HeartPulse, KeyRound, LockKeyhole, ShieldCheck, UserRoundPlus, Users, Vault } from 'lucide-react'
import { parseUnits } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { useWallet } from '../../context/WalletContext'
import { eventValue, wait } from '../../lib/contracts'
import { shortAddress } from '../../lib/network'
import { DappShell, HowItWorks, Panel, StatusRow, SubmitButton, useAsyncAction } from './shared'

interface VaultState { id: bigint; amount: number; period: number; heartbeatAt: number; beneficiary: string; claimed: boolean }

export function DeadManPage() {
  const app = APP_BY_ID.deadman
  const contracts = useContracts()
  const wallet = useWallet()
  const createAction = useAsyncAction()
  const vaultAction = useAsyncAction()
  const [amount, setAmount] = useState('100')
  const [period, setPeriod] = useState('60')
  const [beneficiary, setBeneficiary] = useState('0x5555555555555555555555555555555555555555')
  const [vault, setVault] = useState<VaultState | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = vault ? Math.max(0, vault.period - (now - vault.heartbeatAt) / 1000) : Number(period)
  const progress = vault ? remaining / vault.period : 1
  const unlocked = Boolean(vault && remaining <= 0)
  const periodLabel = useMemo(() => Number(period) >= 86_400 ? `${Number(period) / 86_400} days` : `${period} sec`, [period])

  const create = async () => {
    const value = Number(amount)
    const seconds = Number(period)
    let vaultId = BigInt(Date.now())
    const receipt = await createAction.run(async () => {
      if (!contracts.isLive('deadman')) { await wait(850); return null }
      const created = await contracts.execute('deadman', 'createVault', [contracts.addressOf('demoToken'), seconds, [beneficiary], [10_000]])
      const id = eventValue<bigint>(created, 'deadman', 'VaultCreated', 'vaultId')
      if (!id) throw new Error('VaultCreated event not found')
      const units = parseUnits(amount, 6)
      await contracts.approve('deadman', units)
      await contracts.execute('deadman', 'fund', [id, units])
      vaultId = id
      return created
    }, 'Наследственный сейф активирован', `Heartbeat необходимо обновлять раз в ${periodLabel}.`)
    if (receipt === null && contracts.isLive('deadman')) return
    setVault({ id: vaultId, amount: value, period: seconds, heartbeatAt: Date.now(), beneficiary, claimed: false })
  }

  const ping = async () => {
    if (!vault) return
    const result = await vaultAction.run(async () => {
      if (!contracts.isLive('deadman')) { await wait(450); return null }
      return contracts.execute('deadman', 'ping', [vault.id])
    }, 'Heartbeat обновлён', `Новый unlock через ${vault.period} секунд.`)
    if (result === null && contracts.isLive('deadman')) return
    setVault({ ...vault, heartbeatAt: Date.now() })
  }

  const claim = async () => {
    if (!vault) return
    const result = await vaultAction.run(async () => {
      if (!contracts.isLive('deadman')) { await wait(650); return null }
      return contracts.execute('deadman', 'claim', [vault.id])
    }, 'Наследство получено', `${vault.amount.toFixed(2)} zUSDC переведены beneficiary.`)
    if (result === null && contracts.isLive('deadman')) return
    setVault({ ...vault, claimed: true })
  }

  const aside = (
    <>
      <Panel title="Модель безопасности" eyebrow="SELF-CUSTODIAL INHERITANCE">
        <div className="security-list"><div><span><KeyRound /></span><div><strong>Владелец не отдаёт ключи</strong><p>До expiry только owner может управлять сейфом.</p></div></div><div><span><HeartPulse /></span><div><strong>Любой ping сбрасывает таймер</strong><p>Одно подтверждение активности продлевает защиту.</p></div></div><div><span><Users /></span><div><strong>До 10 наследников</strong><p>Доли должны атомарно составлять 100%.</p></div></div></div>
      </Panel>
      <HowItWorks steps={[
        { title: 'Lock', text: 'Токены остаются в независимом vault.' },
        { title: 'Heartbeat', text: 'Владелец периодически подтверждает контроль.' },
        { title: 'Inherit', text: 'После тишины beneficiary получает свою долю.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      {!vault ? (
        <Panel title="Настроить наследственный сейф" eyebrow="NEW VAULT">
          <div className="vault-intro"><span><Vault /></span><div><h3>Страховка доступа, а не замена seed-фразы</h3><p>Задайте резервный адрес и период неактивности. В testnet можно выбрать 60 секунд и пройти весь сценарий.</p></div></div>
          <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void create() }}>
            <label className="field field--wide"><span>Резервный адрес</span><input value={beneficiary} onChange={(event) => setBeneficiary(event.target.value)} /><small>Переключитесь на этот аккаунт после истечения таймера</small></label>
            <label className="field"><span>Сумма</span><div className="amount-input"><input value={amount} onChange={(event) => setAmount(event.target.value)} /><b>zUSDC</b></div></label>
            <label className="field"><span>Период неактивности</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="60">60 секунд · demo</option><option value="604800">7 дней</option><option value="2592000">30 дней</option><option value="7776000">90 дней</option></select></label>
            <div className="beneficiary-allocation field--wide"><span><UserRoundPlus /> {shortAddress(beneficiary, 10, 8)}</span><div><i style={{ width: '100%' }} /></div><b>100%</b></div>
            <SubmitButton busy={createAction.busy}><LockKeyhole /> Создать и пополнить vault</SubmitButton>
          </form>
        </Panel>
      ) : (
        <>
          <Panel title="Состояние сейфа" eyebrow={`VAULT #${vault.id.toString().slice(-8)}`} action={<span className={`challenge-state ${unlocked ? 'is-warning' : ''}`}><i /> {vault.claimed ? 'CLAIMED' : unlocked ? 'UNLOCKED' : 'PROTECTED'}</span>}>
            <div className="vault-dashboard">
              <div className={`vault-countdown ${unlocked ? 'is-unlocked' : ''}`} style={{ '--progress': `${Math.max(0, progress) * 360}deg` } as React.CSSProperties}><div><span>{vault.claimed ? <Check /> : unlocked ? <LockKeyhole /> : <ShieldCheck />}</span><strong>{vault.claimed ? 'DONE' : unlocked ? 'READY' : `${Math.ceil(remaining)}s`}</strong><small>{unlocked ? 'CLAIM WINDOW OPEN' : 'UNTIL UNLOCK'}</small></div></div>
              <div className="vault-balance"><small>LOCKED BALANCE</small><strong>{vault.amount.toFixed(2)} <span>zUSDC</span></strong><div className="metric-stack"><StatusRow label="Owner" value={wallet.account ? shortAddress(wallet.account) : 'Connected wallet'} /><StatusRow label="Beneficiary" value={shortAddress(vault.beneficiary)} /><StatusRow label="Share" value="100%" accent /></div></div>
            </div>
            {!vault.claimed && <div className="vault-actions">{!unlocked ? <button className="button button--primary" type="button" onClick={() => void ping()} disabled={vaultAction.busy}><HeartPulse /> Я на связи · Ping</button> : <button className="button button--primary" type="button" onClick={() => void claim()} disabled={vaultAction.busy}><KeyRound /> Claim как beneficiary</button>}<p>{unlocked ? 'Для onchain claim переключите MetaMask на резервный адрес.' : 'Каждый ping начинает countdown заново.'}</p></div>}
          </Panel>
          <div className="vault-timeline"><div className="is-done"><span><Check /></span><div><strong>Vault funded</strong><small>{vault.amount} zUSDC</small></div></div><i /><div className={!unlocked ? 'is-current' : 'is-done'}><span>{unlocked ? <Check /> : <Clock3 />}</span><div><strong>Heartbeat window</strong><small>{vault.period}s inactivity</small></div></div><i /><div className={unlocked ? 'is-current' : ''}><span><KeyRound /></span><div><strong>Beneficiary claim</strong><small>{vault.claimed ? 'complete' : 'waiting'}</small></div></div></div>
        </>
      )}
    </DappShell>
  )
}
