// Ability-collision smoke test (same-cell فخ-vs-فخ and فخ-vs-باور), plus a control that a
// NORMAL باور on an empty cell still claims instantly with no question.
// Run the server with a SHORT announcement so the timed popup doesn't take ~12s:
//   COLLISION_ANNOUNCE_SECONDS=2 node server/src/index.js
//   BASE_URL=http://localhost:3001 node scripts/mp-ability.mjs <dir>
import { chromium } from 'playwright'
import { buildQuestionPool } from '../src/game/data/questions/index.js'

const TEXT_A = 'فخخناها كلنا، والحين نشوف من يعرف يلعبها صح'
const TEXT_B = '، كأنك يا أبو زيد ما غزيت… الأرض مفخّخة، ما تاخذها بالساهل'

// Both players pick 'جغرافيا', so the engine's pool is the geography questions in order
// (buildQuestionPool is deterministic — no shuffle). The pass-turn move draws pool[0];
// the collision challenge draws pool[1] — so we know its correct option up front.
const GEO = buildQuestionPool(['geography'])
const PASS_WRONG = (GEO[0].correctAnswerIndex + 1) % 4 // wrong answer → X doesn't claim, turn passes
const COLLIDE_CORRECT = GEO[1].correctAnswerIndex
const COLLIDE_WRONG = (COLLIDE_CORRECT + 1) % 4

const base = process.env.BASE_URL || 'http://localhost:5175'
const dir = process.argv[2] || '.'
const browser = await chromium.launch()
const errors = []
let failures = 0

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
// Fire the option's real click handler via the DOM — bypasses Playwright's hit-test retry,
// which fights the handler's optimistic pointer-events lock (esp. on the bottom option).
const clickOption = (p, i) => p.evaluate((idx) => document.querySelectorAll('.qoptions .qoption')[idx]?.click(), i)

// DOM readers (server-authoritative UI)
const cellOwner = (p, i) => p.evaluate((idx) => {
  const c = document.querySelectorAll('.cell')[idx]
  return c ? (c.classList.contains('is-x') ? 'X' : c.classList.contains('is-o') ? 'O' : null) : null
}, i)
const qCount = (p) => p.locator('.qoption').count()
const popupText = (p) => p.evaluate(() => document.querySelector('.collision__text')?.textContent ?? null)
const popupButtons = (p) => p.evaluate(() => document.querySelectorAll('.dialog.collision button').length)
const turnline = (p) => p.evaluate(() => document.querySelector('.turnline')?.textContent?.trim() ?? '')

function check(label, cond) {
  if (!cond) failures += 1
  console.log(`  ${cond ? 'PASS' : 'FAIL'} — ${label}`)
}

async function startMatch(tag) {
  const ctxA = await browser.newContext(vp); const A = await ctxA.newPage(); wire(A, `${tag}-X`)
  const ctxB = await browser.newContext(vp); const B = await ctxB.newPage(); wire(B, `${tag}-O`)
  await A.goto(base + '/', { waitUntil: 'networkidle' }); await wait(A, 400)
  await A.locator('.btn--primary').first().click(); await wait(A, 300)
  await A.getByPlaceholder('أدخل اسمك').fill('نورة'); await clickText(A, 'إنشاء غرفة'); await wait(A, 1200)
  const code = (await A.locator('.code-display').first().textContent()).trim()
  await B.goto(`${base}/?room=${code}`, { waitUntil: 'networkidle' }); await wait(B, 400)
  await B.locator('.btn--primary').first().click(); await wait(B, 300)
  await B.getByPlaceholder('أدخل اسمك').fill('سعد'); await clickText(B, 'انضمام لغرفة'); await wait(B, 1200)
  await B.locator('.cat-chip', { hasText: 'جغرافيا' }).first().click(); await wait(B, 300)
  await A.locator('.cat-chip', { hasText: 'جغرافيا' }).first().click(); await wait(A, 300)
  await clickText(B, 'أنا مستعد'); await wait(B, 500); await clickText(A, 'أنا مستعد'); await wait(A, 1500); await wait(B, 500)
  return { A, B, ctxA, ctxB }
}

// X clicks a normal cell and answers WRONG, handing the turn to O and keeping the board
// clean (X claims nothing). The trap X placed earlier stays put.
async function xPassesTurn(A, B, cellIdx) {
  await A.locator('.cell').nth(cellIdx).click()
  await A.waitForSelector('.qoption', { timeout: 8000 })
  await clickOption(A, PASS_WRONG)
  await wait(A, 1800); await wait(B, 400)
}

