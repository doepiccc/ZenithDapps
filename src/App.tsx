import { lazy, Suspense, useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { LandingPage } from './pages/LandingPage'

const pages = {
  zenlink: lazy(() => import('./pages/apps/ZenLinkPage').then((module) => ({ default: module.ZenLinkPage }))),
  pactfi: lazy(() => import('./pages/apps/PactFiPage').then((module) => ({ default: module.PactFiPage }))),
  splitzen: lazy(() => import('./pages/apps/SplitZenPage').then((module) => ({ default: module.SplitZenPage }))),
  microretail: lazy(() => import('./pages/apps/MicroRetailPage').then((module) => ({ default: module.MicroRetailPage }))),
  substream: lazy(() => import('./pages/apps/SubStreamPage').then((module) => ({ default: module.SubStreamPage }))),
  safedeal: lazy(() => import('./pages/apps/SafeDealPage').then((module) => ({ default: module.SafeDealPage }))),
  flashpredict: lazy(() => import('./pages/apps/FlashPredictPage').then((module) => ({ default: module.FlashPredictPage }))),
  fairtix: lazy(() => import('./pages/apps/FairTixPage').then((module) => ({ default: module.FairTixPage }))),
  deadman: lazy(() => import('./pages/apps/DeadManPage').then((module) => ({ default: module.DeadManPage }))),
  gumroad: lazy(() => import('./pages/apps/GumroadPage').then((module) => ({ default: module.GumroadPage }))),
}

type PageId = keyof typeof pages

function currentPage(): PageId | null {
  const match = window.location.hash.match(/^#\/app\/([^/?]+)/)
  const id = match?.[1]
  return id && id in pages ? id as PageId : null
}

function PageLoader() {
  return <div className="page-loader"><span><LoaderCircle className="spin" /></span><strong>Loading Zenith app</strong><small>Preparing contract interface…</small></div>
}

export default function App() {
  const [page, setPage] = useState<PageId | null>(() => currentPage())
  useEffect(() => {
    const update = () => {
      setPage(currentPage())
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  if (!page) return <LandingPage />
  const Component = pages[page]
  return <Suspense fallback={<PageLoader />}><Component /></Suspense>
}
