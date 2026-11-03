import { ArrowLeft, ExternalLink, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Brand } from './Brand'
import { WalletButton } from './WalletButton'
import { LanguageSwitch } from '../i18n/LocaleContext'

export function SiteHeader({ appMode = false }: { appMode?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className={`site-header ${appMode ? 'site-header--app' : ''}`}>
      <div className="site-header__inner">
        <a href="#/" aria-label="Zenith Apps — главная"><Brand /></a>
        {appMode ? (
          <a className="header-back" href="#/"><ArrowLeft /> Все приложения</a>
        ) : (
          <nav className={menuOpen ? 'is-open' : ''}>
            <a href="#apps" onClick={() => setMenuOpen(false)}>Приложения</a>
            <a href="#network" onClick={() => setMenuOpen(false)}>Почему Zenith</a>
            <a href="#safety" onClick={() => setMenuOpen(false)}>Безопасность</a>
            <a href="https://doepic.cc" target="_blank" rel="noreferrer">doepic.cc <ExternalLink /></a>
          </nav>
        )}
        <div className="site-header__actions">
          <LanguageSwitch />
          <span className="testnet-chip"><i /> TESTNET</span>
          <WalletButton />
          {!appMode && <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Меню">{menuOpen ? <X /> : <Menu />}</button>}
        </div>
      </div>
    </header>
  )
}
