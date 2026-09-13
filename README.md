# RK English

A digital shelf for an English tuition teacher's writings — paragraphs, letters, notices, reports and more —
organised by board, class, chapter and writing type. Add by typing, by speaking, or by photographing a page
from a book; read anything in-app; share as a properly formatted, branded PDF straight into WhatsApp;
install it like a real app on the phone's home screen.

Made by Krishnendu © 2026.

---

## The whole process, start to finish

You need three free accounts working together. **GitHub** only stores the code — it cannot run a database
or a scheduled job. **Neon** is the actual database. **Vercel** is what runs the app, serves it to the
phone, talks to Neon, and fires the daily cron job. Total time: about 15–20 minutes the first time.

### Step 1 — Create the database on Neon

1. Go to **neon.tech** and sign up (the free tier is enough for this).
2. Click **Create a project**. Give it any name, e.g. `rk-english`. Keep the default Postgres version.
3. Once it's created, open the **SQL Editor** from the left sidebar.
4. Open `schema.sql` from this ZIP, select all of it, copy it, paste it into the SQL Editor, and click
   **Run**. You should see "Success" — this creates the `writings`, `app_settings` and `backups` tables.
5. Click **Connection Details** (or **Dashboard → Connect**). Copy the connection string shown — it starts
   with `postgres://` and ends with `?sslmode=require`. Keep this tab open, you'll need it in Step 3.

### Step 2 — Put the code on GitHub

