# Compdawg landing: feature map

Every page, section, and user-facing feature a visitor can reach, with its route
or on-page anchor. Facts are taken from the code in this repo (`index.html`,
`404.html`, `functions/`, `assets/`). The marketing site is static and deployed
to Cloudflare Pages at https://compdawg.com; the signup, login, and book-a-call
actions hand off to the separate app at `app.compdawg.com` and to a Typeform.

## Pages

| Page | Route | File |
| --- | --- | --- |
| Landing page | `/` | `index.html` |
| Not-found page | any unmatched path, e.g. `/does-not-exist` | `404.html` |

## Site-wide elements (present on `/`)

- **Skip link** to `#main` for keyboard users.
- **Top navigation** (`#top`) with a brand logo linking to `#top` and links to
  What we watch (`#watch`), How it works (`#how`), Compare (`#compare`),
  Plans (`#plans`), Strategic (`#strategic`), and FAQ (`#faq`).
- **Primary CTA** in the nav: "Sign up free" opens the signup dialog.
- **Hamburger menu** that toggles a **mobile menu** (`#mobile-menu`) mirroring
  the nav links plus a "Sign up free" button.
- **Footer** with the wordmark, a footer nav repeating the section links, a
  "Sign up" link, and a copyright line "© 2026 Compdawg".
- **Signup dialog** (`#signup-dialog`), described under Forms below.

## Sections on the landing page

### Hero (top of `/`)
- H1 "Know everything your competitors are doing and how to capitalize on it"
  with a subhead and a "Sign up free" CTA (opens signup dialog).
- A CSS/HTML product mockup (not an image) labelled as an example dashboard.

### What we watch — `/#watch`
- H2 plus 19 source cards, each a source Compdawg monitors: News, Posts, Hiring,
  Hires, Filings, Meta (ads), LinkedIn (ads), Google (ads), Bing (ads),
  Leadership, Pricing, Webpages, Positioning, Launches, Reviews, Sentiment,
  Search, SEO, AEO.
- A mobile accordion that regroups the same sources into buckets: Webpages,
  People, Ads, Feedback, SEO, AEO, Filings.
- Section CTA "Sign up free" (opens signup dialog).

### How it works — `/#how`
- Three numbered steps: Add your competitors; We monitor thousands of sources
  (checked monthly on Free, weekly on Core, daily on Strategic); You get key
  insights.

### Compare — `/#compare`
- A scrollable comparison table of Compdawg vs Crayon, Klue, and Contify,
  grouped into Insights and strategy, Sources watched, and Delivery and price
  (covers rows such as who the insights are written for, Site Watch subdomains,
  email cadence, battlecards, free plan, and published price).
- Section CTA "Sign up free" (opens signup dialog).

### Plans — `/#plans`
- Three plan cards:
  - **Free** — $0, no card needed. 1 company, checked every month, a battlecard,
    a monthly summary, a report on how to compete, every signal with its source
    link. CTA "Sign up free" (opens signup dialog).
  - **Core** (highlighted) — $2,000 per month. Up to 10 companies, checked every
    week, battlecards, details on what each important move means, positioning and
    gap analysis, a weekly report and a monthly summary. CTA "Sign up for Core"
    (opens signup dialog).
  - **Strategic** — $5,000 per month. Everything in Core plus daily checks, up to
    30 companies, research across 20+ categories, a strategic report with
    prioritized recommendations and a roadmap, the Top Dawg Matrix, and a monthly
    summary reviewed by the team. CTA "Book a call" (opens Typeform in a new tab).
- An upgrade prompt with "Sign up for Core" (dialog) and "Book a Strategic call"
  (Typeform).
- A full **feature comparison table** ("What each plan includes") across
  Monitoring, Summaries and reports, and Strategic analysis, with per-plan CTAs
  in the table footer.
- Section CTA "Sign up free" (opens signup dialog).

### Strategic — `/#strategic`
- The **Compdawg A-Game Framework**: Aspire, Assess, Anticipate, Act, Achieve.
- Two stages: **Company profiles** and **Your strategic report**, each with a
  feature list.
- **The categories**: 22 research-category chips, with a mobile accordion that
  groups them into Strategy and direction, Market and competition, Product and
  business, Go to market, and Customers and reputation.
- **The Compdawg Top Dawg Matrix**: an example 2x2 SVG plotting opportunities by
  commercial value and ease of execution (quadrants Table Stakes, Top Dawg,
  Cage It, Big Dig) with a numbered legend. Section CTA "Book a call" (Typeform).
- **Sample Strategic report**: an embedded 7-slide carousel (`#sr-track`) with
  previous/next controls (`#sr-prev`, `#sr-next`), dots (`#sr-dots`), and a
  "1 of 7" counter (`#sr-counter`).

### Get started — `/#free`
- Copy block listing what a free account gives you, plus a **plan chooser**
  (`#free-form`, anchor `#demo`) with three buttons: Free (dialog), Core
  (dialog), Strategic (Typeform).

### FAQ — `/#faq`
- 13 expandable questions (`<details>`) covering plan differences, who Free is
  for, when to move to Core, what Strategic adds, upgrading, the free report,
  free-for-life, check frequency, what is watched, acting on findings, setup,
  who gets summaries, and how to get started.

### Final CTA — bottom of `/`
- H2 "Get started with the competitor that worries you most" and a "Sign up
  free" CTA (opens signup dialog).

## Forms and interactive controls

### Signup dialog (`#signup-dialog`)
- Opened by any control marked `data-signup-open` (the "Sign up free" / "Sign up
  for Core" / Free / Core buttons across the page). Logic in `assets/signup.js`
  and `assets/app.js`.
- Fields: **Work email** (`#signup-email`) and **Password (at least 12
  characters)** (`#signup-password`). Submit button "Create account".
- Client validation requires a valid email and a 12+ character password; errors
  show in `#signup-error`.
- On submit it POSTs JSON to `https://app.compdawg.com/api/auth/signup` with
  credentials included. On success it redirects to
  `https://app.compdawg.com/welcome`; server errors are shown inline. Credentials
  are not stored in browser storage.
- "Already have an account? Sign in" links to `https://app.compdawg.com/login`.

### Outbound actions
- **Sign up / Create account** → signup dialog → `app.compdawg.com` app.
- **Book a call / Strategic** → `https://form.typeform.com/to/XvtHPkwo`
  (opens in a new tab).
- **Sign in** → `https://app.compdawg.com/login`.

## Functions endpoints (`functions/`)

- `functions/_middleware.js` — a Cloudflare Pages Function that runs on every
  request. If the hostname is `www.compdawg.com`, it issues a 301 redirect to
  the same path on `https://compdawg.com`; otherwise it passes the request
  through. There are no GET/POST API endpoints served from this repo; signup and
  auth are handled by the separate `app.compdawg.com` service.

## 404 behavior

- `404.html` renders a branded not-found page with a "Back to Compdawg" link to
  `./`. It is marked `noindex`. Cloudflare Pages serves it for unmatched paths.
