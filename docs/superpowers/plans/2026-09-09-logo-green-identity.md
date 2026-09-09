# Logo & Green Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the neon shield/ball logo with a geometric compact 5v5 pitch mark, wire it into login + PWA icons, and add the `marka-linija` green token.

**Architecture:** SVG mark is the source of truth under `public/brand/`. Login uses an HTML+SVG lockup component (no raster wordmark). A one-shot Node script rasterizes the mark onto `#0c300c` tiles into `public/icons/*.png` and `app/icon.png` via `sharp`. CSS gains `--color-marka-linija`; existing `marka` / `marka-svijetla` hex values stay.

**Tech Stack:** Next.js App Router, Tailwind v4 `@theme`, SVG, `sharp` (dev one-shot), TypeScript.

**Spec:** [`docs/superpowers/specs/2026-09-09-logo-green-identity-design.md`](../specs/2026-09-09-logo-green-identity-design.md)

---

## File map

| File | Role |
|---|---|
| Create `public/brand/mark.svg` | Pitch mark vector (lines only, currentColor strokes) |
| Create `public/brand/mark-on-dark.svg` | Same geometry, stroke `#9fd49f` (for raster script) |
| Create `components/brand/BrandMark.tsx` | Inline SVG React mark |
| Create `components/brand/BrandLockup.tsx` | Mark tile + wordmark + subtitle for login |
| Create `scripts/export-brand-icons.mjs` | Rasterize icons with sharp |
| Modify `app/globals.css` | Add `marka-linija`; update token comments |
| Modify `app/prijava/page.tsx` | Use `BrandLockup`; drop `/logo.png` Image |
| Modify `app/layout.tsx` | Keep themeColor; icons still point at `/icons/*` |
| Replace `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | New pitch tiles |
| Create `app/icon.png` (or overwrite via script into `app/`) | Favicon for App Router |
| Delete `public/logo.png` | Old neon lockup |

---

### Task 1: SVG mark source

**Files:**
- Create: `public/brand/mark.svg`
- Create: `public/brand/mark-on-dark.svg`

- [ ] **Step 1: Write `public/brand/mark.svg`**

Use `currentColor` so React can set `text-marka` or `text-marka-linija`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" fill="none" aria-hidden="true">
  <!-- Compact 5v5 pitch: outline, halfway, centre circle, two goal boxes -->
  <rect x="10" y="14" width="36" height="28" rx="2.5" stroke="currentColor" stroke-width="2.5"/>
  <line x1="28" y1="14" x2="28" y2="42" stroke="currentColor" stroke-width="2.5"/>
  <circle cx="28" cy="28" r="5" stroke="currentColor" stroke-width="2.5"/>
  <rect x="10" y="22" width="5" height="12" stroke="currentColor" stroke-width="2"/>
  <rect x="41" y="22" width="5" height="12" stroke="currentColor" stroke-width="2"/>
</svg>
```

- [ ] **Step 2: Write `public/brand/mark-on-dark.svg`**

Same paths; replace `currentColor` with `#9fd49f` (needed by sharp composite — sharp does not resolve CSS currentColor).

- [ ] **Step 3: Open both files in a browser / Preview and confirm geometry**

Expected: short pitch, centre line, circle, boxes on left and right — no ball, no shield.

- [ ] **Step 4: Commit**

```bash
git add public/brand/mark.svg public/brand/mark-on-dark.svg
git commit -m "feat(brand): add compact 5v5 pitch mark SVG"
```

---

### Task 2: CSS token `marka-linija`

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update `@theme inline` block**

Replace the logo color comment + tokens with:

```css
  /*
    Brand greens (compact 5v5 pitch mark).

    marka          dark pitch green — primary buttons, scoreboard, icon tile
    marka-svijetla mid green — GK badge, success, soft accents
    marka-linija   light pitch lines on dark green (logo strokes)
  */
  --color-marka: #0c300c;
  --color-marka-svijetla: #307830;
  --color-marka-linija: #9fd49f;
```

