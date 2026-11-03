import { CalendarDays, Camera, Check, Clock3, MapPin, QrCode, RefreshCw, ScanLine, ShieldCheck, Sparkles, TicketCheck } from 'lucide-react'
import { getBytes, parseUnits } from 'ethers'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { APP_BY_ID } from '../../config/apps'
import { useContracts } from '../../context/ContractsContext'
import { useWallet } from '../../context/WalletContext'
import { eventValue, wait } from '../../lib/contracts'
import { DappShell, HowItWorks, Panel, StatusRow, TrustNote, useAsyncAction } from './shared'

const events = [
  { id: 1, title: 'Zenith Night / Berlin', type: 'LIVE SET', venue: 'Kraftwerk Berlin', date: '28 NOV', time: '22:00', price: 18, sold: 73, capacity: 120, color: '#ffce5c' },
  { id: 2, title: 'Onchain Product Meetup', type: 'MEETUP', venue: 'Lisbon Web3 Hub', date: '06 DEC', time: '18:30', price: 8, sold: 42, capacity: 80, color: '#54d6ff' },
  { id: 3, title: 'Protocol Artifacts', type: 'EXHIBITION', venue: 'Digital Garage', date: '14 DEC', time: '19:00', price: 12, sold: 91, capacity: 150, color: '#9e86ff' },
]

interface TicketState { tokenId: bigint; event: typeof events[number]; listed: boolean; qr?: string; admitted?: boolean }

