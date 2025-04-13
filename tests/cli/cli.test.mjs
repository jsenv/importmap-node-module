import { execSync } from 'node:child_process'
import { takeFileSnapshot } from '@jsenv/snapshot'

const indexHtmlFileUrl = import.meta.resolve('./client/index.html')
const indexHtmlFileSnapshot = takeFileSnapshot(indexHtmlFileUrl)

execSync('node ../../../src/cli.mjs ./index.html', { cwd: new URL(import.meta.resolve('./client/')) })

indexHtmlFileSnapshot.compare()