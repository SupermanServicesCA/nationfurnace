# Nation Furnace — Burnaby

Static brand site for **Nation Furnace Heating & Air Conditioning HVAC Ltd.**
Live at <https://supermanservicesca.github.io/nationfurnace/>.

This is also the **reference implementation** for client brand properties. To stand one up for
another client, see [Using this as a template](#using-this-as-a-template).

---

## How it works

Every HTML file, plus `sitemap.xml` and `robots.txt`, is **generated from `site.config.json`**
by `build.mjs`. Do not edit the HTML directly — the next build overwrites it, and CI fails the
push if the committed files drift from the config.

```bash
node build.mjs           # regenerate everything
node build.mjs --check   # fail if the committed files are stale (this is what CI runs)
```

No dependencies, no bundler, no framework. Node 18+ is the only requirement, and only at build
time. What GitHub Pages serves is plain HTML, one stylesheet and WebP images.

| File | Role |
|---|---|
| `site.config.json` | **All content and data.** The only file you normally edit. |
| `build.mjs` | Renderer, plus the self-checks listed below. |
| `pull-config.mjs` | Generates a starter config for another client from the CRM. |
| `style.css` | One stylesheet, light and dark via `prefers-color-scheme`. |
| `img/*.webp` | Job photos. Every key here must appear in `config.images`. |
| `*.html`, `sitemap.xml`, `robots.txt` | **Generated. Do not edit.** |

### What the build refuses to ship

`build.mjs` exits non-zero on any of these, so they cannot reach production:

- a `<title>` over 60 characters, or a description outside 70–160
- more than one `<main>` or more than one `<h1>` on a page
- an image referenced in config with no file in `img/`, or with no alt text
- an image committed to `img/` that no page uses
- an internal link to a page that does not exist
- JSON-LD that does not parse

### Content placeholders

Inside any config string:

| Token | Renders |
|---|---|
| `{{link:URL\|text}}` | a link |
| `{{servicesLink}}` | link to the services page |
| `{{featureLink}}` | link to the feature page, using `feature.linkText` |

---

## Using this as a template

1. **Fill the client's NAP in the CRM first.** `pull-config.mjs` reads it; nothing works without it.
2. Create the repo and copy in `build.mjs`, `pull-config.mjs`, `style.css`, `.github/`, `.nojekyll`.
3. Generate a starter config:
   ```bash
   node pull-config.mjs <client_id> > site.config.json
   ```
   Everything factual — NAP, hours, geo, socials, service areas, and the client's own city page
   URLs ranked by impressions — is filled from the database. Everything written is left as a
   `TODO —` marker. The raw CRM data you need in order to write it is parked under `_notes`;
   **delete that key before shipping.**
4. Write the prose. Search the file for `TODO —` until none remain.
5. Choose photos (see the warning below), drop them in `img/`, describe them in `config.images`.
6. `node build.mjs`, commit, push, enable Pages, then **set the repo homepage field** — that link
   is one of the few crawl paths a new subdomain gets.

### Photos: check every one by eye

The CRM's `content_assets` library contains images that are **not the client's own work**.
Building this site turned up three in one twelve-image sample: a screenshot of a competitor's
Instagram post, a screenshot of a Google image result carrying a copyright notice, and a
letterboxed phone screengrab. All three had confident, accurate-sounding `alt_text` describing
the equipment in frame, because the vision pass describes what is *depicted* and has no concept
of provenance.

**Look at every image before you publish it.** A contact sheet of the candidates takes a minute
and is the only reliable check.

### Copy rules learned the hard way

- **Write as the business, in first person.** Third-person "the company offers…" reads as a
  scraped directory listing, which is the register that gets these properties ignored.
- **Never explain what the page is.** No "this page is a business profile", no "these questions
  came from People Also Ask". Just answer the question.
- **Do not invent local colour.** A confident sentence about call volumes or local water hardness
  is a fabrication with the same weight as a made-up statistic, and it is harder to spot.
- **No prices.** Quote ranges age badly and the client has not approved them.
- Links belong inside prose. A run of "Full details: [link]" is a link list wearing a costume.

---

## Where the content came from

NAP from `client_nap_locations` row `ab78f741-ce0f-494c-b903-d673a154470d`; socials from
`client_brand`; geo and rating from the linked Google Business Profile record; photos from
`content_assets`; the boiler questions from a People Also Ask harvest against
`/boiler-repair-burnaby`.

**The NAP does not sync.** If it changes in the CRM, change `site.config.json` and rebuild.

## Copy that needs a tradesperson's eye

The boiler answers were drafted by someone who is not an HVAC technician. They avoid prices and
specific figures deliberately. Anyone from the company should correct them.

## Known limits

- `robots.txt` sits at `/nationfurnace/robots.txt`. Crawlers read the one at the domain root,
  which this repository does not control. It is kept for the sitemap reference.
- `FAQPage` markup will not produce rich results — Google limited those to recognised government
  and health sites in 2023. It stays because it describes the page correctly.
- Moving the site means changing `site.baseUrl` and rebuilding. Every canonical, `og:url`,
  sitemap entry and JSON-LD `@id` is derived from it.
- Bump `site.cssVersion` whenever you edit `style.css`. Pages caches assets, so returning
  visitors keep the old file otherwise.
