// Ability smoke test: host arms POWER, claims a cell instantly (no question), turn switches.
import { chromium } from 'playwright'
const base = process.env.BASE_URL || 'http://localhost:5175'
const dir = process.argv[2] || '.'
const browser = await chromium.launch()
const errors = []
const wire = (p, t) => { p.on('console', (m) => m.type() === 'error' && errors.push(`[${t}] ${m.text()}`)); p.on('pageerror', (e) => errors.push(`[${t}] ${e.message}`)) }
const clickText = async (p, t) => { await p.waitForFunction((x) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === x), t, { timeout: 8000 }); await p.evaluate((x) => { const b = [...document.querySelectorAll('button')].find((y) => y.textContent.trim() === x); b && b.click() }, t) }
const wait = (p, ms) => p.waitForTimeout(ms)
const vp = { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }

const A = await (await browser.newContext(vp)).newPage(); wire(A, 'host')
const B = await (await browser.newContext(vp)).newPage(); wire(B, 'guest')

await A.goto(base + '/', { waitUntil: 'networkidle' }); await wait(A, 500)
await A.locator('.btn--primary').first().click(); await wait(A, 400)
await A.getByPlaceholder('أدخل اسمك').fill('نورة'); await clickText(A, 'إنشاء غرفة'); await wait(A, 1400)
const code = (await A.locator('.code-display').first().textContent()).trim()
await B.goto(`${base}/?room=${code}`, { waitUntil: 'networkidle' }); await wait(B, 500)
await B.locator('.btn--primary').first().click(); await wait(B, 400)
await B.getByPlaceholder('أدخل اسمك').fill('سعد'); await clickText(B, 'انضمام لغرفة'); await wait(B, 1400)
await clickText(B, 'أنا مستعد'); await wait(B, 600); await clickText(A, 'أنا مستعد'); await wait(A, 600)
await clickText(A, 'ابدأ المباراة'); await wait(A, 1600)

// host (X) arms power
await A.locator('.abilitybar .ability').nth(0).click()
await wait(A, 700)
const armed = await A.locator('.ability.is-armed').count()
const targets = await A.locator('.cell.is-target').count()
console.log('after arming power — armed chips:', armed, '| target cells:', targets)
await A.screenshot({ path: `${dir}/ab-host-armed.png` })

// host clicks a cell -> instant power claim, NO question, turn switches
await A.locator('.cell').first().click()
await wait(A, 1000); await wait(B, 500)
const xMarks = await A.locator('.cell.is-x').count()
const qVisible = await A.locator('.qoption').count()
const turn = (await A.locator('.turnline').first().textContent()).trim()
console.log('after power claim — X marks:', xMarks, '| question shown (should be 0):', qVisible, '| turnline:', turn)
await A.screenshot({ path: `${dir}/ab-host-claimed.png` })
await B.screenshot({ path: `${dir}/ab-guest-claimed.png` })

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
