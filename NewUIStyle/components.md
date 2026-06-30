# Components — the themed kit (all static)

Every component is a **cream sticker on the red field**: cream fill, maroon outline, maroon hard offset shadow. That single construction — copied straight from the logo — gives a tactile, chunky feel **without any motion**. Pick the fill (cream / gold / maroon) to set the role; everything else stays consistent.

Reminder: **no transitions, no animations.** Pressed/selected states are instant style swaps.

## The sticker base

Every surface inherits this. Learn it once; everything else is a variation.

```css
.sticker {
  background: var(--cream);
  color: var(--on-cream);
  border: var(--stroke-w) solid var(--maroon);
  border-radius: var(--radius);
  box-shadow: var(--shadow-hard);     /* hard maroon offset — no blur */
}
```

## Buttons

Three roles. All share the sticker base; only the fill changes. Each colored fill pairs with its own deep companion for the shadow so the offset reads as the same hue, darker.

```css
.btn {
  font-family: var(--font-display);
  font-size: var(--fs-lead);
  line-height: 1;
  border: var(--stroke-w) solid var(--maroon);
  border-radius: var(--radius);
  padding: var(--s-4) var(--s-5);
  min-height: 56px;                   /* big, thumb-friendly */
  width: 100%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}

/* PRIMARY — the one action on the screen. Gold. */
.btn--primary { background: var(--gold);  color: var(--on-gold);  box-shadow: 0 var(--lift) 0 var(--gold-deep); }

/* SECONDARY — the lesser option. Cream. */
.btn--secondary { background: var(--cream); color: var(--on-cream); box-shadow: var(--shadow-hard); }

/* DESTRUCTIVE / DARK — delete, leave, etc. Maroon. */
.btn--danger { background: var(--maroon); color: var(--on-maroon); box-shadow: 0 var(--lift) 0 #1d0006; }

/* GHOST — tertiary. Outline only, sits on cream surfaces. No shadow. */
.btn--ghost { background: transparent; color: var(--maroon); box-shadow: none; }

/* Pressed: INSTANT swap — drop onto the shadow, no transition. Optional but recommended. */
.btn:active { transform: translateY(var(--lift)); box-shadow: none; }
.btn--ghost:active { transform: none; background: var(--cream-2); }

/* Keyboard focus must stay visible */
.btn:focus-visible { outline: var(--stroke-w) solid var(--maroon); outline-offset: 3px; }

.btn:disabled { opacity: .55; cursor: not-allowed; }

/* Pill variant for compact actions */
.btn--pill { border-radius: var(--radius-pill); padding-inline: var(--s-6); width: auto; }
```

Rule: **one `--primary` (gold) button per screen.** If two things are gold, neither reads as THE action.

## Card / panel

The workhorse container — a cream sticker holding content.

```css
.card { /* = .sticker */ padding: var(--s-5); }
.card__title { font-family: var(--font-display); font-size: var(--fs-title); color: var(--maroon); margin: 0 0 var(--s-3); }
.card__text  { font-family: var(--font-body); color: var(--maroon-2); margin: 0; }
```

## Menu / list

A menu is a stack of cream rows. Two valid styles — pick one per surface, don't mix:

**A) Grouped list** (rows inside one card, maroon hairline dividers):
```css
.list { /* = .sticker */ padding: 0; overflow: hidden; }
.list__row {
  display: flex; align-items: center; gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
  font-family: var(--font-body); font-weight: 700; color: var(--maroon);
  border-bottom: 2px solid color-mix(in srgb, var(--maroon) 14%, transparent);
}
.list__row:last-child { border-bottom: none; }
.list__row:active { background: var(--cream-2); }   /* instant */
.list__row .chevron { margin-inline-start: auto; }  /* flips in RTL automatically */
```

**B) Separated stickers** (each item its own floating sticker — more playful, more spacing):
```css
.menu { display: flex; flex-direction: column; gap: var(--s-4); }
.menu__item { /* = .sticker */ padding: var(--s-4) var(--s-5); font-family: var(--font-display); font-size: var(--fs-lead); }
.menu__item:active { transform: translateY(var(--lift)); box-shadow: none; }
```

## Inputs

Cream field, maroon outline and ink. Focus thickens the outline to gold — no glow, no animation.

```css
.field {
  width: 100%; min-height: 56px;
  background: var(--cream); color: var(--maroon);
  border: var(--stroke-w) solid var(--maroon);
  border-radius: var(--radius);
  padding: var(--s-4) var(--s-5);
  font-family: var(--font-body); font-size: var(--fs-body); font-weight: 700;
  box-shadow: var(--shadow-hard);
}
.field::placeholder { color: color-mix(in srgb, var(--maroon) 45%, transparent); }
.field:focus { outline: none; border-color: var(--gold); }

/* Segmented room/match code — big, central, obviously fillable */
.code { display: flex; gap: var(--s-3); justify-content: center; direction: ltr; } /* codes read LTR */
.code__box {
  width: 56px; height: 68px; text-align: center;
  font-family: var(--font-display); font-size: 2rem; color: var(--maroon);
  background: var(--cream); border: var(--stroke-w) solid var(--maroon);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-hard);
}
.code__box:focus { outline: none; border-color: var(--gold); }
```

