#!/usr/bin/env node
// Renders the whole site from site.config.json. No dependencies.
//   node build.mjs            build
//   node build.mjs --check    build to memory and fail if anything is stale/invalid
//
// Every page, the sitemap and robots.txt come out of the config. To stand this
// up for another client, replace site.config.json and the files in img/.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'))
const check = process.argv.includes('--check')

const { site, business: b, images } = cfg
const base = site.baseUrl.replace(/\/$/, '') + '/'
const problems = []

/* ---------- helpers ---------- */

const esc = (s) => String(s).replace(/&(?![a-z]+;|#\d+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attr = (s) => esc(s).replace(/"/g, '&quot;')
const json = (o) => JSON.stringify(o, null, 2)

// {{link:URL|text}}, {{servicesLink}}, {{featureLink}}
function inline(text) {
  return String(text)
    .replace(/\{\{link:([^|]+)\|([^}]+)\}\}/g, (_, url, label) => `<a href="${attr(url)}">${label}</a>`)
    .replace(/\{\{servicesLink\}\}/g, `<a href="${cfg.services.slug}">${cfg.services.nav.toLowerCase()}</a>`)
    .replace(/\{\{featureLink\}\}/g, `<a href="${cfg.feature.slug}">${cfg.feature.linkText}</a>`)
}

const paras = (arr) => (arr || []).map((p) => `  <p>${inline(p)}</p>`).join('\n')

function img(key, { lazy = true, cls = '', caption = null } = {}) {
  const m = images[key]
  if (!m) { problems.push(`image "${key}" is used but not in config.images`); return '' }
  if (!existsSync(join(root, 'img', `${key}.webp`))) problems.push(`img/${key}.webp is missing`)
  if (!m.alt) problems.push(`image "${key}" has no alt text`)
  const c = caption === null ? m.caption : caption
  const tag = `<img src="img/${key}.webp"${cls ? ` class="${cls}"` : ''} width="${m.w}" height="${m.h}"` +
              `${lazy ? ' loading="lazy"' : ''} alt="${attr(m.alt)}">`
  return c ? `<figure>\n    ${tag}\n    <figcaption>${esc(c)}</figcaption>\n  </figure>` : tag
}

function shots(keys) {
  return `<div class="shots">\n` + keys.map((k) => {
    const m = images[k] || {}
    return '    ' + img(k, { caption: m.caption || ' ' }).replace(/\n/g, '\n  ')
  }).join('\n') + `\n  </div>`
}

/* ---------- shared chrome ---------- */

const NAV = [
  { href: './', label: 'Home', key: 'home' },
  { href: cfg.services.slug, label: cfg.services.nav, key: 'services' },
  { href: cfg.feature.slug, label: cfg.feature.nav, key: 'feature' },
  { href: cfg.areas.slug, label: cfg.areas.nav, key: 'areas' },
]

const header = (active) => `<header class="site">
  <div class="wrap bar">
    <a class="brand" href="./">
      <img src="logo.png" alt="${attr(b.shortName)}" width="300" height="160">
      <span>${esc(b.shortName)}<small>${b.kicker}</small></span>
    </a>
    <nav class="site" aria-label="Primary">
${NAV.map((n) => `      <a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('\n')}
    </nav>
    <a class="call" href="tel:${b.phoneHref}">${esc(b.phone)}</a>
  </div>
</header>`

const footer = () => `<footer class="site">
  <div class="wrap foot-grid">
    <div>
      <strong>${esc(b.legalName)}</strong>
      <p>${esc(b.street)}<br>${esc(b.city)}, ${esc(b.region)} ${esc(b.postalCode)}</p>
      <p><a href="tel:${b.phoneHref}">${esc(b.phone)}</a><br>
         <a href="mailto:${b.email}">${esc(b.email)}</a></p>
    </div>
    <div>
      <strong>Pages</strong>
${NAV.map((n) => `      <a href="${n.href}">${esc(n.label)}</a>`).join('\n')}
    </div>
    <div>
      <strong>Elsewhere</strong>
      <a href="${attr(b.mainSite)}">${esc(b.mainSiteLabel)}</a>
