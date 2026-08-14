# Nation Furnace — Burnaby

Static site for **Nation Furnace Heating & Air Conditioning HVAC Ltd.**
(4170 Still Creek Dr Suite 200, Burnaby, BC V5C 4T5).

Live at: https://supermanservicesca.github.io/nationfurnace/

No build step, no framework, no external requests. Plain HTML, one stylesheet, WebP images.

| File | Purpose |
|---|---|
| `index.html` | Home, contact details, `HVACBusiness` JSON-LD |
| `services.html` | What the company works on |
| `boilers.html` | Boiler work and the questions customers ask, `FAQPage` JSON-LD |
| `service-areas.html` | Burnaby neighbourhoods, north / east / south |
| `img/` | Job photos from the client's content library |

## Where the content came from

NAP values come from the client's record in the Superman Links CRM
(`client_nap_locations` row `ab78f741-ce0f-494c-b903-d673a154470d`). Socials come from
`client_brand`. Geo comes from the linked Google Business Profile record. Photos come from
`content_assets` for the same client.

**The NAP does not sync. If it changes in the CRM, change it here too.**

## Copy that needs a tradesperson's eye

The boiler answers on `boilers.html` were drafted by someone who is not an HVAC technician.
They avoid prices and specific figures on purpose. Anyone from the company should feel free to
correct them.

## Photos

Three images in the client's content library were **rejected** during the build and must not be
used here: a screenshot of an Instagram post by another company (Eatons Heating, Coquitlam), a
screenshot of a Google image result carrying a copyright notice, and a letterboxed phone
screenshot. Check any new image against the original before adding it.

## Updating the canonical URL

Every canonical, `og:url`, sitemap entry and JSON-LD `@id` uses the absolute base
`https://supermanservicesca.github.io/nationfurnace/`. If the site moves, find and replace that
string across the four HTML files, `sitemap.xml` and `robots.txt`.

## Known limits

- `robots.txt` sits at `/nationfurnace/robots.txt`. Crawlers read the one at the domain root,
  which this repository does not control. It is kept for the sitemap reference.
- `FAQPage` markup will not produce rich results. Google limited those to recognised government
  and health sites in 2023. The markup stays because it describes the page correctly.
