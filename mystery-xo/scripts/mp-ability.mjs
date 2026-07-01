// Trap smoke test: host (X) arms TRAP and places it on an empty cell.
// Verifies placement is FREE (turn does NOT switch, no question), the owner sees the
// trap marker, and the enemy (guest) does NOT — then the host takes a normal turn.
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
// pick a category on both, then ready — the match auto-starts.
await B.locator('.cat-chip', { hasText: 'جغرافيا' }).first().click(); await wait(B, 400); await A.locator('.cat-chip', { hasText: 'جغرافيا' }).first().click(); await wait(A, 400)
await clickText(B, 'أنا مستعد'); await wait(B, 600); await clickText(A, 'أنا مستعد'); await wait(A, 1600)

// host (X, first turn) arms TRAP (4th ability chip)
await A.locator('.abilitybar .ability').nth(3).click()
await wait(A, 700)
const armed = await A.locator('.ability.is-armed').count()
console.log('after arming trap — armed chips:', armed)
await A.screenshot({ path: `${dir}/trap-host-armed.png` })

// host places the trap on cell 0 — should NOT switch the turn and NOT open a question
await A.locator('.cell').nth(0).click()
await wait(A, 900); await wait(B, 500)
const hostTrapMarks = await A.locator('.cell__mark--trap').count()
const guestTrapMarks = await B.locator('.cell__mark--trap').count()
const trapUsed = await A.locator('.ability.is-used').count()
const qAfterPlace = await A.locator('.qoption').count()
const hostTurn = (await A.locator('.turnline').first().textContent()).trim()
console.log('after placing trap:')
console.log('  host sees trap marker (should be >0):', hostTrapMarks)
console.log('  guest sees trap marker (should be 0):', guestTrapMarks)
console.log('  trap chip used on host (should be >0):', trapUsed)
console.log('  question shown by placement (should be 0):', qAfterPlace)
console.log('  host turnline (should still be host\'s turn):', hostTurn)
await A.screenshot({ path: `${dir}/trap-host-placed.png` })
await B.screenshot({ path: `${dir}/trap-guest-placed.png` })

// host still has their turn: click another empty cell -> question opens (normal turn)
await A.locator('.cell').nth(1).click()
await wait(A, 900); await wait(B, 300)
const qHost = await A.locator('.qoption').count()
const qGuest = await B.locator('.qoption').count()
console.log('normal turn continues — host sees question:', qHost > 0, '| guest sees same question:', qGuest > 0)
await A.screenshot({ path: `${dir}/trap-host-question.png` })

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