${b.social.slice(0, 4).map((s) => `      <a href="${attr(s.url)}" rel="noopener">${esc(s.label)}</a>`).join('\n')}
    </div>
  </div>
</footer>`

function page({ slug, title, description, ogImage, ld = [], active, body }) {
  if (title.length > 60) problems.push(`${slug}: title is ${title.length} chars (>60)`)
  if (description.length > 160) problems.push(`${slug}: description is ${description.length} chars (>160)`)
  if (description.length < 70) problems.push(`${slug}: description is only ${description.length} chars`)
  const canonical = slug === 'index.html' ? base : base + slug
  const og = ogImage ? `${base}img/${ogImage}.webp` : `${base}logo.png`
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${canonical}">
<link rel="stylesheet" href="style.css?v=${site.cssVersion}">
<link rel="icon" href="logo.png">
<meta property="og:type" content="${slug === 'index.html' ? 'website' : 'article'}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
${ld.map((o) => `<script type="application/ld+json">\n${json(o)}\n</script>`).join('\n')}
</head>
<body>

${header(active)}

${body}

${footer()}

</body>
</html>
`
}

/* ---------- structured data ---------- */

const businessLd = {
  '@context': 'https://schema.org',
  '@type': b.schemaType,
  '@id': `${base}#business`,
  name: b.legalName,
  description: cfg.home.description,
  url: b.mainSite,
  logo: `${base}logo.png`,
  image: `${base}img/${cfg.home.heroImage}.webp`,
  telephone: b.phoneSchema,
  email: b.email,
  foundingDate: b.foundedDate,
  founder: { '@type': 'Person', name: b.founder },
  hasMap: b.mapsUrl,
  priceRange: b.priceRange,
  paymentAccepted: b.paymentSchema,
  address: {
    '@type': 'PostalAddress',
    streetAddress: b.street,
    addressLocality: b.city,
    addressRegion: b.region,
    postalCode: b.postalCode,
    addressCountry: b.country,
  },
  geo: { '@type': 'GeoCoordinates', latitude: b.geo.lat, longitude: b.geo.lng },
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: b.hoursDays,
    opens: b.hoursOpen,
    closes: b.hoursClose,
  }],
  areaServed: [b.city, ...cfg.areas.cities.map((c) => c.name)].map((name) => ({
    '@type': 'City', name, addressRegion: b.region, addressCountry: b.country,
  })),
  sameAs: b.social.map((s) => s.url),
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: cfg.feature.questions.map((q) => ({
    '@type': 'Question',
    name: q.q,
    acceptedAnswer: { '@type': 'Answer', text: q.schema },
  })),
}

const servicesLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: `Services offered in ${b.city} by ${b.legalName}`,
  itemListElement: cfg.services.schemaList.map((s, i) => ({
    '@type': 'ListItem', position: i + 1, name: s.name, url: s.url,
  })),
}

/* ---------- pages ---------- */

const h = cfg.home
const homeBody = `<section class="hero">
  <div class="wrap hero-grid">
    <div>
      <h1>${esc(h.h1)}</h1>
      <p class="lede">${esc(h.lede)}</p>
      <p><a class="call" href="tel:${b.phoneHref}">Call ${esc(b.phone)}</a></p>
    </div>
    ${img(h.heroImage, { lazy: false, caption: false })}
  </div>
</section>

<main>
<div class="wrap">

  <p class="lede narrow">${esc(h.intro[0])}</p>

${paras(h.intro.slice(1))}

  <h2>${esc(h.shotsHeading)}</h2>
  <p>${inline(h.shotsIntro)}</p>

  ${shots(h.shots)}

  <h2>${esc(h.commercialHeading)}</h2>
  <p>${esc(h.commercial)}</p>

  ${img(h.commercialImage)}

</div>

<div class="strip">
  <div class="wrap facts">
${h.facts.map((f) => `    <div><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join('\n')}
  </div>
</div>

