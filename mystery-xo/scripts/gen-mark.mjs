// Generate /public/xo-logo-mark.png: a circular cut-out of the round badge from
// xo-logo.png (transparent corners), by detecting the badge bounds from pixels.
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const base = process.env.BASE_URL || 'http://localhost:5175'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(base, { waitUntil: 'domcontentloaded' })

const dataUrl = await page.evaluate(async (src) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src })
  const w = img.naturalWidth, h = img.naturalHeight
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const { data } = ctx.getImageData(0, 0, w, h)
  // find bounding box of "content" pixels (not near-cream background)
  let minX = w, minY = h, maxX = 0, maxY = 0
  const isContent = (r, g, b, a) => a > 30 && !(r > 224 && g > 218 && b > 212)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (isContent(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const radius = Math.max(maxX - minX, maxY - minY) / 2 * 1.015
  // output: a square canvas tightly around the circle, clipped to a circle
  const size = Math.ceil(radius * 2)
  const out = document.createElement('canvas')
  out.width = size; out.height = size
  const octx = out.getContext('2d')
  octx.save()
  octx.beginPath()
  octx.arc(size / 2, size / 2, radius, 0, Math.PI * 2)
  octx.closePath()
  octx.clip()
  octx.drawImage(img, (size / 2 - cx), (size / 2 - cy))
  octx.restore()
  return out.toDataURL('image/png')
}, base + '/xo-logo.png')

const b64 = dataUrl.split(',')[1]
const outPath = process.argv[2] || 'public/xo-logo-mark.png'
writeFileSync(outPath, Buffer.from(b64, 'base64'))
console.log('wrote ' + outPath + ' (' + b64.length + ' b64 chars)')
await browser.close()
