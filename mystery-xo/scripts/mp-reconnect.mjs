// Reconnect / removal smoke test — the NEGATIVE paths that must still end the match:
//   Scenario A: explicit مغادرة mid-match → the leaver's team empties → forfeit to the other team.
//   Scenario B: a hard disconnect with NO reconnect within the grace window → same forfeit.
// Run the server with a SHORT grace so B doesn't take 30s, e.g.:
//   RECONNECT_GRACE_MS=1500 node server/src/index.js
//   BASE_URL=http://localhost:3001 node scripts/mp-reconnect.mjs <dir>
import { chromium } from 'playwright'

const base = process.env.BASE_URL || 'http://localhost:5175'
const dir = process.argv[2] || '.'
const browser = await chromium.launch()
const errors = []

const wire = (p, t) => {
  p.on('console', (m) => m.type() === 'error' && errors.push(`[${t}] ${m.text()}`))
  p.on('pageerror', (e) => errors.push(`[${t}] ${e.message}`))
}
const clickText = async (p, t) => {
  await p.waitForFunction((x) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === x), t, { timeout: 8000 })
  await p.evaluate((x) => { const b = [...document.querySelectorAll('button')].find((y) => y.textContent.trim() === x); b && b.click() }, t)
}
const wait = (p, ms) => p.waitForTimeout(ms)
const vp = { viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }

// Drive create → join → ready → auto-start. Returns { ctxA, A, ctxB, B, code }.
async function startMatch(tag) {
  const ctxA = await browser.newContext(vp); const A = await ctxA.newPage(); wire(A, `${tag}-host`)
  const ctxB = await browser.newContext(vp); const B = await ctxB.newPage(); wire(B, `${tag}-guest`)

  await A.goto(base + '/', { waitUntil: 'networkidle' }); await wait(A, 500)
  await A.locator('.btn--primary').first().click(); await wait(A, 400)
  await A.getByPlaceholder('أدخل اسمك').fill('نورة'); await clickText(A, 'إنشاء غرفة'); await wait(A, 1400)
  const code = (await A.locator('.code-display').first().textContent()).trim()

  await B.goto(`${base}/?room=${code}`, { waitUntil: 'networkidle' }); await wait(B, 500)
  await B.locator('.btn--primary').first().click(); await wait(B, 400)
  await B.getByPlaceholder('أدخل اسمك').fill('سعد'); await clickText(B, 'انضمام لغرفة'); await wait(B, 1400)

  await B.locator('.cat-chip', { hasText: 'جغرافيا' }).first().click(); await wait(B, 400)
  await A.locator('.cat-chip', { hasText: 'جغرافيا' }).first().click(); await wait(A, 400)
  await clickText(B, 'أنا مستعد'); await wait(B, 600); await clickText(A, 'أنا مستعد'); await wait(A, 1600); await wait(B, 800)
  return { ctxA, A, ctxB, B, code }
}

// ---- Scenario A: explicit leave that emits room:leave ----
// The in-game مغادرة returns to the lobby view (keeps you in the room, for rematch); the
// LOBBY مغادرة is the one that emits room:leave. Click both to actually leave the room.
{
  const { A, B, ctxA, ctxB } = await startMatch('leave')
  await clickText(A, 'مغادرة'); await wait(A, 800) // game → lobby view (still in room)
  await clickText(A, 'مغادرة'); await wait(B, 1500) // lobby leave → room:leave (team X empties)
  const end = await B.locator('.matchend').count()
  const winner = await B.locator('.matchend__badge--o').count()
  await B.screenshot({ path: `${dir}/rc-leave-guest.png` })
  console.log('SCENARIO A (room:leave) — guest sees match-end:', end > 0, '| winner O shown:', winner > 0,
    end > 0 && winner > 0 ? '→ PASS' : '→ FAIL')
  await ctxA.close(); await ctxB.close()
}

// ---- Scenario B: hard disconnect, no reconnect within grace ----
{
  const { B, ctxA, ctxB } = await startMatch('drop')
  await ctxA.close() // host's socket drops and never comes back
  await wait(B, 4000) // > RECONNECT_GRACE_MS (run server with e.g. 1500)
  const end = await B.locator('.matchend').count()
  const winner = await B.locator('.matchend__badge--o').count()
  await B.screenshot({ path: `${dir}/rc-drop-guest.png` })
  console.log('SCENARIO B (grace-expiry) — guest sees match-end:', end > 0, '| winner O shown:', winner > 0,
    end > 0 && winner > 0 ? '→ PASS' : '→ FAIL')
  await ctxB.close()
}

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
