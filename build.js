const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://lfobdm.ru';
const OG_IMAGE = '/img/Slide1.webp';
const GA_ID = ''; // пусто = не вставлять Google Analytics
const GTM_ID = 'GTM-WN5W7DBW';

// Карта разделов каталога: папка -> { заголовок, страница раздела }
const CATEGORIES = {
  'trailer-axle': { title: 'Мосты грузовых автомобилей', page: 'bridge-trailer-page.html' },
  'vozdushnaya-podveska': { title: 'Воздушная подвеска', page: 'vozdushnaya-podveska.html' },
  'zapchasti-dlya-mosta-gruzovyh-avtomobiley': { title: 'Запчасти для моста грузовых автомобилей', page: 'zapchasti-dlya-mosta-gruzovyh-avtomobiley.html' },
  'neftyanoye-oborudovanie': { title: 'Нефтяное оборудование', page: 'neftyanoye-oborudovanie.html' },
  'casting': { title: 'Отливка изделий на заказ', page: 'casting-page.html' },
  'kovka-na-zakaz': { title: 'Ковка деталей на заказ', page: 'kovka-na-zakaz.html' },
  'shtampovka-na-zakaz': { title: 'Штамповка деталей на заказ', page: 'shtampovka-na-zakaz.html' },
  'rezinovye-izdeliya': { title: 'Резиновые изделия', page: 'rezinovye-izdeliya.html' },
};

const HEADER_MARKER = '<!--#header-->';
const FOOTER_MARKER = '<!--#footer-->';
const CATALOG_MARKER = '<!--#catalog-->';
const SIDEBAR_MARKER = '<!--#sidebar-->';
const H1_MARKER = '<!--#h1-index-->';

const PARTIALS_DIR = path.join(__dirname, 'partials');

const URL_FIXES = [
  ['zapchasti-dlya-mosta-gruzovyфh-avtomobiley', 'zapchasti-dlya-mosta-gruzovyh-avtomobiley'],
  ['href="docs/gornoe-oborudovanie.pdf"', 'href="/docs/gornoe-oborudovanie.pdf"'],
];

