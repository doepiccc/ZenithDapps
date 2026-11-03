import type { LucideIcon } from 'lucide-react'

export type AppId =
  | 'zenlink'
  | 'pactfi'
  | 'splitzen'
  | 'microretail'
  | 'substream'
  | 'safedeal'
  | 'flashpredict'
  | 'fairtix'
  | 'deadman'
  | 'gumroad'

export type AppCategory = 'payments' | 'streaming' | 'assets'

export interface ZenithAppDefinition {
  id: AppId
  index: string
  name: string
  tagline: string
  description: string
  category: AppCategory
  contractKey: string
  icon: LucideIcon
  accent: string
  stat: string
  statLabel: string
  features: string[]
}

export interface DeploymentRecord {
  address: string
  txHash?: string
  blockNumber?: number
  deployedAt?: string
  contractName?: string
}

export interface DeploymentManifest {
  schemaVersion: number
  chainId: number
  network: string
  updatedAt: string | null
  deployer: string | null
  contracts: Record<string, string | DeploymentRecord>
}

export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info'
  title: string
  detail?: string
}
