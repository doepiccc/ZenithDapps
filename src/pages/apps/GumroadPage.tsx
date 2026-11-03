import { ArrowUpRight, Check, Copy, FileKey2, Image, KeyRound, Lock, PackagePlus, ShieldCheck, ShoppingBag, Sparkles, Store, TerminalSquare } from 'lucide-react'
import { id, parseUnits } from 'ethers'
import { useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { useToast } from '../../context/ToastContext'
import { useWallet } from '../../context/WalletContext'
import { eventValue, wait } from '../../lib/contracts'
import { shortAddress } from '../../lib/network'
import { DappShell, HowItWorks, Panel, StatusRow, SubmitButton, TrustNote, useAsyncAction } from './shared'

const products = [
  { id: 1, title: 'The Quiet Prompt Pack', creator: 'studio.prompt', type: 'PROMPT PACK', price: 12, color: '#57c9ff', icon: TerminalSquare, description: '42 production prompts for visual direction, UX writing and research.', content: 'ZEN-QUIET-42 / Download unlocked: ipfs://demo-prompt-pack' },
  { id: 2, title: 'Protocol Forms / 4K', creator: 'forma.zero', type: 'ART DOWNLOAD', price: 8, color: '#9e86ff', icon: Image, description: 'Six high-resolution generative studies for personal use.', content: 'LICENSE: PERSONAL-4K / ipfs://demo-protocol-forms' },
  { id: 3, title: 'Builder Circle Access', creator: 'doepic.cc', type: 'PRIVATE ACCESS', price: 20, color: '#baff4a', icon: ShieldCheck, description: 'Testnet VIP code and a private research channel invite.', content: 'INVITE CODE: ZENITH-BUILD-936485' },
]

interface Purchase { product: typeof products[number]; license: string }

export function GumroadPage() {
  const app = APP_BY_ID.gumroad
  const contracts = useContracts()
  const wallet = useWallet()
  const { notify } = useToast()
  const action = useAsyncAction()
  const [tab, setTab] = useState<'store' | 'sell'>('store')
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [title, setTitle] = useState('My onchain license')
  const [price, setPrice] = useState('10')
  const [preview, setPreview] = useState('ipfs://preview')
  const [publishedId, setPublishedId] = useState<bigint | null>(null)

  const buy = async (product: typeof products[number]) => {
    let license = id(`demo:${product.id}:${wallet.account ?? 'visitor'}`)
    const receipt = await action.run(async () => {
      if (!contracts.isLive('gumroad')) { await wait(700); return null }
      await contracts.approve('gumroad', parseUnits(String(product.price), 6))
      const result = await contracts.execute('gumroad', 'purchase', [product.id])
      const account = wallet.account ?? await (await wallet.getSigner()).getAddress()
      license = await contracts.read('gumroad', 'licenseFor', [product.id, account]) as string
      return result
    }, 'Покупка подтверждена', 'Лицензионный ключ доступен сразу — без email и аккаунта.')
    if (receipt === null && contracts.isLive('gumroad')) return
    setPurchase({ product, license })
  }

  const publish = async () => {
    let productId = BigInt(Date.now())
    const commitment = id(`${title}:${preview}:zenith-demo`)
    const receipt = await action.run(async () => {
      if (!contracts.isLive('gumroad')) { await wait(650); return null }
      return contracts.execute('gumroad', 'publish', [title, preview, contracts.addressOf('demoToken'), parseUnits(price, 6), commitment])
    }, 'Товар опубликован', 'Витрина и license verifier готовы к продажам.')
    if (receipt === null && contracts.isLive('gumroad')) return
    if (receipt) productId = eventValue<bigint>(receipt, 'gumroad', 'ProductPublished', 'productId') ?? productId
    setPublishedId(productId)
  }

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    notify('success', 'Лицензионный ключ скопирован')
  }

  const aside = (
    <>
      <Panel title="Прямая продажа" eyebrow="CREATOR ECONOMY">
        <div className="creator-flow"><span><Store /></span><i /><span><ShoppingBag /></span><i /><span><KeyRound /></span></div>
        <div className="metric-stack"><StatusRow label="Комиссия платформы" value="0%" accent /><StatusRow label="Выплата продавцу" value="В транзакции" /><StatusRow label="Receipt" value="Onchain" /></div>
        <TrustNote>Публичный блокчейн не подходит для хранения незашифрованного файла. Контракт хранит purchase proof и commitment; frontend раскрывает ключ.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Publish', text: 'Создатель фиксирует цену и commitment.' },
        { title: 'Buy', text: 'Оплата сразу уходит продавцу.' },
        { title: 'Unlock', text: 'Адрес получает детерминированную лицензию.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      <div className="app-tabs"><button className={tab === 'store' ? 'is-active' : ''} type="button" onClick={() => setTab('store')}><Store /> Витрина</button><button className={tab === 'sell' ? 'is-active' : ''} type="button" onClick={() => setTab('sell')}><PackagePlus /> Начать продавать</button></div>
      {tab === 'store' && <Panel title="Независимые цифровые товары" eyebrow="ONCHAIN STOREFRONT"><div className="product-grid">{products.map((product) => { const Icon = product.icon; const bought = purchase?.product.id === product.id; return <article className="product-card" style={{ '--product-color': product.color } as React.CSSProperties} key={product.id}><div className="product-card__art"><Icon /><span>{product.type}</span><i /><b>0{product.id}</b></div><div className="product-card__body"><span>BY {product.creator.toUpperCase()}</span><h3>{product.title}</h3><p>{product.description}</p><footer><strong>{product.price} <small>zUSDC</small></strong><button type="button" onClick={() => void buy(product)} disabled={action.busy || bought}>{bought ? <><Check /> Куплено</> : <>Купить <ArrowUpRight /></>}</button></footer></div></article> })}</div></Panel>}
      {tab === 'sell' && <Panel title="Опубликовать товар" eyebrow="30 SECOND SETUP"><form className="creator-form" onSubmit={(event) => { event.preventDefault(); void publish() }}><div className="creator-form__art"><FileKey2 /><span>YOUR<br/>PRODUCT</span><i /></div><div className="form-grid"><label className="field field--wide"><span>Название</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="field"><span>Цена</span><div className="amount-input"><input value={price} onChange={(event) => setPrice(event.target.value)} /><b>zUSDC</b></div></label><label className="field"><span>Preview URI</span><input value={preview} onChange={(event) => setPreview(event.target.value)} /></label><label className="field field--wide"><span>Секрет / content commitment</span><input value="Hash генерируется в браузере" disabled /><small>В production зашифруйте контент Web Crypto и публикуйте ciphertext в IPFS.</small></label><SubmitButton busy={action.busy}><Sparkles /> Publish onchain</SubmitButton></div></form>{publishedId && <div className="publish-success"><Check /><div><strong>Product #{publishedId.toString().slice(-7)} live</strong><p>Покупатели получат уникальный key, привязанный к своему адресу.</p></div></div>}</Panel>}
      {purchase && <div className="unlock-modal-backdrop" onClick={() => setPurchase(null)}><div className="unlock-modal" onClick={(event) => event.stopPropagation()}><span className="unlock-icon"><Lock /><i><Check /></i></span><small>PURCHASE VERIFIED ONCHAIN</small><h2>{purchase.product.title}</h2><p>Контент разблокирован для {wallet.account ? shortAddress(wallet.account, 10, 6) : 'вашего demo-адреса'}.</p><div className="secret-reveal"><span>YOUR CONTENT</span><strong>{purchase.product.content}</strong></div><div className="license-box"><div><span>LICENSE KEY</span><code>{shortAddress(purchase.license, 18, 14)}</code></div><button type="button" onClick={() => void copy(purchase.license)}><Copy /></button></div><button className="button button--primary button--full" type="button" onClick={() => setPurchase(null)}>Готово</button></div></div>}
    </DappShell>
  )
}