- [ ] **Step 2: Smoke-check Tailwind sees the token**

Run: `pnpm exec tailwindcss -h` is unnecessary. Instead add a throwaway class in any page temporarily `text-marka-linija` and run `pnpm typecheck` — or just proceed; Tailwind v4 picks `@theme` tokens as utilities automatically.

Verify by grepping build later; for now confirm file saved.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(brand): add marka-linija color token"
```

---

### Task 3: BrandMark + BrandLockup + login

**Files:**
- Create: `components/brand/BrandMark.tsx`
- Create: `components/brand/BrandLockup.tsx`
- Modify: `app/prijava/page.tsx`

- [ ] **Step 1: Create `components/brand/BrandMark.tsx`**

```tsx
type BrandMarkProps = {
  className?: string;
  /** Tailwind text-* color controls stroke via currentColor */
  title?: string;
};

/** Compact 5v5 pitch mark. Stroke follows `currentColor`. */
export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect x="10" y="14" width="36" height="28" rx="2.5" stroke="currentColor" strokeWidth="2.5" />
      <line x1="28" y1="14" x2="28" y2="42" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="28" cy="28" r="5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="10" y="22" width="5" height="12" stroke="currentColor" strokeWidth="2" />
      <rect x="41" y="22" width="5" height="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
```

- [ ] **Step 2: Create `components/brand/BrandLockup.tsx`**

```tsx
import { BrandMark } from "./BrandMark";

type BrandLockupProps = {
  className?: string;
};

/**
 * Login header: dark-green tile + plain Croatian wordmark.
 * Name is text so it can change without redrawing the mark.
 */
