import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  Radio,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { ContractTransactionReceipt } from 'ethers'
import { AppGlyph } from '../../components/Brand'
import { SiteHeader } from '../../components/SiteHeader'
import { useContracts } from '../../context/ContractsContext'
import { useToast } from '../../context/ToastContext'
import { errorMessage } from '../../lib/errors'
import { explorerAddress, explorerTx, shortAddress, ZENITH_NETWORK } from '../../lib/network'
import type { ZenithAppDefinition } from '../../types'

export function DappShell({ app, children, aside }: { app: ZenithAppDefinition; children: ReactNode; aside?: ReactNode }) {
  const contracts = useContracts()
  const Icon = app.icon
  const address = contracts.addressOf(app.contractKey)
  return (
    <div className="dapp-page" style={{ '--app-color': app.accent } as React.CSSProperties}>
      <SiteHeader appMode />
      <main className="dapp-main site-container">
        <a className="dapp-back-mobile" href="#/"><ArrowLeft /> Все приложения</a>
        <header className="dapp-hero">
          <div className="dapp-hero__identity">
            <AppGlyph color={app.accent}><Icon /></AppGlyph>
            <div><span className="eyebrow">ZENITH APP / {app.index}</span><h1>{app.name}</h1><p>{app.tagline}</p></div>
          </div>
          <div className="dapp-hero__status">
            <span className={address ? 'is-live' : ''}><i /> {address ? 'CONTRACT LIVE' : 'INTERFACE DEMO'}</span>
            <small>{address ? shortAddress(address, 8, 6) : 'deploy via Control Panel'}</small>
            {address && <a href={explorerAddress(address)} target="_blank" rel="noreferrer"><ExternalLink /></a>}
          </div>
        </header>
        {!address && <DemoBanner />}
        <div className={`dapp-layout ${aside ? '' : 'dapp-layout--wide'}`}>
          <div className="dapp-workspace">{children}</div>
          {aside && <aside className="dapp-aside">{aside}</aside>}
        </div>
      </main>
      <footer className="dapp-footer"><div className="site-container"><span><ShieldCheck /> Testnet only · non-custodial</span><a href={ZENITH_NETWORK.explorerUrl} target="_blank" rel="noreferrer">Zenith Explorer <ArrowUpRight /></a><a href="https://doepic.cc" target="_blank" rel="noreferrer">A doepic.cc build</a></div></footer>
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="demo-banner">
      <span><Sparkles /></span>
      <div><strong>Интерфейсный demo-режим</strong><p>Deployment manifest пока пуст. Сценарий работает локально; после деплоя из Zenith Control Panel эти же действия отправят транзакции в testnet.</p></div>
      <span>NO VALUE</span>
    </div>
  )
}

export function Panel({ title, eyebrow, action, children, className = '' }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`dapp-panel ${className}`}>
      <header className="dapp-panel__head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</header>
      {children}
    </section>
  )
}

export function HowItWorks({ steps }: { steps: Array<{ title: string; text: string }> }) {
  return (
    <Panel title="Как это работает" eyebrow="ONCHAIN FLOW" className="how-panel">
      <ol className="how-list">{steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
    </Panel>
  )
}

export function TrustNote({ children }: { children: ReactNode }) {
  return <div className="trust-note"><ShieldCheck /><p>{children}</p></div>
}

export function StatusRow({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return <div className={`status-row ${accent ? 'is-accent' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{text}</p></div>
}

export function SubmitButton({ busy, children, secondary = false, disabled = false }: { busy: boolean; children: ReactNode; secondary?: boolean; disabled?: boolean }) {
  return <button className={`button ${secondary ? 'button--ghost' : 'button--primary'}`} type="submit" disabled={busy || disabled}>{busy ? <LoaderCircle className="spin" /> : null}{children}</button>
}

export function useAsyncAction() {
  const [busy, setBusy] = useState(false)
  const { notify } = useToast()
  const run = async <T,>(action: () => Promise<T>, success: string, detail?: string): Promise<T | null> => {
    setBusy(true)
    try {
      const value = await action()
      notify('success', success, detail)
      return value
    } catch (error) {
      notify('error', 'Операция не выполнена', errorMessage(error))
      return null
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

export function receiptLink(receipt: ContractTransactionReceipt | null) {
  if (!receipt) return null
  return <a className="receipt-link" href={explorerTx(receipt.hash)} target="_blank" rel="noreferrer"><CheckCircle2 /> Transaction confirmed <ExternalLink /></a>
}

export function InlineAlert({ children, type = 'info' }: { children: ReactNode; type?: 'info' | 'warning' }) {
  return <div className={`inline-alert inline-alert--${type}`}>{type === 'warning' ? <CircleAlert /> : <Radio />}<p>{children}</p></div>
}

export function stopSubmit(event: FormEvent) {
  event.preventDefault()
}
