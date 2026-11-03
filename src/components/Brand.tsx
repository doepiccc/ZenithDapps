import { Layers3 } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark"><span>Z</span><i /></span>
      <span className="brand__copy"><strong>ZENITH</strong><small>APPS / TESTNET</small></span>
    </span>
  )
}

export function AppGlyph({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className="app-glyph" style={{ '--app-color': color } as React.CSSProperties}>{children}</span>
}

export function ZenithMiniMark() {
  return <span className="zenith-mini-mark"><Layers3 size={14} /></span>
}
