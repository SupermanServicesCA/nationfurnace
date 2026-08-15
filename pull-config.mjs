#!/usr/bin/env node
// Generates a starter site.config.json for another client, straight from the CRM.
//
//   node pull-config.mjs <client_id> [> site.config.json]
//
// Reads client_nap_locations, client_brand and pages via the Supabase CLI, which
// must already be linked (see the CRM repo: scripts/sb.ps1). Everything factual —
// NAP, hours, geo, socials, service areas, the city page URLs — comes from the
// database. Everything written — the prose, the FAQ, the image picks — is left as
// TODO markers, because that part is not generatable and should not pretend to be.

import { execFileSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const clientId = process.argv[2]
if (!clientId) {
  console.error('usage: node pull-config.mjs <client_id>')
  process.exit(1)
}

const SB = 'C:\\github\\superman-links-crm\\scripts\\sb.ps1'

// Multi-line SQL passed inline through PowerShell arrives empty, so write it to
// a file and use the CLI's -f flag (the CRM notes the same trap for jsonb literals).
function query(sql) {
  const file = join(tmpdir(), `pull-config-${process.pid}.sql`)
  writeFileSync(file, sql, 'utf8')
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command', `& '${SB}' db query --linked -f '${file}'`], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, cwd: 'C:\\github\\superman-links-crm',
    })
    const body = JSON.parse(out.slice(out.indexOf('{')))
    if (body._tag === 'Error') throw new Error(body.error.message)
    return body.rows
  } finally {
    try { unlinkSync(file) } catch {}
  }
}

const [{ payload }] = query(`
  select jsonb_pretty(jsonb_build_object(
    'nap',   (select to_jsonb(n) from client_nap_locations n
              where n.client_id = '${clientId}' order by n.is_primary desc limit 1),
    'brand', (select to_jsonb(b) from client_brand b where b.client_id = '${clientId}'),
    'client',(select jsonb_build_object('name', c.name, 'domain', c.domain) from clients c where c.id = '${clientId}'),
    'gbp',   (select jsonb_build_object('lat', g.latitude, 'lng', g.longitude, 'rating', g.places_rating, 'maps', g.maps_uri)
              from gbp_locations g where g.client_id = '${clientId}' limit 1),
    'pages', (select jsonb_agg(jsonb_build_object('url', p.url, 'title', p.title, 'imp', p.gsc_total_impressions, 'clk', p.gsc_total_clicks))
              from pages p where p.client_id = '${clientId}' and p.gsc_total_impressions > 0)
  )) as payload`)

const d = JSON.parse(payload)
if (!d.nap) { console.error(`no client_nap_locations row for ${clientId} — fill the NAP module first`); process.exit(1) }

const nap = d.nap, brand = d.brand || {}, gbp = d.gbp || {}
const TODO = (what) => `TODO — ${what}`

// service_areas comes in two incompatible shapes across the fleet:
//   GBP sync (25 of 27 rows): { places: { placeInfos: [ { placeId, placeName } ] } }
//   NAP UI / manual entry:    { places: [ "Name", ... ] }
// The CRM's own location-detail.tsx only reads the second, so the first renders
// as an empty field there. Handle both, and drop the ", BC, Canada" tail that
// the GBP form carries.
function serviceAreas(sa) {
  const p = sa?.places
  const raw = Array.isArray(p) ? p
    : Array.isArray(p?.placeInfos) ? p.placeInfos
    : Array.isArray(sa) ? sa : []
  return raw
    .map((x) => (typeof x === 'string' ? x : x?.placeName || x?.name || ''))
    .map((s) => s.replace(/,\s*[A-Z]{2},\s*[A-Za-z ]+$/, '').trim())
    .filter(Boolean)
}
const areas = serviceAreas(nap.service_areas)

// City landing pages on the client's own site: single-segment URLs whose slug
// matches one of the service areas. Trade-agnostic on purpose — matching on the
// client's own service-area list works for a plumber as well as an HVAC company.
// Ranked by impressions so the weakest pages are visible while you write.
const areaNames = new Set(areas.map((a) => a.toLowerCase()))
const cityPages = (d.pages || [])
  .filter((p) => /^https?:\/\/[^/]+\/[a-z-]+\/?$/.test(p.url))
  .map((p) => ({ ...p, slug: p.url.replace(/\/$/, '').split('/').pop() }))
  .filter((p) => areaNames.has(p.slug.replace(/-/g, ' ')))
  .sort((a, b) => (b.imp || 0) - (a.imp || 0))

const social = [
  ['Facebook', brand.facebook_url], ['Instagram', brand.instagram_url], ['X', brand.twitter_url],
  ['YouTube', brand.youtube_url], ['LinkedIn', brand.linkedin_url], ['Pinterest', brand.pinterest_url],
].filter(([, u]) => u).map(([label, url]) => ({ label, url }))