<div class="wrap">

  <h2>${esc(h.contactHeading)}</h2>
  <p>${esc(h.contactIntro)}</p>

  <dl class="contact">
    <dt>Phone</dt><dd><a href="tel:${b.phoneHref}">${esc(b.phone)}</a></dd>
    <dt>Email</dt><dd><a href="mailto:${b.email}">${esc(b.email)}</a></dd>
    <dt>Address</dt><dd>${esc(b.street)}<br>${esc(b.city)}, ${esc(b.region)} ${esc(b.postalCode)}</dd>
    <dt>Map</dt><dd><a href="${attr(b.mapsUrl)}" rel="noopener">Google Maps listing</a></dd>
    <dt>Payment</dt><dd>${esc(b.paymentPlain)}</dd>
  </dl>

  <h3>Hours</h3>
  <table class="hours">
    <tbody>
      <tr><th scope="row">${esc(b.hoursLabel)}</th><td>${esc(b.hoursPlain)}</td></tr>
    </tbody>
  </table>

  <p class="spaced">Booking, quotes and the full service pages are on our main site:
  <a href="${attr(b.mainSite)}">${esc(b.mainSiteLabel)}</a>.</p>

</div>
</main>`

const s = cfg.services
const servicesBody = `<main class="wrap">

  <h1>${esc(s.h1)}</h1>
  <p class="lede narrow">${esc(s.lede)}</p>

${s.groups.map((g) => {
  const bits = [`  <h2>${esc(g.heading)}</h2>`, paras(g.body)]
  if (g.image) bits.push('  ' + img(g.image, { caption: g.caption }))
  if (g.shots) bits.push('  ' + shots(g.shots))
  return bits.filter(Boolean).join('\n')
}).join('\n\n')}

  <h2>Booking</h2>
  <p>Call <a href="tel:${b.phoneHref}">${esc(b.phone)}</a> or email
  <a href="mailto:${b.email}">${esc(b.email)}</a>. Someone picks up seven days a week,
  ${esc(b.hoursShort)}.</p>

</main>`

const f = cfg.feature
const featureBody = `<main class="wrap">

  <h1>${esc(f.h1)}</h1>
  <p class="lede narrow">${esc(f.lede)}</p>

${paras(f.intro)}

  ${img(f.image, { caption: f.caption })}

  <h2>${esc(f.listHeading)}</h2>
  <ul class="tick">
${f.list.map((i) => `    <li>${esc(i)}</li>`).join('\n')}
  </ul>

  <p>${inline(f.afterList)}</p>

  <h2>${esc(f.qaHeading)}</h2>

${f.questions.map((q) => {
  const bits = [`  <section class="qa">`, `    <h3>${esc(q.q)}</h3>`]
  q.a.forEach((p) => bits.push(`    <p>${inline(p)}</p>`))
  if (q.bullets) {
    bits.push('    <ul class="tick">')
    q.bullets.forEach((x) => bits.push(`      <li>${esc(x)}</li>`))
    bits.push('    </ul>')
  }
  ;(q.after || []).forEach((p) => bits.push(`    <p>${inline(p)}</p>`))
  bits.push('  </section>')
  return bits.join('\n')
}).join('\n\n')}

  <h2>Booking</h2>
  <p>Call <a href="tel:${b.phoneHref}">${esc(b.phone)}</a>, seven days a week between
  ${esc(b.hoursShort)}.</p>

</main>`

const a = cfg.areas
const areasBody = `<main class="wrap">

  <h1>${esc(a.h1)}</h1>
  <p class="lede narrow">${esc(a.lede)}</p>

${paras(a.intro)}

${a.neighbourhoodGroups.map((g, i) => {
  const block = `  <h2>${esc(g.heading)}</h2>\n  <ul class="areas">\n` +
    g.items.map((x) => `    <li>${esc(x)}</li>`).join('\n') + `\n  </ul>`
  return i === 0 ? block + `\n\n  ${img(a.midImage, { caption: a.midCaption })}` : block
}).join('\n\n')}

  <h2>${esc(a.citiesHeading)}</h2>
  <p>${esc(a.citiesIntro)}</p>
  <ul class="cities">
