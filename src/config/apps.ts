import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  FileKey2,
  Handshake,
  Link2,
  ReceiptText,
  ShieldCheck,
  TicketCheck,
} from 'lucide-react'
import type { AppCategory, ZenithAppDefinition } from '../types'

export const CATEGORY_META: Record<AppCategory, { index: string; title: string; eyebrow: string; description: string }> = {
  payments: {
    index: '01',
    title: 'Бытовые платежи & Социальное',
    eyebrow: 'MOVE / AGREE / SETTLE',
    description: 'Переводы по ссылке, общие счета, пари с друзьями и сделки без посредника.',
  },
  streaming: {
    index: '02',
    title: 'High-Speed & Streaming Finance',
    eyebrow: 'SECOND-BY-SECOND',
    description: 'Продукты, которые становятся возможны благодаря быстрым блокам Zenith.',
  },
  assets: {
    index: '03',
    title: 'Цифровые активы & Безопасность',
    eyebrow: 'OWN / PROTECT / SELL',
    description: 'Билеты, цифровые товары и защита активов с проверяемыми правилами.',
  },
}

export const APPS: ZenithAppDefinition[] = [
  {
    id: 'zenlink', index: '01', name: 'ZenLink', tagline: 'Крипта по ссылке, не по адресу.',
    description: 'Создайте защищённую ссылку или QR. Получателю нужен только браузер и кошелёк — секрет никогда не покидает URL.',
    category: 'payments', contractKey: 'zenlink', icon: Link2, accent: '#baff4a', stat: '< 30 sec', statLabel: 'до перевода',
    features: ['Ephemeral keypair', 'Claim через ecrecover', 'Demo USDC faucet'],
  },
  {
    id: 'splitzen', index: '02', name: 'SplitZen', tagline: 'Закройте поездку одной транзакцией.',
    description: 'Ончейн-группы, чеки и взаимозачёт долгов для друзей, поездок и совместной аренды.',
    category: 'payments', contractKey: 'splitzen', icon: ReceiptText, accent: '#54d6ff', stat: '1 tx', statLabel: 'на расчёт',
    features: ['История из Events', 'Локальные никнеймы', 'Demo trip'],
  },
  {
    id: 'pactfi', index: '03', name: 'PactFi', tagline: 'Ставка на лучшую версию себя.',
    description: 'Социальные челленджи с ежедневными check-in: дошедшие до конца делят пул пропустивших.',
    category: 'payments', contractKey: 'pactfi', icon: BadgeCheck, accent: '#ffbd5a', stat: '7 days', statLabel: 'типичный pact',
    features: ['Daily check-in', 'Прозрачный prize pool', 'Demo Time-Warp'],
  },
  {
    id: 'safedeal', index: '04', name: 'SafeDeal P2P', tagline: 'Честная сделка без арбитра.',
    description: 'Двойной залог убирает стимул обманывать при фрилансе, продаже билетов и цифровых товаров.',
    category: 'payments', contractKey: 'safedeal', icon: Handshake, accent: '#ff7c67', stat: '20%', statLabel: 'взаимный залог',
    features: ['Dual-deposit escrow', 'Хеш условий', 'Bot counterparty'],
  },
  {
    id: 'microretail', index: '05', name: 'MicroRetail RWA', tagline: 'Доход виден каждую секунду.',
    description: 'Понятный ERC-4626-подобный сейвинг-аккаунт на базе mock tokenized T-Bond.',
    category: 'streaming', contractKey: 'microretail', icon: CircleDollarSign, accent: '#73f0c3', stat: '15% APY', statLabel: 'обычный режим',
    features: ['Растущий share price', 'Мгновенный redeem', '1% / minute demo'],
  },
  {
    id: 'substream', index: '06', name: 'SubStream', tagline: 'Подписка, которую можно остановить.',
    description: 'Платите сервису посекундно и возвращайте неиспользованный депозит одним кликом.',
    category: 'streaming', contractKey: 'substream', icon: Clock3, accent: '#9e86ff', stat: '1 sec', statLabel: 'единица оплаты',
    features: ['Linear unlock', 'Instant cancel', 'Token-gated demo content'],
  },
  {
    id: 'flashpredict', index: '07', name: 'FlashPredict', tagline: 'Рынок мнений на две минуты.',
    description: 'Быстрые pari-mutuel раунды «выше / ниже» с автоматическим расчётом по demo oracle.',
    category: 'streaming', contractKey: 'flashpredict', icon: Activity, accent: '#ff5e9a', stat: '2 min', statLabel: 'на раунд',
    features: ['Parimutuel pools', 'Live price tape', 'Auto-roll rounds'],
  },
  {
    id: 'fairtix', index: '08', name: 'FairTix', tagline: 'Билет нельзя перепродать дороже.',
    description: 'NFT-билеты с передачей только через встроенный resale по цене не выше номинала.',
    category: 'assets', contractKey: 'fairtix', icon: TicketCheck, accent: '#ffce5c', stat: '0%', statLabel: 'наценка перекупа',
    features: ['Capped resale', 'Dynamic signed QR', 'Organizer scanner'],
  },
  {
    id: 'gumroad', index: '09', name: 'OnChain Gumroad', tagline: 'Цифровая витрина за 30 секунд.',
    description: 'Продажа ключей, промокодов и доступа напрямую покупателю с ончейн-чеком владения.',
    category: 'assets', contractKey: 'gumroad', icon: FileKey2, accent: '#57c9ff', stat: '0%', statLabel: 'комиссия платформы',
    features: ['Deterministic license', 'Onchain receipt', 'Instant reveal'],
  },
  {
    id: 'deadman', index: '10', name: "DeadMan's Vault", tagline: 'Активы не должны исчезать.',
    description: 'Сейф с heartbeat и автоматическим правом наследования после заданного периода тишины.',
    category: 'assets', contractKey: 'deadman', icon: ShieldCheck, accent: '#a6ef78', stat: '60 sec', statLabel: 'test heartbeat',
    features: ['Multi-beneficiary', 'Heartbeat timer', 'Self-custodial claim'],
  },
]

export const APP_BY_ID = Object.fromEntries(APPS.map((app) => [app.id, app])) as Record<string, ZenithAppDefinition>
