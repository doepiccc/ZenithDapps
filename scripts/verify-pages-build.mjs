import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist')
const requiredFiles = [
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  '.nojekyll',
  'deployments/zenith-testnet.json',
  'contracts/manifest.json',
]

await Promise.all(requiredFiles.map((file) => access(resolve(outputDirectory, file))))
const html = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')
const references = Array.from(html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi), (match) => match[1])
const absolute = references.filter((reference) => reference.startsWith('/'))
if (absolute.length) throw new Error(`Root-absolute assets cannot be embedded as a submodule: ${absolute.join(', ')}`)

const deployment = JSON.parse(await readFile(resolve(outputDirectory, 'deployments/zenith-testnet.json'), 'utf8'))
if (deployment.chainId !== 936485) throw new Error('Deployment manifest targets the wrong chain.')
console.log('Zenith Apps Pages build verified.')