function readPartialLines(file) {
  const lines = fs.readFileSync(path.join(PARTIALS_DIR, file), 'utf8').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

const headerLines = readPartialLines('header.html');
const catalogLines = readPartialLines('catalog.html');
const footerLines = readPartialLines('footer.html');
const sidebarLines = readPartialLines('sidebar.html');

// Маппинг: директория -> паттерн ссылки для подсветки id="first" в сайдбаре
const SIDEBAR_ACTIVE_MAP = {
  'trailer-axle': 'href="/trailer-axle/bridge-trailer-page.html"',
  'vozdushnaya-podveska': 'href="/vozdushnaya-podveska/vozdushnaya-podveska.html"',
  'zapchasti-dlya-mosta-gruzovyh-avtomobiley': 'href="/zapchasti-dlya-mosta-gruzovyh-avtomobiley/zapchasti-dlya-mosta-gruzovyh-avtomobiley.html"',
  'neftyanoye-oborudovanie': 'href="/neftyanoye-oborudovanie/neftyanoye-oborudovanie.html"',
  'casting': 'href="/casting/casting-page.html"',
  'kovka-na-zakaz': 'href="/kovka-na-zakaz/kovka-na-zakaz.html"',
  'shtampovka-na-zakaz': 'href="/shtampovka-na-zakaz/shtampovka-na-zakaz.html"',
  'rezinovye-izdeliya': 'href="/rezinovye-izdeliya/rezinovye-izdeliya.html"',
};

const ACTIVE_ITEMS = [
  {
    pages: ['index.html'],
    match: 'class="menu-item" title="Главная">',
    replace: 'class="menu-item" title="Главная" id="index-item">',
  },
  {
    pages: ['about.html'],
    match: 'class="menu-item" title="О компании">',
    replace: 'class="menu-item" title="О компании" id="index-item">',
  },
  {
    pages: ['contacts.html'],
    match: 'class="menu-item" title="Контакты">',
    replace: 'class="menu-item" title="Контакты" id="index-item">',
  },
  {
    pages: ['writing.html'],
    match: 'class="menu-item" title="Запись">',
    replace: 'class="menu-item" title="Запись" id="index-item">',
  },
  {
    pages: ['products.html', '__catalog__'],
    match: '<span><a href="/products.html">Каталог</a></span>',
    replace: '<span><a href="/products.html" id="index-item">Каталог</a></span>',
  },
];

const NO_ACTIVE = new Set(['policy.html', 'consent.html']);

function activeReplaceFor(filePath) {
  const base = path.basename(filePath);
  for (const item of ACTIVE_ITEMS) {
    if (item.pages.includes(base) || (item.pages.includes('__catalog__') && !item.pages.includes(base) && !NO_ACTIVE.has(base))) {
      return item;
    }
  }
  return null;
}

function makeHeaderLines(filePath) {
  const merged = [...headerLines];
  const markerIdx = merged.findIndex((l) => l.trim() === CATALOG_MARKER);
  if (markerIdx !== -1) merged.splice(markerIdx, 1, ...catalogLines);
  let html = merged.join('\n').replace(/\s+id="index-item"/g, '');
  const item = activeReplaceFor(filePath);
  let warn = null;
  if (item) {
    if (!html.includes(item.match)) {
      warn = `не найден пункт меню для подсветки: ${item.match.trim()}`;
    } else {
      html = html.replace(item.match, item.replace);
    }
  }
  const lines = html.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return { lines, warn };
}

function trimLine(line) {
  return line.replace(/\s+$/g, '').trim();
}

function detectHeaderRegion(lines) {
  const start = lines.findIndex((l) => l.includes('<div class="head">'));
  const bodyIdx = start === -1 ? lines.findIndex((l) => l.trim() === '<body>') : -1;

  let startIdx;
  let viaHeadDiv;
  if (start !== -1) {
    startIdx = start;
    viaHeadDiv = true;
  } else if (bodyIdx !== -1) {
    startIdx = bodyIdx + 1;
    viaHeadDiv = false;
  } else {
    return null;
  }

  if (viaHeadDiv) {
    let depth = 0;
    for (let i = startIdx; i < lines.length; i++) {
      const opens = (lines[i].match(/<div\b/g) || []).length;
      const closes = (lines[i].match(/<\/div>/g) || []).length;
      depth += opens - closes;
      if (i > startIdx && depth <= 0) return { startIdx, endIdx: i };
    }
    return null;
  }

  let qrIdx = -1;
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('<div class="qr">')) qrIdx = i;
  }
  if (qrIdx === -1) return null;

  let endIdx = qrIdx + 2;
  let consumed = 0;
  while (endIdx < lines.length && consumed < 5) {
    const t = trimLine(lines[endIdx]);
    if (t === '</nav>' || t === '</div>' || t === '</header>') {
      endIdx++;
      consumed++;
    } else {
      break;
    }
  }

  return { startIdx, endIdx: endIdx - 1 };
}

function detectFooterRegion(lines) {
  const start = lines.findIndex((l) => l.trim().startsWith('<footer'));
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && l.includes('</footer>'));
  if (end === -1) return null;
  return { startIdx: start, endIdx: end };
}

function detectSidebarRegion(lines) {
  const start = lines.findIndex((l) => l.includes('<aside class="sidebar">'));
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i >= start && l.includes('</aside>'));
  if (end === -1) return null;
  return { startIdx: start, endIdx: end };
}

function pageUrl(filePath) {
  const rel = path.relative(__dirname, filePath).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  return '/' + rel;
}

function normalizeTitle(raw) {
  let t = raw
    .replace(/《/g, '«')
    .replace(/》/g, '»')
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/\s*--+\s*/g, ' - ');
  t = t.replace(/([А-Яа-яЁё])«/g, '$1 «').replace(/»([А-Яа-яЁё])/g, '» $1');
  t = t.replace(/\s+-\s+/g, ' - ').trim();
  t = t.replace(/\s*\|\s*/g, ' | ').trim();
  t = t.replace(/«\s*Оптом Ланфан\s*»/g, '«Оптом Ланфан»');
  if (t.length > 70) t = t.replace(/\s*\|\s*ООО «Оптом Ланфан».*$/, '').trim();
  if (t.length > 70) t = t.replace(/\s+ООО «Оптом Ланфан».*$/, '').trim();
  if (t.length > 70) t = t.replace(/\s+[—-]\s*купить оптом и в розницу$/i, '').trim();
  if (t.length > 70) t = t.slice(0, 69).replace(/\s\S*$/, '').trim() + '…';
  t = t.replace(/\s+-\s+/g, ' — ').trim();
  return t;
}