export function FairTixPage() {
  const app = APP_BY_ID.fairtix
  const contracts = useContracts()
  const wallet = useWallet()
  const buyAction = useAsyncAction()
  const ticketAction = useAsyncAction()
  const [tab, setTab] = useState<'events' | 'ticket' | 'scanner'>('events')
  const [ticket, setTicket] = useState<TicketState | null>(null)
  const [scanValue, setScanValue] = useState('')

  const buy = async (selected: typeof events[number]) => {
    let tokenId = BigInt(Date.now())
    const receipt = await buyAction.run(async () => {
      if (!contracts.isLive('fairtix')) { await wait(750); return null }
      await contracts.approve('fairtix', parseUnits(String(selected.price), 6))
      return contracts.execute('fairtix', 'buyTicket', [selected.id])
    }, 'Билет выпущен', 'NFT нельзя передать в обход capped resale.')
    if (receipt === null && contracts.isLive('fairtix')) return
    if (receipt) tokenId = eventValue<bigint>(receipt, 'fairtix', 'TicketMinted', 'tokenId') ?? tokenId
    setTicket({ tokenId, event: selected, listed: false })
    setTab('ticket')
  }

  const generateQr = async () => {
    if (!ticket) return
    const timestamp = Math.floor(Date.now() / 1000)
    const result = await ticketAction.run(async () => {
      let signature = `demo:${crypto.randomUUID()}`
      if (contracts.isLive('fairtix')) {
        const digest = await contracts.read('fairtix', 'entryDigest', [ticket.tokenId, timestamp]) as string
        signature = await (await wallet.getSigner()).signMessage(getBytes(digest))
      } else await wait(400)
      return JSON.stringify({ v: 1, tokenId: ticket.tokenId.toString(), timestamp, signature })
    }, 'Динамический QR обновлён', 'Подпись действительна две минуты.')
    if (result) setTicket({ ...ticket, qr: result })
  }

  const list = async () => {
    if (!ticket) return
    const result = await ticketAction.run(async () => {
      if (!contracts.isLive('fairtix')) { await wait(450); return null }
      return contracts.execute('fairtix', 'listForResale', [ticket.tokenId, parseUnits(String(ticket.event.price), 6)])
    }, 'Билет выставлен по номиналу', 'Цена не может превышать originalMintPrice.')
    if (result === null && contracts.isLive('fairtix')) return
    setTicket({ ...ticket, listed: true })
  }

  const verify = async () => {
    let payload: { tokenId: string; timestamp: number; signature: string }
    try { payload = JSON.parse(scanValue || ticket?.qr || '') as typeof payload } catch { return }
    const result = await ticketAction.run(async () => {
      if (!contracts.isLive('fairtix')) { await wait(600); return null }
      return contracts.execute('fairtix', 'checkIn', [payload.tokenId, payload.timestamp, payload.signature])
    }, 'Билет подлинный · проход разрешён', `Ticket #${payload.tokenId} помечен использованным.`)
    if (result === null && contracts.isLive('fairtix')) return
    if (ticket && ticket.tokenId.toString() === payload.tokenId) setTicket({ ...ticket, admitted: true })
  }

  const aside = (
    <>
      <Panel title="Fair resale rules" eyebrow="ENFORCED IN CODE">
        <div className="rule-visual"><span><b>18</b><small>MINT</small></span><i>≤</i><span><b>18</b><small>RESALE</small></span></div>
        <div className="metric-stack"><StatusRow label="Обычный transferFrom" value="Disabled" /><StatusRow label="Max resale" value="100% face value" accent /><StatusRow label="Поддельный PDF" value="Невозможен" /></div>
        <TrustNote>Владение проверяется в контракте в момент входа. Скриншот QR устаревает через две минуты.</TrustNote>
      </Panel>
      <HowItWorks steps={[
        { title: 'Mint', text: 'Организатор получает номинал напрямую.' },
        { title: 'Resell', text: 'Передача разрешена только через capped market.' },
        { title: 'Enter', text: 'Владелец подписывает свежий timestamp.' },
      ]} />
    </>
  )

  return (
    <DappShell app={app} aside={aside}>
      <div className="app-tabs"><button className={tab === 'events' ? 'is-active' : ''} type="button" onClick={() => setTab('events')}><CalendarDays /> События</button><button className={tab === 'ticket' ? 'is-active' : ''} type="button" onClick={() => setTab('ticket')}><TicketCheck /> Мой билет {ticket && <i>1</i>}</button><button className={tab === 'scanner' ? 'is-active' : ''} type="button" onClick={() => setTab('scanner')}><ScanLine /> Сканер</button></div>
      {tab === 'events' && <Panel title="События без перекупщиков" eyebrow="PRIMARY TICKETS"><div className="event-grid">{events.map((item) => <article className="event-card" style={{ '--event-color': item.color } as React.CSSProperties} key={item.id}><div className="event-card__art"><span>{item.type}</span><i /><b>0{item.id}</b><div><small>{item.date}</small><strong>{item.time}</strong></div></div><div className="event-card__body"><h3>{item.title}</h3><p><MapPin /> {item.venue}</p><div className="capacity"><span style={{ width: `${item.sold / item.capacity * 100}%` }} /><small>{item.sold} / {item.capacity} sold</small></div><footer><span><b>{item.price}</b> zUSDC</span><button type="button" onClick={() => void buy(item)} disabled={buyAction.busy || ticket !== null}>Купить <TicketCheck /></button></footer></div></article>)}</div></Panel>}
      {tab === 'ticket' && <Panel title="Мой билет" eyebrow="DYNAMIC NFT TICKET">{ticket ? <div className="ticket-view"><div className="ticket-pass" style={{ '--event-color': ticket.event.color } as React.CSSProperties}><div className="ticket-pass__head"><span>FAIR<br/>TIX</span><div><small>{ticket.event.type}</small><strong>{ticket.event.title}</strong><p><MapPin /> {ticket.event.venue}</p></div><b>#{ticket.tokenId.toString().slice(-6)}</b></div><div className="ticket-pass__body"><div><span>DATE</span><strong>{ticket.event.date}</strong></div><div><span>TIME</span><strong>{ticket.event.time}</strong></div><div><span>OWNER</span><strong>{wallet.account ? `${wallet.account.slice(0, 6)}…${wallet.account.slice(-4)}` : 'Connected wallet'}</strong></div></div><div className="ticket-pass__qr">{ticket.qr ? <QRCodeSVG value={ticket.qr} size={168} bgColor="#fff" fgColor="#0b1015" /> : <span><QrCode /><small>GENERATE AT ENTRANCE</small></span>}<p>{ticket.qr ? <><Clock3 /> Valid for 2 minutes</> : 'QR содержит свежую подпись владельца'}</p></div><footer><ShieldCheck /> ORIGINAL PRICE · {ticket.event.price} zUSDC</footer></div><div className="ticket-controls"><h3>{ticket.admitted ? 'Билет использован' : 'Готов к событию'}</h3><p>Создавайте QR только перед сканированием. Он автоматически устаревает.</p><button className="button button--primary" type="button" onClick={() => void generateQr()} disabled={ticketAction.busy || ticket.admitted}><RefreshCw /> {ticket.qr ? 'Обновить QR' : 'Создать QR для входа'}</button><button className="button button--ghost" type="button" onClick={() => void list()} disabled={ticketAction.busy || ticket.listed || ticket.admitted}><Sparkles /> {ticket.listed ? 'Выставлен за номинал' : 'Перепродать за номинал'}</button></div></div> : <div className="fairtix-empty"><TicketCheck /><h3>У вас пока нет билета</h3><p>Выберите событие — testnet purchase занимает одну транзакцию.</p><button className="button button--primary" type="button" onClick={() => setTab('events')}>Открыть афишу</button></div>}</Panel>}
      {tab === 'scanner' && <Panel title="Сканер организатора" eyebrow="ENTRY VERIFICATION"><div className="scanner-grid"><div className="camera-frame"><Camera /><span /><p>Webcam preview</p><small>Вставьте QR payload справа для testnet-проверки</small></div><div className="scanner-form"><span><ScanLine /></span><h3>Проверка подписи</h3><p>Страница сверяет ownerOf, свежесть timestamp и одноразовый статус билета.</p><label className="field"><span>QR payload</span><textarea value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder={ticket?.qr ?? '{ tokenId, timestamp, signature }'} rows={5} /></label>{ticket?.qr && <button className="text-button" type="button" onClick={() => setScanValue(ticket.qr ?? '')}>Использовать QR моего билета</button>}<button className="button button--primary" type="button" onClick={() => void verify()} disabled={ticketAction.busy || (!scanValue && !ticket?.qr)}><Check /> Проверить и впустить</button>{ticket?.admitted && <div className="admit-success"><Check /><div><strong>VALID TICKET</strong><p>{ticket.event.title} · #{ticket.tokenId.toString().slice(-6)}</p></div></div>}</div></div></Panel>}
    </DappShell>
  )
}
