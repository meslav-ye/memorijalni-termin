# Predlošci mailova

Supabaseovi zadani mailovi su na engleskom. Ovi predlošci ih zamjenjuju.

**Gdje se lijepe:** Supabase → *Authentication → Emails → Templates*, pa se za svaki
tip odabere kartica i zamijeni sadržaj polja **Message body**.

Varijable u vitičastim zagradama Supabase sam zamjenjuje — ne diraj ih:

| Varijabla | Što je |
|---|---|
| `{{ .ConfirmationURL }}` | Link na koji korisnik klikne |
| `{{ .Email }}` | Email adresa primatelja |
| `{{ .Token }}` | Šesteroznamenkasti kod (ne koristimo) |

Svaki predložak ima i **Subject heading** — i njega treba promijeniti.

---

## 1. Magic Link

**Subject:** `Prijava u Memorijalni termin`

```html
<h2>Prijava u Memorijalni termin</h2>

<p>Klikni na link ispod da uđeš u aplikaciju:</p>

<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#0f172a;color:#ffffff;
            padding:14px 28px;border-radius:8px;text-decoration:none;
            font-weight:600;font-family:system-ui,sans-serif">
    Uđi u aplikaciju
  </a>
</p>

<p style="color:#64748b;font-size:14px">
  Link vrijedi 60 minuta i može se iskoristiti jednom.
  Otvori ga na uređaju s kojeg si tražio prijavu.
</p>

<p style="color:#64748b;font-size:14px">
  Ako nisi ti tražio prijavu, slobodno zanemari ovaj mail — nitko ne može
  ući bez ovog linka.
</p>
```

---

## 2. Confirm signup (potvrda registracije)

**Subject:** `Potvrdi svoju adresu — Memorijalni termin`

```html
<h2>Još samo jedan klik</h2>

<p>Potvrdi da je <strong>{{ .Email }}</strong> stvarno tvoja adresa:</p>

<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#0f172a;color:#ffffff;
            padding:14px 28px;border-radius:8px;text-decoration:none;
            font-weight:600;font-family:system-ui,sans-serif">
    Potvrdi adresu
  </a>
</p>

<p style="color:#64748b;font-size:14px">
  Nakon potvrde upisuješ nadimak i možeš se prijaviti na termine.
</p>

<p style="color:#64748b;font-size:14px">
  Ako se nisi registrirao, zanemari ovaj mail. Račun se bez potvrde ne aktivira.
</p>
```

---

## 3. Reset password (zaboravljena lozinka)

**Subject:** `Nova lozinka — Memorijalni termin`

```html
<h2>Postavljanje nove lozinke</h2>

<p>Klikni na link ispod da postaviš novu lozinku:</p>

<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#0f172a;color:#ffffff;
            padding:14px 28px;border-radius:8px;text-decoration:none;
            font-weight:600;font-family:system-ui,sans-serif">
    Postavi novu lozinku
  </a>
</p>

<p style="color:#64748b;font-size:14px">
  Link vrijedi 60 minuta.
</p>

<p style="color:#64748b;font-size:14px">
  Ako nisi ti tražio promjenu lozinke, zanemari ovaj mail — stara lozinka
  ostaje na snazi.
</p>
```

---

## 4. Invite user (kad admin ručno pozove igrača)

**Subject:** `Pozvan si u Memorijalni termin`

```html
<h2>Pozvan si na termine</h2>

<p>Netko te dodao u aplikaciju za organizaciju nogometnih termina.</p>

<p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#0f172a;color:#ffffff;
            padding:14px 28px;border-radius:8px;text-decoration:none;
            font-weight:600;font-family:system-ui,sans-serif">
    Prihvati poziv
  </a>
</p>

<p style="color:#64748b;font-size:14px">
  Nakon prihvaćanja upisuješ nadimak — to je ime koje se prikazuje na ekranu
  dok traje termin.
</p>
```

---

## Napomena o "Change Email Address"

Taj predložak aplikacija ne koristi (nema ekrana za promjenu adrese), pa ga
nema smisla prevoditi dok se ta mogućnost ne doda.