// Shared collision run: X traps cell 4, passes the turn, then O collides on cell 4 with
// `oAbility` ('trap' → Case A, 'power' → Case B). Both race the shared pool[1] question,
// whose correct option we know. `xPick`/`oPick` are option indices; X answers first.
async function runCollision(tag, oAbility, expectText, { xPick, oPick, expectOwner, note }) {
  console.log(`\n== Case ${oAbility === 'trap' ? 'A (فخ vs فخ)' : 'B (فخ vs باور)'} — ${note} ==`)
  const { A, B, ctxA, ctxB } = await startMatch(tag)

  // X arms trap (4th chip) and drops it on cell 4 — FREE placement, keeps X's turn.
  await A.locator('.abilitybar .ability').nth(3).click(); await wait(A, 400)
  await A.locator('.cell').nth(4).click(); await wait(A, 700); await wait(B, 400)
  const trapOnX = await A.locator('.cell__mark--trap').count()
  const trapOnO = await B.locator('.cell__mark--trap').count()
  check('trap placed opened no question', (await qCount(A)) === 0)
  check('X sees its own trap, O does not', trapOnX > 0 && trapOnO === 0)

  await xPassesTurn(A, B, 0) // hand the turn to O

  // O collides on cell 4 (trap → Case A, power → Case B): arm chip then click cell 4.
  await B.locator('.abilitybar .ability').nth(oAbility === 'trap' ? 3 : 0).click(); await wait(B, 400)
  await B.locator('.cell').nth(4).click(); await wait(B, 700); await wait(A, 400)

  // Timed announcement popup, no button, on BOTH teams.
  check('announcement shows on X with expected text', (await popupText(A)) === expectText)
  check('announcement shows on O with expected text', (await popupText(B)) === expectText)
  check('announcement has NO button', (await popupButtons(A)) === 0 && (await popupButtons(B)) === 0)
  check('no question yet during announcement', (await qCount(A)) === 0)
  await A.screenshot({ path: `${dir}/collision-${oAbility}-announce.png` })

  // Popup auto-dismisses (server timer) → the SAME question opens for BOTH teams.
  await A.waitForSelector('.qoption', { timeout: 8000 })
  await B.waitForSelector('.qoption', { timeout: 8000 })
  check('question auto-opened for BOTH teams', (await qCount(A)) > 0 && (await qCount(B)) > 0)
  check('announcement popup gone once question opens', (await popupText(A)) === null)

  // Race: X answers first, then O. First correct answer claims cell 4.
  await clickOption(A, xPick); await wait(A, 250)
  await clickOption(B, oPick)
  await wait(A, 2000); await wait(B, 500) // reveal (900ms) + finalize
  check(`cell 4 → ${expectOwner ?? 'nobody'} (${note})`, (await cellOwner(A, 4)) === expectOwner)
  check('turn passed to X (opponent of the O attacker)', (await turnline(A)).includes('دورك'))
  await A.screenshot({ path: `${dir}/collision-${oAbility}-result.png` })

  await ctxA.close(); await ctxB.close()
}

// ---- Control: a NORMAL باور on an empty, non-trapped cell claims instantly, no question ----
console.log('\n== Control: normal باور claims instantly ==')
{
  const { A, B, ctxA, ctxB } = await startMatch('power')
  await A.locator('.abilitybar .ability').nth(0).click(); await wait(A, 400) // arm power
  await A.locator('.cell').nth(0).click(); await wait(A, 800); await wait(B, 300)
  check('normal power claimed cell 0 for X', (await cellOwner(A, 0)) === 'X')
  check('normal power opened NO question', (await qCount(A)) === 0)
  check('normal power showed NO collision popup', (await popupText(A)) === null)
  check('turn passed to O', (await turnline(B)).includes('دورك'))
  await ctxA.close(); await ctxB.close()
}

// Case A: X answers correctly first → X claims the contested cell (first-correct wins).
await runCollision('caseA', 'trap', TEXT_A, {
  xPick: COLLIDE_CORRECT, oPick: COLLIDE_WRONG, expectOwner: 'X', note: 'X correct first → X wins',
})
// Case B: X answers wrong (locked out), then O answers correctly → O claims the cell.
await runCollision('caseB', 'power', TEXT_B, {
  xPick: COLLIDE_WRONG, oPick: COLLIDE_CORRECT, expectOwner: 'O', note: 'X wrong locked out, O correct → O wins',
})

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`)
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors')
await browser.close()
process.exit(failures === 0 && errors.length === 0 ? 0 : 1)
