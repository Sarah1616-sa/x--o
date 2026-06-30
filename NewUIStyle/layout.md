# Layout — the app shell & how screens are composed

The structure carries over from the reference party games (app-like, phone-shaped, one clear action per screen, RTL-native) — but presented **minimally and statically**: lots of breathing room, few elements, cream stickers floating on the red dotted field.

## The shell

The red dotted background is fixed behind everything; a centered phone-width column holds the screen.

```html
<div class="app app-bg">
  <main class="screen">
    <header class="screen__top"><!-- logo / title / small actions --></header>
    <section class="screen__body"><!-- the content; usually ONE focal sticker --></section>
    <footer class="screen__action"><!-- the single primary (gold) button --></footer>
  </main>
</div>
```

```css
.app {
  position: fixed; inset: 0;            /* pin the shell; the page never scrolls as a whole */
  display: flex; justify-content: center;
  overflow: hidden;
}
.screen {
  position: relative;
  width: 100%; max-width: 480px;        /* a "phone" even on desktop — never sprawl wide */
  height: 100dvh;                        /* dvh tracks the real visible height on mobile */
  display: flex; flex-direction: column;
  padding:
    calc(env(safe-area-inset-top) + var(--s-4))
    calc(env(safe-area-inset-right) + var(--s-5))
    calc(env(safe-area-inset-bottom) + var(--s-4))
    calc(env(safe-area-inset-left) + var(--s-5));
}
.screen__body   { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: var(--s-5); }
.screen__action { margin-top: auto; padding-top: var(--s-4); }  /* primary action anchored in thumb reach */
```

Global reset for the app-like feel (same intent as the reference games — remove the "web page" tells):

```css
html, body { margin: 0; height: 100%; overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent; user-select: none;
  font-family: var(--font-body); color: var(--cream); background: var(--bg-bottom); }
.selectable { user-select: text; }     /* re-enable only where needed, e.g. a match code */
*, *::before, *::after { box-sizing: border-box; }
```

Viewport meta (app-like, notch-aware, RTL):
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#E02038">
<html dir="rtl" lang="ar">
```

## Composing a screen — minimal by rule

The "minimal way of presenting things" you asked for, made concrete:

- **One focal sticker per screen.** A screen shows a single main thing — a card, the board, a prompt — centered with room around it. Resist filling space.
- **One primary (gold) action.** Anchored at the bottom. Secondary actions are cream; rare tertiary actions are ghost/text.
- **Generous space.** Use `--s-5`/`--s-6` between elements. Crowding breaks the calm, confident feel.
- **Type leads.** The biggest element is usually a word (title/prompt/score) in the display face, not a block of body text.
- **Few words.** Short labels, plain verbs. The interface says only what helps the player act (see the writing rules below).
- **Content lives on cream.** Never float bare paragraphs on the red field; put text on a cream sticker. Titles directly on red are fine in cream with a small maroon text-shadow (the "stuck-on" look).

ASCII of a typical screen:

```
┌─────────────────────────┐   ← red dotted field (app-bg)
│        [X-O logo]        │   top: logo / title (cream on red)
│                          │
│      ╔═══════════╗       │
│      ║  cream    ║       │   body: ONE focal sticker, centered
│      ║  sticker  ║       │   (card / board / prompt)
│      ╚═══════════╝       │
│                          │
│   ▓▓▓ GOLD BUTTON ▓▓▓    │   action: single primary, thumb reach
└─────────────────────────┘
```

## Scrolling

The shell never scrolls as a page (that reintroduces bounce and the "document" feel). If content overflows, scroll an **inner** region only:

```css
.scroll-region { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
```

Most screens shouldn't need it — if a screen overflows a phone, it's probably doing too much; split it.

## RTL — build it in, don't retrofit

The brand is Arabic; RTL is the default.

- `dir="rtl"` on `<html>`.
- Use **logical** properties only — `margin-inline-start`, `padding-inline`, `inset-inline-start`, `text-align: start`. They flip automatically with `dir`; physical `left`/`right` do not.
- Directional icons (back, next, chevrons) mirror in RTL. The round X-O logo and brand marks do not.
- The match-code input reads **LTR** even inside the RTL UI (`direction: ltr` on `.code`) since codes are left-to-right.

## The logo & background

- **Background**: apply `app-bg` to the root and leave it consistent on every screen. Per the brief it's effectively fixed across the app; don't swap it per screen.
- **Logo**: the round X-O badge (`assets/logo.png`). Use it at the top of the home screen large, and small in the top bar elsewhere. Give it room — it's a sticker, so don't crowd it against edges or other stickers. Don't recolor or restyle it.

## Quality floor (still applies, even minimal & static)

- Responsive down to a small phone; the phone-width column centers on desktop.
- Visible keyboard focus on every interactive element (don't strip outlines globally).
- Tap targets ≥ 44px (easy — everything is chunky).
- High contrast preserved: cream on red, maroon on cream.
- Reduced-motion is moot (there is no motion), but never reintroduce animation to "fix" a screen — solve it with layout, space, and hierarchy.

## A note on writing (copy is part of the theme)

Short, plain, active. Name things by what the player does: "Play", "Create match", "Join", "Leave". A button's label matches the result it produces. Empty and error states give direction in the interface's voice ("No players yet — share the code to invite friends"), never mood or apology. Keep it sentence case and tuned to a friendly, playful brand.