function normalizeDescription(raw) {
  let d = raw
    .replace(/《/g, '«')
    .replace(/》/g, '»')
    .replace(/\s+/g, ' ')
    .trim();
  d = d.replace(/([А-Яа-яЁё])«/g, '$1 «').replace(/»([А-Яа-яЁё])/g, '» $1');
  d = d.replace(/\s+-\s+/g, ' — ');
  if (d.length > 160) d = d.slice(0, 157).replace(/\s\S*$/, '') + '…';
  return d;
}

function generateDescription(productName) {
  let d = `${productName} — купить оптом и в розницу. ООО «Оптом Ланфан» — поставка автозапчастей и нефтяного оборудования из Китая, доставка по России и СНГ, гарантия качества.`;
  if (d.length > 160) d = d.slice(0, 157).replace(/\s\S*$/, '') + '…';
  return d;
}

function getExistingDescription(head) {
  const m = head.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*>/i);
  if (!m) return null;
  const c = m[0].match(/content\s*=\s*["']([^"']*)["']/i);
  if (!c) return null;
  return { tag: m[0], content: c[1] };
}

function applyHeadSeo(content, filePath, usedTitles) {
  const headStart = content.indexOf('<head');
  const headEnd = content.indexOf('</head>');
  if (headStart === -1 || headEnd === -1) return { content, title: '', description: '' };

  const HEAD_CLOSE_LEN = '</head>'.length;
  let head = content.slice(headStart, headEnd + HEAD_CLOSE_LEN);
  const urlPath = pageUrl(filePath);

  const titleMatch = head.match(/<title>([\s\S]*?)<\/title>/);
  if (!titleMatch) return { content, title: '', description: '' };
  const rawTitle = titleMatch[1].replace(/\s+/g, ' ').trim();

  let base = normalizeTitle(rawTitle).replace(/\s*—\s*№\d+/g, '');
  const count = usedTitles.get(base) || 0;
  usedTitles.set(base, count + 1);
  let title = count > 0 ? `${base} — №${count + 1}` : base;

  head = head.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

  const desc = getExistingDescription(head);
  let description;
  if (desc) {
    description = normalizeDescription(desc.content);
    head = head.split(desc.tag).join(`<meta name="description" content="${description}" />`);
  } else {
    const h1m = content.match(/<h1[^>]*>\s*([^<]+)/);
    const product = h1m ? h1m[1].replace(/\s+/g, ' ').trim() : title;
    description = generateDescription(product);
    head = head.replace('<title>', `<meta name="description" content="${description}" />\n  <title>`);
  }

  if (!/<link[^>]*rel=["']canonical["']/i.test(head)) {
    const canonical = `${SITE_URL}${urlPath}`;
    head = head.replace(
      `<title>${title}</title>`,
      `<title>${title}</title>\n  <link rel="canonical" href="${canonical}" />`
    );
  }

  if (!/property=["']og:title["']/i.test(head)) {
    const og = [
      '<meta property="og:site_name" content="ООО «Оптом Ланфан»" />',
      '<meta property="og:locale" content="ru_RU" />',
      '<meta property="og:type" content="website" />',
      `<meta property="og:url" content="${SITE_URL}${urlPath}" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:image" content="${SITE_URL}${OG_IMAGE}" />`,
      '<meta name="twitter:card" content="summary" />',
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
    ].join('\n  ');
    head = head.replace('</head>', `  ${og}\n</head>`);
  }

  if (GA_ID && !/googletagmanager/.test(head)) {
    const ga = `<!-- Google Analytics 4: замени ${GA_ID} на свой ID в search.godaddy.com или console -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>`;
    head = head.replace('</head>', `  ${ga}\n</head>`);
  }

  content = content.slice(0, headStart) + head + content.slice(headEnd + HEAD_CLOSE_LEN);
  return { content, title, description };
}

function applyLazy(content) {
  const bodyIdx = content.indexOf('<body');
  if (bodyIdx === -1) return content;
  const before = content.slice(0, bodyIdx);
  let after = content.slice(bodyIdx);
  let seen = false;
  after = after.replace(/<img\b[^>]*>/g, (tag) => {
    if (/loading\s*=/i.test(tag)) return tag;
    if (!seen) {
      seen = true;
      return tag;
    }
    return tag.replace(/\/?>$/, ' loading="lazy" decoding="async"$&');
  });
  return before + after;
}

function applyContentFixes(content) {
  let c = content;
  for (const [from, to] of URL_FIXES) c = c.split(from).join(to);

  const lines = c.split('\n');
  const out = [];
  let prev = '';
  for (const line of lines) {
    const t = line.trim();
    if (t === '<nav>' && (prev.includes('class="list"') || prev.trim().endsWith('<ol>'))) {
      prev = line;
      continue;
    }
    out.push(line);
    prev = line;
  }
  c = out.join('\n');

  c = c.replace(/<h3 class="underslider"[^>]*>([^<]*)<\/h3>/g, '<h2 class="underslider">$1</h2>');

  return c;
}

function applyGTM(content) {
  if (!GTM_ID || content.includes(GTM_ID)) return content;

  const headSnippet = `<!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${GTM_ID}');</script>
  <!-- End Google Tag Manager -->`;
  content = content.replace(/<head[^>]*>/, (m) => `${m}\n  ${headSnippet}`);

  const noscript = `<!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->`;
  content = content.replace(/<body[^>]*>/, (m) => `${m}\n  ${noscript}`);

  return content;
}

function applySchema(content, filePath) {
  if (!content.includes('#organization')) {
    const org = [
      '<script type="application/ld+json">',
      '{',
      '  "@context": "https://schema.org",',
      '  "@type": "Organization",',
      '  "@id": "https://lfobdm.ru/#organization",',
      '  "name": "ООО «Оптом Ланфан» по импорту и экспорту",',
      '  "alternateName": "Оптом Ланфан",',
      '  "url": "https://lfobdm.ru/",',
      '  "logo": "https://lfobdm.ru/img/logo.png",',
      '  "description": "Импорт и экспорт автозапчастей и промышленного оборудования из Китая: мосты, воздушная подвеска, нефтяное оборудование, отливка, ковка, штамповка, резиновые изделия. Прямые поставки от производителя, контроль качества, доставка по России и СНГ.",',
      '  "address": {',
      '    "@type": "PostalAddress",',
      '    "addressLocality": "Саньхэ",',
      '    "addressRegion": "Хэбэй",',
      '    "addressCountry": "CN"',
      '  },',
      '  "contactPoint": [',
      '    { "@type": "ContactPoint", "telephone": "+79221808445", "contactType": "sales", "areaServed": "RU", "availableLanguage": "Russian" },',
      '    { "@type": "ContactPoint", "telephone": "+8615075603580", "contactType": "sales", "areaServed": "CN", "availableLanguage": ["Russian", "Chinese"] }',
      '  ],',
      '  "email": "generalov.maks.84@yandex.ru"',
      '}',
      '</script>',
    ].join('\n  ');
    content = content.replace('</head>', `  ${org}\n</head>`);
  }

  if (content.includes('<div class="page">') && !content.includes('"@type": "Product"')) {
    const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    const name = (h1Match
      ? h1Match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      : (titleMatch ? titleMatch[1].replace(/\s*[-–—]\s*.*$/, '').trim() : ''));
    const imgMatch = content.match(/<main[\s\S]*?<img[^>]*src="(\/img\/[^"]+)"/);
    const descMatch = content.match(/name="description" content="([^"]*)"/);
    const product = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: name,
    };
    if (descMatch) product.description = descMatch[1];
    if (imgMatch) product.image = SITE_URL + imgMatch[1];
    product.brand = { '@type': 'Brand', name: 'ООО «Оптом Ланфан»' };
    const script = '<script type="application/ld+json">\n  ' + JSON.stringify(product, null, 2).split('\n').join('\n  ') + '\n  </script>';
    content = content.replace('</head>', `  ${script}\n</head>`);
  }

  return content;
}