## Toggle / switch (static)

```css
.switch { width: 60px; height: 34px; border: var(--stroke-w) solid var(--maroon);
  border-radius: var(--radius-pill); background: var(--cream-2); position: relative; cursor: pointer; }
.switch__knob { position: absolute; top: 2px; inset-inline-start: 2px;
  width: 26px; height: 26px; border-radius: 50%; background: var(--maroon); }
.switch[aria-checked="true"] { background: var(--gold); }
.switch[aria-checked="true"] .switch__knob { inset-inline-start: auto; inset-inline-end: 2px; } /* instant */
```

## Tabs / segmented control

```css
.segmented { display: flex; gap: 4px; padding: 4px;
  background: var(--cream-2); border: var(--stroke-w) solid var(--maroon); border-radius: var(--radius-pill); }
.segmented__tab { flex: 1; text-align: center; padding: var(--s-2) var(--s-4);
  border-radius: var(--radius-pill); font-family: var(--font-display); color: var(--maroon-2); cursor: pointer; }
.segmented__tab[aria-selected="true"] { background: var(--cream); color: var(--maroon); box-shadow: var(--shadow-hard); }
```

## Modal / dialog

A cream sheet over a maroon scrim. It simply appears — **no entrance animation**.

```css
.scrim { position: fixed; inset: 0; background: color-mix(in srgb, var(--maroon) 55%, transparent); }
.dialog { /* = .sticker */ border-radius: var(--radius-lg); padding: var(--s-6);
  width: min(92%, 420px); position: fixed; inset-block-start: 50%; inset-inline-start: 50%;
  transform: translate(-50%, -50%); }
```

## Header / top bar

Sits on the red field. Logo + title; actions are small cream/gold pills.

```css
.topbar { display: flex; align-items: center; gap: var(--s-3); padding: var(--s-4) var(--s-5); }
.topbar__logo { height: 40px; width: auto; }                 /* the round X-O badge */
.topbar__title { font-family: var(--font-display); font-size: var(--fs-title); color: var(--cream); }
/* Title text on the red field is cream; add a subtle maroon text-shadow for the logo's "stuck-on" look */
.on-red-title { color: var(--cream); text-shadow: 0 2px 0 var(--maroon); }
```

## Badge / chip

```css
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px;
  font-family: var(--font-display); font-size: var(--fs-meta);
  border: 2px solid var(--maroon); border-radius: var(--radius-pill); background: var(--gold); color: var(--maroon); }
.badge--cream { background: var(--cream); }
```

## Player chip / avatar

For lobby/turn indicators. Cream circle, maroon outline, the player's mark inside.

```css
.player { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.player__avatar { width: 64px; height: 64px; border-radius: 50%;
  background: var(--cream); border: var(--stroke-w) solid var(--maroon);
  box-shadow: var(--shadow-hard); display: grid; place-items: center;
  font-family: var(--font-display); font-size: 2rem; }
.player__name { font-family: var(--font-body); font-weight: 700; font-size: var(--fs-meta); color: var(--cream); }
/* whose turn: outline the active player's avatar in gold */
.player.is-turn .player__avatar { border-color: var(--gold); }
```

## Game board (the X-O surface)

The board is the centerpiece — a cream sticker grid, exactly like the logo. **X = red, O = gold** (the brand's two accents), grid lines maroon.

```css
.board { /* = .sticker */ border-radius: var(--radius-lg); padding: var(--s-3);
  display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--s-3);
  width: min(86vw, 360px); aspect-ratio: 1; }
.cell { background: var(--cream-2); border: 2px solid var(--maroon); border-radius: var(--radius-sm);
  display: grid; place-items: center; font-family: var(--font-display); font-size: clamp(2rem, 12vw, 3.5rem); cursor: pointer; }
.cell:active { background: var(--cream); }            /* instant */
.cell.is-x { color: var(--red); }
.cell.is-o { color: var(--gold); }
.cell.is-win { background: var(--gold); color: var(--maroon); }  /* winning line highlight */
```

(If the app has other games, give their primary surface the same treatment: cream board sticker, maroon lines, red/gold marks.)

## Icons

Use **chunky, filled, rounded** icons — never thin hairline strokes; they must match the fat sticker weight. Color them `--maroon` on cream, `--cream` on the red field. Directional icons (back, next, arrows) mirror in RTL; the logo/brand mark does not.

## Component rules

- **One construction:** cream fill + maroon `--stroke-w` outline + maroon hard `--shadow-hard`. Everything is a variation of it.
- **One shadow language:** the hard maroon offset. **Never** a soft/blurred shadow — that instantly reads as a generic web app and breaks the sticker world.
- **Consistent radius** from the tokens (don't invent new corner sizes).
- **State = instant.** Pressed, selected, active-turn, win — each is an unmistakable instant swap (fill/outline change), never a tween.
- **Min 56px** tap targets (44px absolute floor).
- **One gold thing per screen.** Gold marks the single primary action; everything else is cream or maroon.
