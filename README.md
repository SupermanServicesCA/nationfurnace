# Nation Furnace — Burnaby business profile

Static business-profile site for **Nation Furnace Heating & Air Conditioning HVAC Ltd.**
(4170 Still Creek Dr Suite 200, Burnaby, BC V5C 4T5).

Live at: https://supermanservicesca.github.io/nationfurnace/

## What this is

A NAP (name / address / phone) citation property plus four pages of supporting content.
No build step, no framework, no external requests — plain HTML and one stylesheet.

| File | Purpose |
|---|---|
| `index.html` | Business profile, NAP block, hours, `HVACBusiness` JSON-LD |
| `services.html` | The nine services, each linking to its page on nationheating.ca |
| `service-areas.html` | 39 Burnaby neighbourhoods, split north / south |
| `faq.html` | Five boiler questions taken from Google's "People also ask", with `FAQPage` JSON-LD |
| `style.css` | Single stylesheet, light and dark via `prefers-color-scheme` |
| `sitemap.xml` / `robots.txt` | Discovery |

## Source of the data

Every NAP value comes from the client's NAP record in the Superman Links CRM
(`client_nap_locations` row `ab78f741-ce0f-494c-b903-d673a154470d`), which was filled from the
client's own NAP sheet on 2026-08-14. Socials come from `client_brand`. Geo comes from the
linked Google Business Profile record.

**If the NAP changes in the CRM, it must be changed here too.** There is no sync.

## Updating the canonical URL

Every canonical, `og:url`, sitemap entry and JSON-LD `@id` uses the absolute base
`https://supermanservicesca.github.io/nationfurnace/`. If the site moves, find and replace that
string across `index.html`, `services.html`, `service-areas.html`, `faq.html`, `sitemap.xml` and
`robots.txt`.

## Known limits

- `robots.txt` here sits at `/nationfurnace/robots.txt`. Crawlers read the one at the domain root,
  which this repository does not control. The file is kept for the sitemap reference only.
- `FAQPage` markup will not produce rich results. Google restricted FAQ rich results to
  recognised government and health sites in 2023. The markup stays because it is valid and
  describes the page correctly.