function fixBreadcrumbLinks(content, filePath) {
  const rel = path.relative(__dirname, filePath).split(path.sep).join('/');
  const dirName = path.posix.dirname(rel);
  const cat = CATEGORIES[dirName];
  if (!cat) return content;
  const expected = '/' + dirName + '/' + cat.page;
  return content.replace(/<div class="navig">([\s\S]*?)<\/div>/, (block, inner) => {
    const anchors = inner.match(/<a href="[^"]*" class="navigat">/g);
    if (!anchors || anchors.length < 3) return block;
    let n = 0;
    const fixedInner = inner.replace(/(<a href=")[^"]*(" class="navigat">)/g, (mm, p1, p2) => {
      n++;
      if (n === 3) return p1 + expected + p2;
      return mm;
    });
    return block.replace(inner, fixedInner);
  });
}

function breadcrumbItems(content, filePath) {
  const rel = path.relative(__dirname, filePath).split(path.sep).join('/');
  const urlPath = rel === 'index.html' ? '/' : '/' + rel;
  const dirName = path.posix.dirname(rel);
  const base = path.posix.basename(rel);
  const items = [{ name: 'Главная', url: '/' }];
  if (dirName !== '.') {
    items.push({ name: 'Каталог', url: '/products.html' });
    const cat = CATEGORIES[dirName];
    if (cat && base !== cat.page) items.push({ name: cat.title, url: '/' + dirName + '/' + cat.page });
  }
  let current = '';
  const h1m = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (h1m) current = h1m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  else {
    const tm = content.match(/<title>([\s\S]*?)<\/title>/);
    if (tm) current = tm[1].replace(/\s*[-–—]\s*.*$/, '').replace(/\s*\|\s*.*$/, '').replace(/\s+/g, ' ').trim();
  }
  if (current) items.push({ name: current, url: urlPath });
  return items;
}

