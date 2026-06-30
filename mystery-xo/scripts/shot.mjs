// Screenshot harness for visual verification against the style guide.
// Usage: node scripts/shot.mjs <outPath> [urlPath] [width] [height]
import { chromium } from 'playwright'

const out = process.argv[2] || 'shot.png'
const path = process.argv[3] || '/'
const width = Number(process.argv[4] || 430)
const height = Number(process.argv[5] || 932)
const base = process.env.BASE_URL || 'http://localhost:5175'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(base + path, { waitUntil: 'networkidle', timeout: 20000 })
// give webfonts a beat to settle
await page.waitForTimeout(700)
try { await page.evaluate(() => document.fonts && document.fonts.ready) } catch {}

// optional click-through by CSS selector: SELECTORS='[".btn--primary"]' (in order)
if (process.env.SELECTORS) {
  const selectors = JSON.parse(process.env.SELECTORS)
  for (const sel of selectors) {
    await page.locator(sel).first().click()
    await page.waitForTimeout(500)
  }
}
// optional fills: FILLS='[["placeholder","value"],...]'
if (process.env.FILLS) {
  for (const [ph, val] of JSON.parse(process.env.FILLS)) {
    await page.getByPlaceholder(ph).first().fill(val)
  }
  await page.waitForTimeout(300)
}
// interleaved sequence: STEPS='[{"fill":["اسمك","نور"]},{"click":".btn--primary"},{"wait":800}]'
if (process.env.STEPS) {
  for (const step of JSON.parse(process.env.STEPS)) {
    if (step.click) await page.locator(step.click).first().click()
    else if (step.fill) await page.getByPlaceholder(step.fill[0]).first().fill(step.fill[1])
    else if (step.evalClickText) {
      await page.evaluate((t) => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t)
        if (b) b.click()
      }, step.evalClickText)
    }
    else if (step.eval) await page.evaluate(step.eval)
    await page.waitForTimeout(step.wait || 500)
  }
}

await page.waitForTimeout(400)
await page.screenshot({ path: out })
await browser.close()

if (errors.length) {
  console.log('PAGE ERRORS:\n' + errors.join('\n'))
} else {
  console.log('OK no console/page errors — saved ' + out)
}