const hours = nap.hours || {}
const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
const open = hours.MONDAY?.split('-')[0] || '09:00'
const close = hours.MONDAY?.split('-')[1] || '17:00'

const cfg = {
  site: {
    baseUrl: TODO('https://<account>.github.io/<repo>/'),
    cssVersion: 1,
    lang: 'en-CA',
    lastmod: new Date().toISOString().slice(0, 10),
  },
  business: {
    crmClientId: clientId,
    crmNapLocationId: nap.id,
    legalName: nap.business_name,
    shortName: TODO('short brand name for the header'),
    kicker: TODO('small caps line under the logo'),
    schemaType: TODO('schema.org type, e.g. HVACBusiness / Plumber / PestControlService'),
    trade: TODO('trade noun'),
    city: nap.city,
    region: nap.province_state === 'British Columbia' ? 'BC' : nap.province_state,
    regionLong: nap.province_state,
    foundedYear: nap.date_established ? Number(nap.date_established.slice(0, 4)) : null,
    foundedDate: nap.date_established,
    founder: TODO('owner name — not stored in the CRM'),
    phone: nap.phone,
    phoneHref: '+1' + String(nap.phone || '').replace(/\D/g, ''),
    phoneSchema: '+1-' + String(nap.phone || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
    email: nap.email,
    street: nap.street_address,
    postalCode: nap.postal_code,
    country: nap.country_code,
    geo: { lat: gbp.lat, lng: gbp.lng },
    mapsUrl: nap.google_maps_url || gbp.maps,
    mainSite: nap.website,
    mainSiteLabel: d.client?.domain,
    rating: gbp.rating ? String(gbp.rating) : null,
    priceRange: '$$',
    paymentSchema: (nap.payment_methods || []).join(', '),
    paymentPlain: (nap.payment_methods || []).join(', '),
    hoursLabel: 'Monday to Sunday',
    hoursPlain: TODO('human hours, e.g. 8:00 AM – 8:00 PM'),
    hoursOpen: open,
    hoursClose: close,
    hoursDays: days.filter((x) => hours[x]).map((x) => x[0] + x.slice(1).toLowerCase()),
    hoursShort: TODO('e.g. 8am to 8pm'),
    social,
  },
  _notes: {
    napDescription: nap.description,
    napKeywords: nap.keywords,
    primaryCategory: nap.primary_category,
    additionalCategories: nap.additional_categories,
    serviceAreas: areas,
    cityPagesByImpressions: cityPages.map((p) => `${String(p.imp).padStart(7)} imp / ${p.clk} clk  ${p.url}`),
    warning: 'Everything under _notes is raw CRM data for you to write from. Delete this key before shipping.',
  },
  home: { title: TODO('<=60 chars'), description: TODO('70-160 chars'), h1: TODO(''), lede: TODO(''), heroImage: TODO('image key'), intro: [TODO('write this')], shotsHeading: 'What we work on', shotsIntro: TODO('use {{servicesLink}}'), shots: [], commercialHeading: TODO(''), commercial: TODO(''), commercialImage: TODO(''), facts: [], contactHeading: 'Where to find us', contactIntro: TODO('') },
  services: { slug: 'services.html', nav: 'What we do', title: TODO(''), description: TODO(''), h1: 'What we do', lede: TODO(''), ogImage: TODO(''), groups: [], schemaList: [] },
  feature: { slug: TODO('e.g. boilers.html'), nav: TODO(''), title: TODO(''), description: TODO(''), h1: TODO(''), linkText: TODO(''), lede: TODO(''), ogImage: TODO(''), intro: [], image: TODO(''), caption: TODO(''), listHeading: TODO(''), list: [], afterList: TODO(''), qaHeading: 'Questions we get', questions: [] },
  areas: {
    slug: 'service-areas.html', nav: 'Where we work',
    title: TODO('<=60 chars'), description: TODO(''), h1: 'Where we work', lede: TODO(''), ogImage: TODO(''),
    intro: [TODO('')],
    neighbourhoodGroups: [{ heading: `${nap.city || 'Service'} areas`, items: areas }],
    midImage: TODO(''), midCaption: TODO(''),
    citiesHeading: TODO(''), citiesIntro: TODO(''),
    cities: cityPages.filter((p) => p.slug !== String(nap.city || '').toLowerCase()).map((p) => ({
      name: p.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), url: p.url,
    })),
    outro: [],
  },
  images: {},
}

console.log(JSON.stringify(cfg, null, 2))
console.error(`\npulled ${clientId}`)
console.error(`  NAP:    ${nap.business_name} — ${nap.city}`)
console.error(`  socials: ${social.length} | service areas: ${areas.length} | city pages found: ${cityPages.length}`)
console.error(`  Fill every "TODO —" value, pick images into img/, then: node build.mjs`)