function applyBreadcrumbSchema(content, filePath) {
  const base = path.basename(filePath);
  if (['index.html', '404.html', 'policy.html', 'consent.html'].includes(base)) return content;
  if (content.includes('"@type": "BreadcrumbList"')) return content;
  const items = breadcrumbItems(content, filePath);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: SITE_URL + it.url,
    })),
  };
  const script = '<script type="application/ld+json">\n  ' + JSON.stringify(schema, null, 2).split('\n').join('\n  ') + '\n  </script>';
  return content.replace('</head>', `  ${script}\n</head>`);
}

function applyOgImage(content, filePath) {
  const base = path.basename(filePath);
  if (['index.html', '404.html', 'policy.html', 'consent.html'].includes(base)) return content;
  const imgMatch = content.match(/<main[\s\S]*?<img[^>]*src="(\/img\/[^"]+)"/);
  if (!imgMatch) return content;
  const imgUrl = SITE_URL + imgMatch[1];
  return content.replace(
    /(<meta[^>]*property="og:image"[^>]*content=")[^"]*(")/i,
    `$1${imgUrl}$2`
  );
}

function ensureCharsetFirst(content) {
  content = content.replace(/[ \t]*<meta[^>]*charset\s*=[^>]*>[^\r\n]*\r?\n?/gi, '');
  content = content.replace(/<head[^>]*>/, (m) => `${m}\n  <meta charset="UTF-8">`);
  return content;
}

function insertIndexH1(content, filePath) {
  if (path.basename(filePath) !== 'index.html') return content;
  content = content
    .split(H1_MARKER)
    .join('')
    .replace(/\s*<h1\b[^>]*>Автозапчасти и нефтяное оборудование из Китая[\s\S]*?<\/h1>/g, '');
  const hero = [
    '<section class="hero-text">',
    '  <h1>Автозапчасти и нефтяное оборудование из Китая — импорт и экспорт оптом и в розницу</h1>',
    '  <p>ООО «Оптом Ланфан» — прямой импорт автозапчастей и промышленного оборудования из Китая. Поставляем мосты и оси для грузовых автомобилей, воздушную подвеску, запчасти к мостам, нефтяное и литейное оборудование; изготавливаем изделия литьём, ковкой и штамповкой по чертежам заказчика. Гарантия качества, доставка по России и СНГ.</p>',
    '</section>',
  ].join('\n  ');
  if (!content.includes('class="hero-text"')) {
    content = content.replace(/<main\b[^>]*>/, (m) => `${m}\n  ${hero}`);
  }
  return content;
}

function generateSitemap(pageUrls, lastmods) {
  const ordered = ['/', ...pageUrls.filter((u) => u !== '/').sort()];
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const u of ordered) {
    const m = lastmods[u];
    const lastmod = m ? new Date(m).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const priority = u === '/' ? '1.0' : '0.7';
    lines.push('  <url>');
    lines.push(`    <loc>${SITE_URL}${u}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push(`    <priority>${priority}</priority>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), lines.join('\n') + '\n', 'utf8');
}