1. Go to **github.com**, sign in (or sign up), click the **+** in the top right → **New repository**.
2. Name it `rk-english`, keep it **Private** (recommended, since it's just for your own use) or Public,
   don't add a README/gitignore (you already have them), click **Create repository**.
3. On the next page, click **uploading an existing file**. Unzip this ZIP on your computer, then drag the
   *contents* of the `rk-english-app` folder (not the folder itself — the `app`, `components`, `lib`,
   `public` folders and the loose files like `package.json`) into the upload box.
4. Scroll down, click **Commit changes**.

*(If you're comfortable with `git` on a computer, the normal way also works: `git init`, `git add .`,
`git commit -m "Initial commit"`, `git remote add origin <your repo URL>`, `git push -u origin main`.)*

### Step 3 — Deploy on Vercel

1. Go to **vercel.com**, sign up using your GitHub account (this lets Vercel see your repos).
2. Click **Add New… → Project**. Find `rk-english` in the list and click **Import**.
3. Before clicking Deploy, expand **Environment Variables** and add exactly two:
   - Name: `DATABASE_URL` — Value: the Neon connection string from Step 1.
   - Name: `CRON_SECRET` — Value: any long random text you type yourself (30+ random characters is fine —
     mash the keyboard). This just locks the daily-backup endpoint so no one else can trigger it.
4. Click **Deploy**. Wait a minute or two — Vercel installs everything and builds the app.
5. When it finishes, click **Visit** (or copy the `https://rk-english-yourname.vercel.app` link shown).

### Step 4 — Install it like a real app on her phone

1. Open that link on her phone in **Chrome** (Android) or **Safari** (iPhone).
2. **Android/Chrome**: a banner appears in the app itself — "Install RK English" — tap **Install**. (If it
   doesn't show, tap Chrome's ⋮ menu → **Install app**.) It's added to the home screen with its own icon,
   and opens full-screen with no address bar, exactly like an installed app.
3. **iPhone/Safari**: tap the Share icon → **Add to Home Screen** → **Add**. Same result — a home-screen
   icon that opens full-screen.

From here on, she just taps that icon. Everything she adds is saved permanently in Neon.

### Step 5 (optional) — if you'd already deployed the previous version

Only needed if you ran an *older* `schema.sql` before this update: open the Neon SQL Editor again and run
the contents of `migrations.sql`. It adds a few new columns (favourites, a recoverable Trash, and the
"who is this official letter to" field) and is safe to run even if you're not sure — it won't error or
duplicate anything. A brand-new database doesn't need this; the current `schema.sql` already includes it.

---

## Being honest about "0 bugs"

I can't run `npm install` or `next build` from where I'm working — this environment has no internet
access, so I've never been able to actually execute this project end-to-end. What I have done, carefully:

- Hand-reviewed every file for correct Next.js App Router conventions (route handlers, client/server
  component boundaries, metadata API).
- Checked every import against every export across the whole project, so nothing points at a function or
  component that doesn't exist.
- Verified every bracket/brace/parenthesis balances in every file.
- Checked every database column name is used consistently between `schema.sql`, the API routes, and the
  frontend.

That's real verification, but it isn't the same as a live test run. Please treat the first deploy as
exactly that — a first test run — and if anything errors (Vercel shows build errors right on the deployment
page, and the app itself shows a message if it can't reach the database), send me the exact text of the
error and I'll fix it immediately.

---

## What the app does

- **Add** a writing three ways: type it, **speak it** (tap the mic next to Title or Body — set to Indian
  English so it understands local names and accent much better than the default), or **scan a photo** of a
  book page — drag the crop handles over exactly the passage you want, and it reads the text automatically
  (always editable before saving).
- **Set up all her formats in one pass** — a guided wizard in Settings walks through every letter type and
  Notice, one after another: photograph a sample from her book, review what was detected (receiver's
  address, salutation, closing wording, sender's address, and whether the date sits at the top or the
  bottom), correct anything, save, move to the next type. Every writing type really does look different —
  a formal letter isn't a notice isn't a personal letter — so each one is taught and stored separately, and
  can be re-taught any time in Settings without redoing the others.
- **Authentic structure by default** — even before anything is taught, formal letters, applications and
  editor's letters follow the real WBBSE convention: "To, [receiver's address]" first, salutation "Sir,",
  the body, then "Thanking you, / Yours faithfully," with her signature, address, and the date at the very
  end as "Dated ___". Teaching a format from a photo fine-tunes this to match her specific book.
- **Send a whole class's writings at once** — filter by Class (the quick chips), tap **Select**, tap
  **Select all**, then **PDF** or **WhatsApp** in the bar at the bottom: every selected writing goes out as
  one combined, branded PDF in a single tap.
- **Organise** everything by Board/Medium, Class (1–12), Chapter, and Writing Type. One-tap class chips and
  a ★ Favourites chip sit right under the search bar for instant filtering; the full filter panel covers
  everything else.
- **Read in-app** — tap any card, shown as a properly formatted page, no download needed.
- **Auto-formatting** for formal letters, personal letters, editor's letters, notices and reports — the
  standard Indian-English/WBBSE structure (Date, "To,", salutation, "Dear ___,", subscription, NOTICE
  heading, byline, etc.) is inserted from just a name and a couple of dropdown choices.
- **Remembers her habits** — the sender's name, place, institution, and closing style used last time for
  each writing type are filled in automatically next time.
- **Her own phrases** — in Settings, she can add her own opening lines and closing phrases per writing
  type, so the dropdowns grow to match how she actually writes, plus set her usual name/place/institution
  as defaults.
- **★ Favourites** — star any writing for instant access later.
- **Duplicate** — turn any writing into a starting point for a new one (e.g. the same letter for a
  different class) in one tap, instead of retyping the whole format.
- **Word count** shown under every writing.
- **Edit and delete** both ask for confirmation first.
- **Share** — one writing or several at once — as a PDF, one tap into WhatsApp via the phone's native share
  sheet (falls back to a text-summary link on phones that don't support file sharing this way).
- **Branded on every page** — every single page of every exported PDF carries an "RK English" footer with a
  small logo mark and "Made by Krishnendu © 2026", including page 2, 3, etc. of a long writing or a
  multi-writing bulk export — not just a small caption on the first page.
- **Installs as a real app** from Chrome/Safari — its own icon, its own full-screen window, no browser bar.
- **Automatic daily backups** via the Vercel cron job, plus manual "Download full backup (JSON)" and
  "Download everything as one PDF" buttons in Settings.

## A few honest technical limits

- **The PDF footer branding is prominent and permanent on every page, but it is still normal PDF text** —
  no PDF format can make text technically un-selectable without turning the whole page into an image (which
  would stop students from being able to select/copy *their own writing* to revise it, which defeats the
  purpose). What I've done instead is make "RK English © Krishnendu" a proper designed part of every page,
  not a tiny afterthought — so realistically nobody strips it, and every copy shared onward carries the
  branding with it, which is what actually gets it seen by other people.
- **Voice typing** uses Chrome's built-in speech engine, set to `en-IN` (Indian English). It works well on
  Chrome for Android and desktop Chrome/Edge. It isn't available in Firefox or iPhone Safari — the mic
  button simply doesn't appear there, so typing/scanning still work as normal.
- **Photo scanning and format-learning** both use on-device OCR (with position data for the latter) —
  good with clear, well-lit, fairly horizontal text; handwriting, curved book spines, or blurry photos may
  be misread. That's exactly why format-learning always shows a review screen — nothing is saved as "the"
  format until she confirms it, and she can always fix or re-scan it later in Settings. This is pattern
  matching (looking at where text sits on the page and matching a few known phrases), not true
  understanding of the page, so treat its first guess as a draft to check, not a guarantee.
- **Installing as an app** works exactly as described on Chrome (Android/desktop) and Safari (iPhone) — this
  is the real, standard way any web app becomes an installable app; it is not a Play Store/App Store
  listing, but functionally (icon, full-screen, offline-tolerant shell) it behaves like one.

## Local development (optional)

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL
npm run dev
```

Open `http://localhost:3000`.
