import { Activity, Box, Clock3, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { publicProvider, ZENITH_NETWORK } from '../lib/network'

export function useNetworkPulse() {
  const [block, setBlock] = useState<number | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    let active = true
    const update = async () => {
      const started = performance.now()
      try {
        const next = await publicProvider.getBlockNumber()
        if (!active) return
        setBlock(next)
        setLatency(Math.round(performance.now() - started))
        setOnline(true)
      } catch {
        if (active) setOnline(false)
      }
    }
    void update()
    const timer = window.setInterval(() => void update(), 5_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])
  return { block, latency, online }
}

export function NetworkPulse() {
  const network = useNetworkPulse()
  return (
    <div className="network-pulse">
      <div className="network-pulse__head">
        <span><Radio /> LIVE NETWORK</span>
        <span className={network.online ? 'online' : 'offline'}><i /> {network.online ? 'OPERATIONAL' : 'CONNECTING'}</span>
      </div>
      <div className="network-core" aria-hidden="true">
        <div className="network-core__orbit network-core__orbit--one" />
        <div className="network-core__orbit network-core__orbit--two" />
        <div className="network-core__grid" />
        <div className="network-core__center"><span>Z</span><small>EVM</small></div>
        <div className="network-core__node network-core__node--one"><i /> FINALITY</div>
        <div className="network-core__node network-core__node--two"><i /> CANTON</div>
        <div className="network-core__node network-core__node--three"><i /> 1S BLOCKS</div>
      </div>
      <div className="network-pulse__stats">
        <div><Box /><span><small>LATEST BLOCK</small><strong>{network.block?.toLocaleString('en-US') ?? '—'}</strong></span></div>
        <div><Activity /><span><small>RPC LATENCY</small><strong>{network.latency ? `${network.latency} ms` : '—'}</strong></span></div>
        <div><Clock3 /><span><small>CHAIN ID</small><strong>{ZENITH_NETWORK.chainId}</strong></span></div>
      </div>
    </div>
  )
}