function processFile(filePath, stats, stat) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    stats.warnings.push(`${filePath}: не удалось прочитать (${e.message})`);
    return;
  }

  const lines = content.split('\n');
  let header = detectHeaderRegion(lines);
  if (!header) {
    const markerIdx = lines.findIndex((l) => l.trim() === HEADER_MARKER);
    if (markerIdx !== -1) header = { startIdx: markerIdx, endIdx: markerIdx };
  }

  if (!header) {
    stats.warnings.push(`${filePath}: не найден хэдер (нет <div class="head"> или маркера) — пропущено`);
    return;
  }
  lines.splice(header.startIdx, header.endIdx - header.startIdx + 1, HEADER_MARKER);

  let footer = detectFooterRegion(lines);
  if (!footer) {
    const markerIdx = lines.findIndex((l) => l.trim() === FOOTER_MARKER);
    if (markerIdx !== -1) footer = { startIdx: markerIdx, endIdx: markerIdx };
  }
  if (!footer) {
    stats.warnings.push(`${filePath}: не найден футер`);
    return;
  }
  lines.splice(footer.startIdx, footer.endIdx - footer.startIdx + 1, FOOTER_MARKER);

  let sidebar = detectSidebarRegion(lines);
  if (!sidebar) {
    const markerIdx = lines.findIndex((l) => l.trim() === SIDEBAR_MARKER);
    if (markerIdx !== -1) sidebar = { startIdx: markerIdx, endIdx: markerIdx };
  }
  if (sidebar) {
    lines.splice(sidebar.startIdx, sidebar.endIdx - sidebar.startIdx + 1, SIDEBAR_MARKER);
  }

  let body = lines.join('\n');

  body = applyLazy(body);

  const { lines: headLines, warn } = makeHeaderLines(filePath);
  if (warn) stats.warnings.push(`${filePath}: ${warn}`);
  body = body.replace(HEADER_MARKER, headLines.join('\n'));
  body = body.replace(FOOTER_MARKER, footerLines.join('\n'));

  if (body.includes(SIDEBAR_MARKER)) {
    let sidebarHtml = sidebarLines.join('\n');
    const rel = path.relative(__dirname, filePath).split(path.sep).join('/');
    const dirName = path.posix.dirname(rel);
    const activePattern = SIDEBAR_ACTIVE_MAP[dirName];
    if (path.basename(filePath) === 'pnevmaticheskiy-spayder.html') {
      const zapchLink = '<a href="/zapchasti-dlya-mosta-gruzovyh-avtomobiley/zapchasti-dlya-mosta-gruzovyh-avtomobiley.html" class="menu-button">';
      sidebarHtml = sidebarHtml.replace(zapchLink, zapchLink.replace(/>$/, ' id="first">'));
    } else if (activePattern) {
      const escaped = activePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(<a\\b[^>]*${escaped}[^>]*>)`);
      sidebarHtml = sidebarHtml.replace(regex, (match) => {
        if (match.includes('id="first"')) return match;
        return match.replace(/>$/, ' id="first">');
      });
    }
    body = body.replace(SIDEBAR_MARKER, sidebarHtml);
  }

  body = applyHeadSeo(body, filePath, stats.usedTitles).content;

  body = applySchema(body, filePath);

  body = applyBreadcrumbSchema(body, filePath);

  body = fixBreadcrumbLinks(body, filePath);

  body = applyOgImage(body, filePath);

  body = insertIndexH1(body, filePath);

  body = applyGTM(body);

  body = ensureCharsetFirst(body);

  body = applyContentFixes(body);

  if (body.includes(HEADER_MARKER) || body.includes(FOOTER_MARKER) || body.includes(SIDEBAR_MARKER)) {
    stats.warnings.push(`${filePath}: остался маркер после сборки`);
  }

  fs.writeFileSync(filePath, body, 'utf8');
  stats.processed++;
  const base = path.basename(filePath);
  if (base !== '404.html' && base !== 'policy.html' && base !== 'consent.html') {
    const url = pageUrl(filePath);
    stats.pageUrls.push(url);
    stats.lastmods[url] = stat ? stat.mtimeMs : Date.now();
  }
}

function walk(dir, stats) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch (e) {
      continue;
    }
    if (stat.isDirectory()) {
      if (entry === 'partials' || entry === '.git' || entry === 'node_modules' || entry === '.backup') continue;
      walk(full, stats);
    } else if (entry.endsWith('.html')) {
      processFile(full, stats, stat);
    }
  }
}

const stats = { processed: 0, warnings: [], usedTitles: new Map(), pageUrls: [], lastmods: {} };
walk(__dirname, stats);
generateSitemap(stats.pageUrls, stats.lastmods);

console.log(`Обработано страниц: ${stats.processed}`);
console.log(`Сгенерирован sitemap.xml: ${stats.pageUrls.length} URL`);
if (stats.warnings.length) {
  console.log(`Предупреждений: ${stats.warnings.length}`);
  stats.warnings.forEach((w) => console.log('  - ' + w));
} else {
  console.log('Предупреждений: 0');
}
