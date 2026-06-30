// Full synced-game smoke test: create → join → ready → start → question → answer.
import { chromium } from 'playwright'

const base = process.env.BASE_URL || 'http://localhost:5175'
const dir = process.argv[2] || '.'
const browser = await chromium.launch()
const errors = []

function wire(page, tag) {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${tag}] ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`))
}
async function clickText(page, text) {
  await page.waitForFunction((t) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === t), text, { timeout: 8000 })
  await page.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t); b && b.click() }, text)
}
const wait = (p, ms) => p.waitForTimeout(ms)
const vp = { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }

const ctxA = await browser.newContext(vp); const A = await ctxA.newPage(); wire(A, 'host')
const ctxB = await browser.newContext(vp); const B = await ctxB.newPage(); wire(B, 'guest')

// host creates
await A.goto(base + '/', { waitUntil: 'networkidle' }); await wait(A, 500)
await A.locator('.btn--primary').first().click(); await wait(A, 400)
await A.getByPlaceholder('أدخل اسمك').fill('نورة')
await clickText(A, 'إنشاء غرفة'); await wait(A, 1400)
const code = (await A.locator('.code-display').first().textContent()).trim()
console.log('room:', code)

// guest joins
await B.goto(`${base}/?room=${code}`, { waitUntil: 'networkidle' }); await wait(B, 500)
await B.locator('.btn--primary').first().click(); await wait(B, 400)
await B.getByPlaceholder('أدخل اسمك').fill('سعد')
await clickText(B, 'انضمام لغرفة'); await wait(B, 1400)

// ready + start
await clickText(B, 'أنا مستعد'); await wait(B, 700)
await clickText(A, 'أنا مستعد'); await wait(A, 700)
await clickText(A, 'ابدأ المباراة'); await wait(A, 1600); await wait(B, 800)

const boardA = await A.locator('.board').count()
const boardB = await B.locator('.board').count()
console.log('in game — host board:', boardA > 0, '| guest board:', boardB > 0)
await A.screenshot({ path: `${dir}/g-host-1.png` })
await B.screenshot({ path: `${dir}/g-guest-1.png` })

// host (team X, first turn) clicks a cell -> question opens for both
await A.locator('.cell').first().click()
await wait(A, 900); await wait(B, 300)
const qA = await A.locator('.qoption').count()
const qB = await B.locator('.qoption').count()
console.log('after host cell click — host sees question:', qA > 0, '| guest sees same question:', qB > 0)
await A.screenshot({ path: `${dir}/g-host-2q.png` })
await B.screenshot({ path: `${dir}/g-guest-2q.png` })

// host answers correctly (Q1 = capital of KSA, الرياض = 2nd option)
await A.locator('.qoptions .qoption').nth(1).click()
await wait(A, 1800); await wait(B, 600)
const xOnHost = await A.locator('.cell.is-x').count()
const turnHost = (await A.locator('.turnline').first().textContent()).trim()
console.log('after correct answer — X marks on board:', xOnHost, '| host turnline:', turnHost)
await A.screenshot({ path: `${dir}/g-host-3.png` })
await B.screenshot({ path: `${dir}/g-guest-3.png` })

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