${a.cities.map((c) => `    <li><a href="${attr(c.url)}">${esc(c.name)}</a></li>`).join('\n')}
  </ul>

${a.outro.map((o) => `  <h2>${esc(o.heading)}</h2>\n${paras(o.body)}`).join('\n\n')}

  <p class="spaced">Call <a href="tel:${b.phoneHref}">${esc(b.phone)}</a>, or see
  <a href="${attr(b.mainSite)}">our ${esc(b.city)} page</a> for the full service list.</p>

</main>`

/* ---------- emit ---------- */

const out = {
  'index.html': page({ slug: 'index.html', title: h.title, description: h.description, ogImage: h.heroImage, ld: [businessLd], active: 'home', body: homeBody }),
  [s.slug]: page({ slug: s.slug, title: s.title, description: s.description, ogImage: s.ogImage, ld: [servicesLd], active: 'services', body: servicesBody }),
  [f.slug]: page({ slug: f.slug, title: f.title, description: f.description, ogImage: f.ogImage, ld: [faqLd], active: 'feature', body: featureBody }),
  [a.slug]: page({ slug: a.slug, title: a.title, description: a.description, ogImage: a.ogImage, active: 'areas', body: areasBody }),
  'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[['', '1.0'], [s.slug, '0.8'], [f.slug, '0.8'], [a.slug, '0.7']].map(([p, pr]) =>
  `  <url>\n    <loc>${base}${p}</loc>\n    <lastmod>${site.lastmod}</lastmod>\n    <priority>${pr}</priority>\n  </url>`).join('\n')}
</urlset>
`,
  'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`,
}

/* ---------- self-checks ---------- */

const slugs = new Set(['index.html', s.slug, f.slug, a.slug])
for (const [name, html] of Object.entries(out)) {
  if (!name.endsWith('.html')) continue
  if ((html.match(/<main/g) || []).length !== 1) problems.push(`${name}: must contain exactly one <main>`)
  if ((html.match(/<h1/g) || []).length !== 1) problems.push(`${name}: must contain exactly one <h1>`)
  for (const href of html.matchAll(/href="([a-z0-9-]+\.html)"/g)) {
    if (!slugs.has(href[1])) problems.push(`${name}: internal link to unknown page ${href[1]}`)
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/g)) {
    try { JSON.parse(m[1]) } catch (e) { problems.push(`${name}: invalid JSON-LD (${e.message})`) }
  }
}
const used = new Set(Object.values(out).flatMap((h2) => [...String(h2).matchAll(/img\/([a-z0-9-]+)\.webp/g)].map((m) => m[1])))
for (const file of readdirSync(join(root, 'img')).filter((x) => x.endsWith('.webp'))) {
  if (!used.has(file.replace('.webp', ''))) problems.push(`img/${file} is committed but never used`)
}

if (problems.length) {
  console.error('\nBuild problems:')
  problems.forEach((p) => console.error('  - ' + p))
  process.exit(1)
}

if (check) {
  let stale = 0
  for (const [name, content] of Object.entries(out)) {
    const path = join(root, name)
    if (!existsSync(path) || readFileSync(path, 'utf8') !== content) { console.error(`stale: ${name}`); stale++ }
  }
  if (stale) { console.error(`\n${stale} file(s) differ from the config. Run: node build.mjs`); process.exit(1) }
  console.log('up to date — all files match site.config.json')
} else {
  for (const [name, content] of Object.entries(out)) writeFileSync(join(root, name), content, 'utf8')
  console.log(`built ${Object.keys(out).length} files from site.config.json`)
  console.log('  pages: ' + [...slugs].join(', '))
  console.log(`  areaServed: ${businessLd.areaServed.length} cities | outbound to ${b.mainSiteLabel}: ` +
    new Set(Object.values(out).flatMap((x) => [...String(x).matchAll(/https:\/\/[a-z.]*nationheating\.ca[^"]*/g)].map((m) => m[0]))).size)
}