export function BrandLockup({ className }: BrandLockupProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-marka"
          aria-hidden
        >
          <BrandMark className="h-10 w-10 text-marka-linija" />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-xl font-bold tracking-tight text-marka">
            Memorijalni termin
          </p>
          <p className="text-sm text-slate-500">5v5 · prijave · uživo</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire login page**

In `app/prijava/page.tsx`:

1. Remove `import Image from "next/image"`.
2. Add `import { BrandLockup } from "@/components/brand/BrandLockup";`
3. Replace the `<Image src="/logo.png" … />` block with:

```tsx
        <BrandLockup />
```

Keep the `sr-only` `<h1>Memorijalni termin</h1>`. Update the comment above the lockup to note the HTML lockup (not a raster plate).

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`  
Expected: PASS

- [ ] **Step 5: Visual check**

Run: `pnpm dev` → open `/prijava`  
Expected: green tile + pitch lines + wordmark; no old shield/ball.

- [ ] **Step 6: Commit**

```bash
git add components/brand/BrandMark.tsx components/brand/BrandLockup.tsx app/prijava/page.tsx
git commit -m "feat(brand): use pitch mark lockup on login"
```

---

### Task 4: Rasterize PWA / favicon icons

**Files:**
- Create: `scripts/export-brand-icons.mjs`
- Replace: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `public/icons/apple-touch-icon.png`
- Create: `app/icon.png` (favicon via App Router file convention — Next prefers this over only metadata icons)
- Delete: `public/logo.png`

- [ ] **Step 1: Ensure `sharp` is available for the script**

Run: `pnpm add -D sharp`  
(If already present transitively, still add as direct devDependency so the script is stable.)

- [ ] **Step 2: Create `scripts/export-brand-icons.mjs`**

```js
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const markPath = path.join(root, "public/brand/mark-on-dark.svg");
const iconsDir = path.join(root, "public/icons");

const MARKA = { r: 0x0c, g: 0x30, b: 0x0c, alpha: 1 };

async function tile(size, { padRatio = 0.18 } = {}) {
  const markSvg = await readFile(markPath);
  const inner = Math.round(size * (1 - 2 * padRatio));
  const markPng = await sharp(markSvg).resize(inner, inner).png().toBuffer();
  const left = Math.round((size - inner) / 2);
  const top = left;

  return sharp({
    create: { width: size, height: size, channels: 4, background: MARKA },
  })
    .composite([{ input: markPng, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  const icon192 = await tile(192, { padRatio: 0.16 });
  const icon512 = await tile(512, { padRatio: 0.16 });
  // Maskable needs larger safe zone (~20%+).
  const maskable = await tile(512, { padRatio: 0.22 });
  const apple = await tile(180, { padRatio: 0.16 });

  await writeFile(path.join(iconsDir, "icon-192.png"), icon192);
  await writeFile(path.join(iconsDir, "icon-512.png"), icon512);
  await writeFile(path.join(iconsDir, "icon-maskable-512.png"), maskable);
  await writeFile(path.join(iconsDir, "apple-touch-icon.png"), apple);
  await writeFile(path.join(root, "app/icon.png"), icon192);

  const oldLogo = path.join(root, "public/logo.png");
  try {
    await unlink(oldLogo);
    console.log("removed public/logo.png");
  } catch (e) {
    if (e && e.code !== "ENOENT") throw e;
  }

  console.log("wrote public/icons/* and app/icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add npm script**

In `package.json` `scripts`:

```json
"brand:icons": "node scripts/export-brand-icons.mjs"
```

- [ ] **Step 4: Run export**

Run: `pnpm brand:icons`  
Expected: console `wrote public/icons/* and app/icon.png` and `removed public/logo.png`

- [ ] **Step 5: Confirm no remaining logo.png references**

Run: `rg 'logo\\.png' -g '!docs/**' -g '!node_modules/**'`  
Expected: no matches in app/components/public (docs history may still mention it — OK)

- [ ] **Step 6: Align `app/layout.tsx` metadata icons if needed**

Keep existing `/icons/...` entries. Next will also serve `app/icon.png` automatically. Leave `themeColor: "#0c300c"`. No manifest path changes required (paths stay the same; files are replaced).

- [ ] **Step 7: Commit**

```bash
git add scripts/export-brand-icons.mjs package.json pnpm-lock.yaml \
  public/icons/icon-192.png public/icons/icon-512.png \
  public/icons/icon-maskable-512.png public/icons/apple-touch-icon.png \
  app/icon.png
git add -u public/logo.png
git commit -m "feat(brand): export pitch mark PWA icons and drop old logo"
```

---

### Task 5: Definition-of-done verification

**Files:** none (verify only)

- [ ] **Step 1: Typecheck + lint + unit tests**

Run: `pnpm typecheck && pnpm lint && pnpm test`  
Expected: all PASS

- [ ] **Step 2: Manual UI checklist**

1. `/prijava` — new lockup visible; old neon gone  
2. `public/icons/icon-512.png` — open file; dark green + light pitch lines  
3. Chrome DevTools → Application → Manifest — icons load  
4. Optional: add to home screen on phone — green pitch tile  

- [ ] **Step 3: Final commit only if leftover dirty files**

If comments/docs need a one-line pointer to the new brand assets, update `PRODUCT.md` Evidence line only when that file is already being committed in this branch; otherwise skip.

---

## Spec coverage checklist

| Spec item | Task |
|---|---|
| Compact 5v5 pitch SVG | Task 1 |
| Colors marka / linija on dark | Tasks 1–2 |
| Login lockup HTML+mark | Task 3 |
| PWA icons 192/512/maskable/apple | Task 4 |
| Favicon | Task 4 (`app/icon.png`) |
| Remove old neon asset | Task 4 |
| `marka-linija` token | Task 2 |
| themeColor / manifest `#0c300c` | unchanged paths; Task 4 replaces files |
| No full UI redesign | respected (out of scope) |

---

## Out of scope (do not do in this plan)

- Renaming the product  
- Live screen / typography / layout redesign  
- Animated logo, marketing site  
- Changing `marka` / `marka-svijetla` hex values  
