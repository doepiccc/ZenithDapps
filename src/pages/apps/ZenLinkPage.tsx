import { Check, Copy, Gift, KeyRound, Link2, QrCode, Send, ShieldCheck, WalletCards } from 'lucide-react'
import { Wallet, getBytes, parseUnits } from 'ethers'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { useToast } from '../../context/ToastContext'
import { useWallet } from '../../context/WalletContext'
import { eventValue, hashQuery, wait } from '../../lib/contracts'
import { shortAddress } from '../../lib/network'
import { DappShell, HowItWorks, Panel, StatusRow, SubmitButton, TrustNote, useAsyncAction } from './shared'

interface CreatedLink {
  transferId: string
  secretKey: string
  ephemeralAddress: string
  amount: string
  url: string
}

export function ZenLinkPage() {
  const app = APP_BY_ID.zenlink
  const contracts = useContracts()
  const wallet = useWallet()
  const { notify } = useToast()
  const createAction = useAsyncAction()
  const claimAction = useAsyncAction()
  const faucetAction = useAsyncAction()
  const [amount, setAmount] = useState('25')
  const [expiry, setExpiry] = useState('24')
  const [created, setCreated] = useState<CreatedLink | null>(null)
  const query = useMemo(() => hashQuery(), [])
  const claimTransferId = query.get('transferId')
  const claimSecret = query.get('secretKey')
  const isClaim = Boolean(claimTransferId && claimSecret)

  const getFaucet = async () => {
    await faucetAction.run(async () => {
      if (contracts.isLive('demoToken')) return contracts.execute('demoToken', 'faucet')
      await wait(650)
      return null
    }, '1 000 Demo USDC начислено', contracts.isLive('demoToken') ? 'Токены уже в кошельке.' : 'Локальная demo-симуляция.')
  }

  const createLink = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return notify('error', 'Проверьте сумму')
    const ephemeral = Wallet.createRandom()
    const expiresAt = Math.floor(Date.now() / 1000) + Number(expiry) * 3600
    const randomId = crypto.getRandomValues(new Uint8Array(32))
    let transferId = `0x${Array.from(randomId, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
    const receipt = await createAction.run(async () => {
      if (!contracts.isLive('zenlink')) {
        await wait(900)
        return null
      }
      const units = parseUnits(amount, 6)
      await contracts.approve('zenlink', units)
      return contracts.execute('zenlink', 'createTransfer', [
        ephemeral.address,
        contracts.addressOf('demoToken'),
        units,
        expiresAt,
      ])
    }, 'Защищённая ссылка создана', 'Секрет находится только в URL и не отправляется на сервер.')
    if (receipt === null && contracts.isLive('zenlink')) return
    if (receipt) transferId = eventValue<string>(receipt, 'zenlink', 'LinkCreated', 'transferId') ?? transferId
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}#/app/zenlink/claim?transferId=${encodeURIComponent(transferId)}&secretKey=${encodeURIComponent(ephemeral.privateKey)}`
    setCreated({ transferId, secretKey: ephemeral.privateKey, ephemeralAddress: ephemeral.address, amount, url })
  }

  const claim = async () => {
    if (!claimTransferId || !claimSecret) return
    if (!wallet.account) await wallet.connect()
    const recipient = wallet.account ?? await (await wallet.getSigner()).getAddress()
    const secretWallet = new Wallet(claimSecret)
    await claimAction.run(async () => {
      if (!contracts.isLive('zenlink')) {
        await wait(900)
        return null
      }
      const digest = await contracts.read('zenlink', 'claimDigest', [claimTransferId, recipient]) as string
      const signature = await secretWallet.signMessage(getBytes(digest))
      return contracts.execute('zenlink', 'claim', [claimTransferId, recipient, signature])
    }, 'Перевод получен', `${created?.amount ?? ''} zUSDC отправлены на ${shortAddress(recipient)}.`)
  }

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    notify('success', 'Ссылка скопирована')
  }

  const aside = (
    <>
      <Panel title="Защита ссылки" eyebrow="ZERO BACKEND">
        <div className="security-list">
          <div><span><KeyRound /></span><div><strong>Одноразовый ключ</strong><p>Генерируется Web Crypto в этом браузере.</p></div></div>
          <div><span><ShieldCheck /></span><div><strong>Secret в hash</strong><p>Фрагмент после # не отправляется HTTP-серверу.</p></div></div>
          <div><span><WalletCards /></span><div><strong>Получатель выбирает адрес</strong><p>Claim подписан временным ключом, а не сервером.</p></div></div>
        </div>
      </Panel>
      <HowItWorks steps={[
        { title: 'Депозит', text: 'Отправитель блокирует zUSDC для ephemeral signer.' },
        { title: 'Share', text: 'Приватный ключ передаётся только внутри URL hash.' },
        { title: 'Claim', text: 'Контракт проверяет ecrecover и платит выбранному адресу.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      {isClaim ? (
        <Panel title="Вам отправили перевод" eyebrow="ZENLINK / CLAIM" className="zenlink-claim">
          <div className="claim-visual"><span><Gift /></span><i /><span><WalletCards /></span></div>
          <div className="claim-summary">
            <StatusRow label="Transfer ID" value={shortAddress(claimTransferId!, 12, 8)} />
            <StatusRow label="Ключ ссылки" value="Найден локально" accent />
            <StatusRow label="Получатель" value={wallet.account ? shortAddress(wallet.account) : 'Подключите кошелёк'} />
          </div>
          <TrustNote>Приватный ключ не импортируется в MetaMask и используется только для подписи claim digest.</TrustNote>
          <form onSubmit={(event) => { event.preventDefault(); void claim() }}><SubmitButton busy={claimAction.busy}><Gift /> Получить перевод</SubmitButton></form>
        </Panel>
      ) : !created ? (
        <>
          <Panel title="Создать ссылку на перевод" eyebrow="NEW TRANSFER" action={<button className="mini-action" type="button" onClick={() => void getFaucet()} disabled={faucetAction.busy}><Gift /> Get Demo USDC</button>}>
            <form className="zenlink-form" onSubmit={(event) => { event.preventDefault(); void createLink() }}>
              <label className="field"><span>Сумма</span><div className="amount-input"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /><b>zUSDC</b></div><small>Тестовый токен с 6 decimals</small></label>
              <label className="field"><span>Ссылка действует</span><select value={expiry} onChange={(event) => setExpiry(event.target.value)}><option value="1">1 час</option><option value="24">24 часа</option><option value="72">3 дня</option><option value="168">7 дней</option></select><small>После срока отправитель может вернуть депозит</small></label>
              <div className="transfer-preview"><div><span>Получатель</span><strong>Определится при claim</strong></div><Link2 /><div><span>Сеть</span><strong>Zenith Testnet</strong></div></div>
              <SubmitButton busy={createAction.busy}><Send /> Создать безопасную ссылку</SubmitButton>
            </form>
          </Panel>
          <div className="quick-stats"><div><b>0%</b><span>комиссия приложения</span></div><div><b>1 link</b><span>один claim</span></div><div><b>100%</b><span>возврат после expiry</span></div></div>
        </>
      ) : (
        <Panel title="Ссылка готова" eyebrow="TRANSFER CREATED" className="link-result">
          <div className="link-result__grid">
            <div className="qr-card"><QRCodeSVG value={created.url} size={184} bgColor="#ffffff" fgColor="#0b1015" level="M" /><span><QrCode /> SCAN TO CLAIM</span></div>
            <div className="link-result__body">
              <span className="success-badge"><Check /> ONCHAIN DEPOSIT READY</span>
              <h3>{created.amount} <small>zUSDC</small></h3>
              <p>Отправьте QR или ссылку получателю. Любой, у кого есть ссылка, сможет забрать средства — используйте приватный канал.</p>
              <div className="copy-box"><code>{created.url}</code><button type="button" onClick={() => void copy(created.url)}><Copy /></button></div>
              <StatusRow label="Ephemeral signer" value={shortAddress(created.ephemeralAddress, 10, 8)} />
              <StatusRow label="Transfer ID" value={shortAddress(created.transferId, 12, 8)} />
              <button className="button button--ghost" type="button" onClick={() => setCreated(null)}>Создать ещё одну</button>
            </div>
          </div>
        </Panel>
      )}
    </DappShell>
  )
}
