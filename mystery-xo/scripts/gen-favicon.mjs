// Generate sized favicons from the transparent Photoroom badge.
// Reads /favicon-src.png from the dev server, writes square PNGs at a few sizes.
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const base = process.env.BASE_URL || 'http://localhost:5175'
const src = base + (process.env.SRC || '/favicon-src.png')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(base, { waitUntil: 'domcontentloaded' })

async function render(size) {
  return page.evaluate(async ({ src, size }) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingQuality = 'high'
    // image is square with a centred transparent-padded badge → draw 1:1 to fill
    ctx.drawImage(img, 0, 0, size, size)
    return c.toDataURL('image/png')
  }, { src, size })
}

const outputs = [
  ['public/favicon.png', 256],
  ['public/apple-touch-icon.png', 180],
]
for (const [path, size] of outputs) {
  const dataUrl = await render(size)
  writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log('wrote', path, size + 'px')
}
await browser.close()
