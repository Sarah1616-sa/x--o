# Tokens — the single source of truth

Every color, size, and shadow in the app comes from these tokens. Components never hardcode values; they reference token names. To re-tint later, change a value here and it propagates everywhere.

The palette is derived directly from the logo and the app background — cream "paper" sticker shapes, dark-maroon ink and outlines, a red brand pop, and a gold highlight, all sitting on the red dotted field.

## The full token block

Drop this in `:root`. Values are exact (sampled from the brand assets); the names are stable.

```css
:root {
  /* ====================== BRAND PALETTE ====================== */

  /* Background — the app-wide red dotted field (given, fixed) */
  --bg-top:     #EF5646;   /* gradient start (top) */
  --bg-bottom:  #E02038;   /* gradient end (bottom) */
  --bg-dot:     #40000D;   /* dot color */

  /* Surfaces — cream "paper / sticker" (everything sits on cream) */
  --cream:      #F9F4F0;   /* primary surface: cards, sheets, buttons, fields */
  --cream-2:    #ECE3D6;   /* inset / secondary / pressed surface */

  /* Ink — dark maroon (text on cream, outlines, the hard shadow) */
  --maroon:     #40000D;   /* primary ink + outline + shadow (same as the dots) */
  --maroon-2:   #6E1322;   /* secondary text / softer depth */

  /* Accents */
  --red:        #E5243B;   /* brand red — the "X", emphasis on cream */
  --red-deep:   #B5172C;   /* red sticker's hard-shadow companion */
  --gold:       #FDB446;   /* the "O" — the highlight / primary-action color */
  --gold-deep:  #D88A1E;   /* gold sticker's hard-shadow companion */

  /* On-color text (what text color to use ON each fill) */
  --on-cream:   var(--maroon);
  --on-red:     var(--cream);
  --on-gold:    var(--maroon);
  --on-maroon:  var(--cream);

  /* Status — kept inside the palette so nothing clashes with the theme */
  --ok:         #2FA36B;
  --warn:       var(--gold);
  --danger:     var(--red);

  /* ====================== SHAPE ====================== */
  --radius-sm:   12px;
  --radius:      18px;
  --radius-lg:   26px;
  --radius-pill: 999px;
  --stroke-w:    3px;          /* sticker outline weight (matches the logo) */

  /* ====================== DEPTH (static, no blur) ====================== */
  /* The signature look: a HARD offset shadow in maroon — like the logo.
     No soft/blurred shadows anywhere. No gradients-for-depth. */
  --lift:        6px;                       /* how far a sticker floats above its shadow */
  --shadow-hard: 0 var(--lift) 0 var(--maroon);

  /* ====================== SPACE (8-based) ====================== */
  --s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

  /* ====================== TYPE ====================== */
  /* Display: a heavy, rounded Arabic display face (matches the logo's lettering).
     Lalezar and Baloo Bhaijaan 2 are close, free, and support Arabic + Latin.
     If you own the exact logo font, set it first. */
  --font-display: "Lalezar", "Baloo Bhaijaan 2", system-ui, sans-serif;
  --font-body:    "Cairo", "Tajawal", system-ui, sans-serif;

  /* A deliberately small, minimal scale — few sizes, clear hierarchy */
  --fs-hero:  clamp(2.5rem, 11vw, 4.5rem);  /* logo wordmark, win/lose, the moment */
  --fs-title: clamp(1.6rem, 6vw, 2.4rem);   /* screen titles, prompts */
  --fs-lead:  clamp(1.15rem, 4.5vw, 1.4rem);/* button labels, lead text */
  --fs-body:  1rem;
  --fs-meta:  0.8125rem;                     /* counts, captions, fine print */
}
```

> **No-animation note.** This theme uses **no transitions and no keyframe animations**. Interactive feedback (pressed/selected) is an **instant** state swap, never a tween. There is no `--ease`/`--duration` token on purpose.

## The background recipe

The app background is consistent everywhere: a vertical red gradient with a staggered grid of maroon dots, plus an optional darker "floor" band at the bottom. It's pure CSS — no image needed (a PNG fallback lives in `assets/background.png`).

```css
/* Apply to the root app element (full-bleed, fixed behind everything) */
.app-bg {
  background-color: var(--bg-bottom);
  background-image:
    /* two offset dot layers → the staggered grid */
    radial-gradient(var(--bg-dot) 1.6px, transparent 1.8px),
    radial-gradient(var(--bg-dot) 1.6px, transparent 1.8px),
    /* the vertical red gradient underneath */
    linear-gradient(180deg, var(--bg-top), var(--bg-bottom));
  background-size: 104px 96px, 104px 96px, 100% 100%;
  background-position: 0 0, 52px 48px, 0 0;   /* 2nd layer offset half a cell = staggered */
  background-repeat: repeat, repeat, no-repeat;
}

/* OPTIONAL: the darker "floor" band at the bottom (soft staged depth).
   Uses multiply so the dots still show through the darkening. */
.app-bg::after {
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 22%;
  pointer-events: none;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--maroon) 30%, transparent));
  mix-blend-mode: multiply;
}
```

Tuning: dot size is the `1.6px`/`1.8px` pair; dot spacing is the `104px 96px` tile (keep the 2nd position at exactly half: `52px 48px`). Larger tile = sparser dots.

## How to use the palette (the rules of thumb)

- **Red field = the page.** The dotted red background is the canvas. Content never sits directly on it as bare text — it sits on cream.
- **Cream = every surface.** Cards, sheets, buttons, inputs, the game board: all cream stickers floating on the red.
- **Maroon = ink + edge + shadow.** Text on cream, the outline around stickers, and the hard offset shadow are all maroon. This one color does all the "structure" work.
- **Gold = the one action.** Reserve gold for the single primary action / highlight on a screen (the "do this"). Overusing gold kills the hierarchy.
- **Red = brand pop, used sparingly.** The "X" mark, a key number, a small emphasis on cream. Don't fill big buttons with red — it disappears against the red background.
- **Pure white is banned.** Surfaces are `--cream`, never `#FFF`. White breaks the warm sticker feel instantly.
