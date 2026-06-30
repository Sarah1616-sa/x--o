---
name: xo-ui-theme
description: >-
  The official house UI theme for the X-O (اكس او) app — a flat, static, "cream-sticker-on-a-red-
  dotted-field" visual system with dark-maroon ink and hard offset shadows, a gold highlight, and
  bold rounded Arabic display type. USE THIS SKILL FOR EVERY piece of UI in this product: any
  button, menu, card, input, dialog, header, game board, screen, or layout. Trigger it whenever
  building, restyling, reviewing, or remapping the app's interface, whenever the user mentions the
  theme, the logo, the red dotted background, the cream/maroon/gold colors, making components
  "match the theme," or keeping the look consistent across the team — even if they don't name the
  theme explicitly. This skill supersedes any earlier UI-style skill for this product and is the
  single source of truth. The theme is intentionally MINIMAL and uses NO animations or transitions;
  do not add motion. Color tokens are exact but swappable via tokens.md.
---

# X-O House UI Theme

The one theme every screen in this app follows. The whole look is one idea repeated: **cream "sticker" shapes floating on a red dotted field, edged and shadowed in dark maroon, with gold marking the single action.** It comes straight from the logo — the same construction (cream fill, maroon outline, hard maroon offset shadow) that makes the wordmark feel stuck-on is the construction for every button, card, and panel.

It is deliberately **flat, static, and minimal**: no animation, few elements per screen, generous space, type doing the heavy lifting. The tactile, chunky feel is achieved entirely with **static** properties (outlines + hard offset shadows), so nothing needs to move.

> This skill replaces any prior UI-style skill for this product. When anything conflicts, this wins. It is the team's shared reference — build every component from it so the whole app matches.

## The palette (exact, from the brand assets)

| Token | Value | Role |
|---|---|---|
| `--bg-top` / `--bg-bottom` | `#EF5646` → `#E02038` | the app-wide red background gradient |
| `--bg-dot` | `#40000D` | the background dots |
| `--cream` | `#F9F4F0` | every surface (cards, buttons, fields, board) |
| `--maroon` | `#40000D` | ink, outlines, and the hard offset shadow |
| `--red` | `#E5243B` | brand pop — the "X", emphasis on cream |
| `--gold` | `#FDB446` | the highlight — the "O" and the one primary action |

Full token set, shade companions, type scale, spacing, and the background CSS recipe live in **`references/tokens.md`**. Pure-white surfaces are banned — surfaces are always cream.

## The rules (the constitution)

These are non-negotiable; they're what keep every screen on-theme.

1. **No animation, ever.** No transitions, no keyframes, no motion. Interactive feedback (pressed / selected / active) is an **instant** state swap. If a screen feels flat or unclear, fix it with layout, space, type, and color — never by adding movement.

2. **Everything is a cream sticker on the red field.** The dotted red background is the page; all content sits on cream surfaces. Never float bare text or controls directly on the red.

3. **Depth is the hard maroon offset shadow + maroon outline — never soft, never gradient.** One shadow language across the whole app: `box-shadow: 0 6px 0 var(--maroon)` plus a `3px` maroon outline. A blurred/soft shadow instantly reads as a generic web app and breaks the world.

4. **Maroon is ink, gold is the action, red is the pop.** Maroon does all the structural work (text, edges, shadows). Gold marks the **single** primary action per screen. Red is a sparing accent on cream (don't fill big buttons with red — it vanishes on the red background).

5. **Type leads, and stays minimal.** Heavy rounded Arabic display face for titles, the wordmark, and buttons; a clean companion for body. Few sizes. The biggest element on a screen is usually a word, not a paragraph.

6. **One focal thing + one action per screen.** Show a single main sticker (card, board, prompt) with room around it, and one gold button anchored in thumb reach. Resist filling space. This is the "minimal way of presenting things."

7. **RTL-native.** Arabic-first. Logical CSS properties only, so direction flips with one attribute. Directional icons mirror; the logo doesn't.

8. **High contrast, app-like shell.** Cream on red and maroon on cream stay strongly legible. The shell behaves like a native app (phone-width, full-bleed background, safe-area aware, no page-level scroll/bounce).

9. **The background and logo are fixed brand.** Use the red dotted background consistently on every screen; use the logo as-is (never recolor or restyle it).

## How to build a component or screen

Work in this order; each layer is documented in a reference file.

1. **Load the tokens.** Paste the `:root` block and the `app-bg` recipe. → `references/tokens.md`
2. **Set the shell.** Phone-width column, full-bleed background, safe areas, RTL. → `references/layout.md`
3. **Compose minimally.** One focal cream sticker, one gold action, generous space. → `references/layout.md`
4. **Drop in components.** Build each from the sticker base; pick the fill (cream/gold/maroon) for its role. → `references/components.md`
5. **Check it against the theme** (below), then ship.

To *see* the whole system applied — background, buttons, menus, inputs, board, dialog — open **`style-guide.html`** (a static, self-contained living style guide that doubles as copy-paste source).

## Self-check before shipping any screen

- Is there exactly **one** gold primary action, and is everything else cream/maroon?
- Does all content sit on **cream** stickers (nothing bare on the red)?
- Is every shadow the **hard maroon offset** (zero blur), with a maroon outline?
- Any **animation or transition** sneaking in? → remove it.
- Are surfaces **cream**, never pure white?
- One **focal** element with real breathing room (not a crowded screen)?
- Holds up in **RTL**, including icon mirroring?
- Strip to grayscale: is the hierarchy still clear from shape/contrast alone?

## Anti-patterns (these break the theme)

- **Any motion** — fades, slides, bounces, hovers-that-move. The theme is static.
- **Soft/blurred shadows** or **gradient-for-depth** instead of the hard maroon offset.
- **Pure white** (`#FFF`) surfaces instead of cream.
- **Red-filled large buttons** (disappear on the red background) — use gold or cream.
- **More than one gold element** competing to be "the action."
- **Crowded screens** — many controls, dense text, no breathing room.
- **Thin hairline borders/icons** or **low-contrast grays** (SaaS-dashboard look).
- **Inventing new corner radii, colors, or shadow styles** outside the tokens.
- **Recoloring or restyling the logo**, or swapping the background per screen.

## Files

- `references/tokens.md` — exact tokens, shade companions, type/space/radius, and the background CSS recipe. **Start here.**
- `references/components.md` — every UI element (buttons, menus, cards, inputs, toggles, tabs, dialogs, header, badges, player chips, the game board) built statically in the theme.
- `references/layout.md` — the app shell, minimal screen composition, RTL, scrolling, logo/background placement, and copy rules.
- `style-guide.html` — a static, self-contained preview + living style guide showing it all assembled.
- `assets/logo.png` — the brand logo (use as-is). `assets/background.png` — PNG fallback for the background (the CSS recipe in `tokens.md` is the primary source).
