// 2-player multiplayer smoke test against the live backend + Vite.
// Host creates a room, guest joins by code, both ready, host starts → both enter game.
import { chromium } from 'playwright'

const base = process.env.BASE_URL || 'http://localhost:5175'
const OUT = process.argv[2] || 'mp'

const browser = await chromium.launch()
const errors = []

function wire(page, tag) {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] console: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`))
}
async function clickText(page, text) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === t),
    text, { timeout: 8000 },
  )
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t)
    b && b.click()
  }, text)
}
const wait = (p, ms) => p.waitForTimeout(ms)

// ---- HOST ----
const ctxA = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })
const A = await ctxA.newPage(); wire(A, 'host')
await A.goto(base + '/', { waitUntil: 'networkidle' })
await wait(A, 600)
await A.locator('.btn--primary').first().click() // العب
await wait(A, 500)
await A.getByPlaceholder('أدخل اسمك').fill('نورة')
await clickText(A, 'إنشاء غرفة')
await wait(A, 1500)
const code = (await A.locator('.code-display').first().textContent()).trim()
console.log('room code:', code)

// ---- GUEST ----
const ctxB = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })
const B = await ctxB.newPage(); wire(B, 'guest')
await B.goto(`${base}/?room=${code}`, { waitUntil: 'networkidle' })
await wait(B, 600)
await B.locator('.btn--primary').first().click() // العب
await wait(B, 500)
await B.getByPlaceholder('أدخل اسمك').fill('سعد')
await clickText(B, 'انضمام لغرفة')
await wait(B, 1500)

// ---- PICK CATEGORY + READY (match auto-starts once both are ready) ----
await B.locator('.cat-chip').first().click(); await wait(B, 400)
await A.locator('.cat-chip').first().click(); await wait(A, 400)
await clickText(B, 'أنا مستعد'); await wait(B, 800)
await clickText(A, 'أنا مستعد')
await wait(A, 1800); await wait(B, 1800)

// ---- capture both in-game ----
const dir = process.argv[3] || '.'
await A.screenshot({ path: `${dir}/${OUT}-host.png` })
await B.screenshot({ path: `${dir}/${OUT}-guest.png` })

const hostHasBoard = await A.locator('.board').count()
const guestHasBoard = await B.locator('.board').count()
console.log('host board present:', hostHasBoard > 0, '| guest board present:', guestHasBoard > 0)
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')

await browser.close()
