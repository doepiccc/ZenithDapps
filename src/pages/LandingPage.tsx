import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  ChevronRight,
  Gauge,
  Github,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react'
import { APPS, CATEGORY_META } from '../config/apps'
import { useContracts } from '../context/ContractsContext'
import type { AppCategory } from '../types'
import { AppGlyph, Brand } from '../components/Brand'
import { NetworkPulse } from '../components/NetworkPulse'
import { SiteHeader } from '../components/SiteHeader'

const categories: AppCategory[] = ['payments', 'streaming', 'assets']

function AppCard({ app }: { app: (typeof APPS)[number] }) {
  const contracts = useContracts()
  const Icon = app.icon
  return (
    <a className="app-card" href={`#/app/${app.id}`} style={{ '--app-color': app.accent } as React.CSSProperties}>
      <div className="app-card__top">
        <AppGlyph color={app.accent}><Icon /></AppGlyph>
        <span className={`contract-state ${contracts.isLive(app.contractKey) ? 'is-live' : ''}`}><i /> {contracts.isLive(app.contractKey) ? 'LIVE' : 'DEMO'}</span>
        <span className="app-card__number">/{app.index}</span>
      </div>
      <h3>{app.name}</h3>
      <strong>{app.tagline}</strong>
      <p>{app.description}</p>
      <div className="app-card__features">{app.features.slice(0, 2).map((feature) => <span key={feature}><Check /> {feature}</span>)}</div>
      <div className="app-card__foot"><span><b>{app.stat}</b><small>{app.statLabel}</small></span><i><ArrowUpRight /></i></div>
    </a>
  )
}

function CategorySection({ category }: { category: AppCategory }) {
  const meta = CATEGORY_META[category]
  const apps = APPS.filter((app) => app.category === category)
  return (
    <section className={`catalog-section catalog-section--${category}`}>
      <div className="catalog-section__head">
        <span className="section-number">[{meta.index}]</span>
        <div><span className="eyebrow">{meta.eyebrow}</span><h2>{meta.title}</h2><p>{meta.description}</p></div>
        <span className="catalog-count">{String(apps.length).padStart(2, '0')} APPS</span>
      </div>
      <div className="app-grid">{apps.map((app) => <AppCard app={app} key={app.id} />)}</div>
    </section>
  )
}

export function LandingPage() {
  const contracts = useContracts()
  return (
    <div className="landing-page">
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero__noise" />
          <div className="site-container hero__grid">
            <div className="hero__copy">
              <div className="hero__eyebrow"><span><Sparkles /></span> CONSUMER DAPPS ON ZENITH <small>BUILD / 01</small></div>
              <h1>Полезный Web3.<br /><em>На скорости сети.</em></h1>
              <p>Десять приложений для переводов, подписок, сделок и цифровых активов. Без аккаунтов, серверов и скрытых правил.</p>
              <div className="hero__actions">
                <a className="button button--primary" href="#apps">Открыть приложения <ArrowDown /></a>
                <a className="button button--ghost" href="#network">Почему Zenith <ArrowRight /></a>
              </div>
              <div className="hero__proof"><span><ShieldCheck /> Non-custodial</span><span><Zap /> Sub-second finality</span><span><Blocks /> Open source contracts</span></div>
            </div>
            <NetworkPulse />
          </div>
          <div className="hero-strip"><div><span>ZENLINK</span><i /><span>PACTFI</span><i /><span>SPLITZEN</span><i /><span>MICRORETAIL</span><i /><span>SUBSTREAM</span><i /><span>FAIRTIX</span><i /><span>ZENLINK</span><i /><span>PACTFI</span><i /><span>SPLITZEN</span></div></div>
        </section>

        <section className="catalog site-container" id="apps">
          <div className="catalog-intro">
            <span className="eyebrow">THE APP LAYER</span>
            <h2>Выберите задачу.<br /><em>Не протокол.</em></h2>
            <p>Каждый интерфейс скрывает криптографическую сложность, но оставляет вам контроль и проверяемый результат.</p>
            <div className="deployment-status"><span><i /> SUITE STATUS</span><strong>{contracts.liveCount}/13 contracts live</strong><small>{contracts.liveCount ? `manifest ${contracts.manifest?.updatedAt?.slice(0, 10) ?? 'loaded'}` : 'interface demo · deploy from Control Panel'}</small></div>
          </div>
          {categories.map((category) => <CategorySection category={category} key={category} />)}
        </section>

        <section className="network-section" id="network">
          <div className="site-container">
            <div className="network-section__copy">
              <span className="eyebrow">WHY ZENITH</span>
              <h2>Когда блок длится секунду,<br /><em>финансы ощущаются живыми.</em></h2>
              <p>Zenith EVM сочетает привычный EVM-интерфейс с финальностью через Canton — поэтому счётчики, стримы и микро-рынки обновляются в темпе продукта, а не банковского бэкенда.</p>
              <a href="https://docs.zenith.network/zenith-testnet" target="_blank" rel="noreferrer">Документация сети <ArrowUpRight /></a>
            </div>
            <div className="network-feature-grid">
              <article><span><Gauge /></span><b>~1 sec</b><strong>Быстрые блоки</strong><p>Посекундные платежи и интерфейсы без долгого ожидания.</p></article>
              <article><span><Radio /></span><b>936485</b><strong>EVM Chain ID</strong><p>MetaMask, ethers и стандартные Solidity-инструменты.</p></article>
              <article><span><LockKeyhole /></span><b>Canton</b><strong>Финальный settlement</strong><p>Институциональная инфраструктура под понятным UX.</p></article>
              <article><span><WalletCards /></span><b>Self</b><strong>Ваши ключи</strong><p>Frontend не хранит seed-фразы и не принимает custody.</p></article>
            </div>
          </div>
        </section>

        <section className="safety-section site-container" id="safety">
          <div className="safety-card">
            <div className="safety-card__icon"><ShieldCheck /></div>
            <div><span className="eyebrow">TESTNET BY DESIGN</span><h2>Проверяйте механику без риска.</h2><p>Все приложения работают только в Zenith EVM Testnet. zUSDC и ZTH не имеют реальной стоимости. Контракты открыты, адреса публикуются в deployment manifest.</p></div>
            <a className="button button--ghost" href="https://explorer.testnet.zenith.network" target="_blank" rel="noreferrer">Открыть Explorer <ArrowUpRight /></a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="site-container site-footer__top"><Brand /><p>Useful onchain products<br />for Zenith EVM Testnet.</p><div><a href="https://github.com/doepiccc" target="_blank" rel="noreferrer"><Github /> GitHub</a><a href="https://doepic.cc" target="_blank" rel="noreferrer">Built by doepic.cc <ChevronRight /></a></div></div>
        <div className="site-container site-footer__bottom"><span>© {new Date().getFullYear()} DOEPIC.CC / ZENITH APPS</span><span>INDEPENDENT TESTNET PROJECT · NOT AN OFFICIAL ZENITH PRODUCT</span></div>
      </footer>
    </div>
  )
}
