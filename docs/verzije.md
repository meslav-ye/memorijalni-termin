# Verzije alata

Dohvaćeno uživo s npm registryja, **nije pisano po sjećanju**, i provjereno
stvarnim pokretanjem `typecheck`, `lint` i `build` (sva tri prolaze s izlaznim kodom 0).

**Datum provjere: 2026-09-05**

## Instalirano

| Paket | Zakucano | Najnovije stabilno | Napomena |
|---|---|---|---|
| next | 16.3.4 | 16.3.4 | objavljeno 2026-08-31 |
| react | 19.2.8 | 19.2.8 | |
| react-dom | 19.2.8 | 19.2.8 | |
| tailwindcss | 4.3.3 | 4.3.3 | |
| @tailwindcss/postcss | 4.3.3 | 4.3.3 | |
| @types/node | 26.4.1 | 26.4.1 | **podignuto** s template zadanih `^20` |
| @types/react | 19.2.18 | 19.2.18 | |
| @types/react-dom | 19.2.7 | 19.2.7 | |
| eslint-config-next | 16.3.4 | 16.3.4 | |
| **typescript** | **6.0.3** | 7.0.2 | ⚠️ namjerno starije — vidi dolje |
| **eslint** | **9.39.5** | 10.10.0 | ⚠️ namjerno starije — vidi dolje |

Sve je zakucano na točnu verziju. Nigdje `^`, `~` ni `latest` — `create-next-app`
je generirao raspone (`^4`, `^19`, `^5`) i oni su zamijenjeni točnim vrijednostima.

## Zašto typescript nije 7.0.2

TypeScript 7 je nativni port prevoditelja. **Sam po sebi radi** — `tsc --noEmit` prolazi
čisto. Ali `typescript-eslint` ga odbija, i to tvrdo, ne kao upozorenje:

```
Error: typescript-eslint does not support TS 7.0.
```

Tracking issue: `typescript-eslint#10940` (podrška za TS >=7.1).
`@typescript-eslint/parser@8.69.0` deklarira peer dep `typescript >=4.8.4 <6.1.0`.

Zato je uzeta **6.0.3** — najviša stabilna verzija koja **ulazi u taj raspon**, umjesto
pada na 5.9.3. Kad `typescript-eslint` podigne podršku, bump na 7.x je jedna linija.

## Zašto eslint nije 10.10.0

`eslint-config-next@16.3.4` deklarira `eslint >=9.0.0`, što izgleda kao da 10 prolazi.
Ali dodaci koje povlači staju na 9:

- `eslint-plugin-react@7.37.5` → `^3 || … || ^9.7`
- `eslint-plugin-import@2.32.0` → `^2 || … || ^9`
- `eslint-plugin-jsx-a11y@6.10.2` → `^3 || … || ^9`

Uz ESLint 10 `eslint-plugin-react` se sruši unutar `resolveBasedir` pri lintanju
`app/layout.tsx`. Nije upozorenje — lint pukne s izlaznim kodom 2.

**Napomena:** npm označava *cijelu* 9.x liniju kao deprecated ("no longer supported").
To je ESLintova politika kad izađe novi major, **nije sigurnosna ranjivost**. ESLint je
alat koji se vrti samo pri razvoju i nikad ne dođe do korisnika, pa je rizik zanemariv.
Ovo se rješava samo od sebe kad Next.js objavi `eslint-config-next` s podrškom za ESLint 10.

**Razmatrana alternativa:** `create-next-app` nudi `--biome` umjesto ESLinta. Biome je
jedan alat bez ekosustava dodataka, pa ovog problema nema. Odbačeno jer bismo izgubili
Nextova vlastita pravila (npr. upozorenje kad se koristi `<img>` umjesto `<Image>`),
a ona su ovdje korisna. Prelazak na Biome je kasnije moguć bez dirania ostatka projekta.

## Ako nešto zaškripi

Ako se pojavi neobjašnjivo ponašanje u tipovima ili lintu, prvi korak u dijagnostici je
provjeriti nije li uzrok baš ova kombinacija, a ne vlastiti kod. Izlazi:

- typescript 6.0.3 → 5.9.3
- eslint 9.39.5 → ostati (nema niže smislene opcije)
