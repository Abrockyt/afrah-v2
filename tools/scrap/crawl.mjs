// AB WEB SCRAP — forensic crawler (study use).
// node tools/scrap/crawl.mjs <url> <site-name> [maxPages]
// Visits every same-origin page, scrolls + hovers to trigger lazy/WebGL content, records every network
// response (with CDP initiators), saves asset bodies untouched into reuse-assets/original/<type>/<site>/,
// hooks WebGL to record shader programs + texture uploads, takes Spector.js frame captures, measures
// layout/typography, and writes research/<site>/{site-map,network-assets,pages}.json.
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [start, site, maxArg] = process.argv.slice(2);
if (!start || !site) { console.error('usage: crawl.mjs <url> <site> [maxPages]'); process.exit(1); }
const MAX = +maxArg || 14, origin = new URL(start).origin;
const RES = path.join(ROOT, 'research', site), ORIG = path.join(ROOT, 'reuse-assets', 'original');
for (const d of ['screenshots', 'shaders', 'spector', 'pages']) fs.mkdirSync(path.join(RES, d), {recursive: true});

const TYPE = [
  [/\.(glb|gltf|bin|drc|draco|meshopt|fbx|obj|usdz)$/i, '3d'], [/\.(ktx2|basis|dds)$/i, 'textures'], [/\.(hdr|exr)$/i, 'hdri'],
  [/\.(mp4|webm|mov|m3u8)$/i, 'video'], [/\.(wav|mp3|ogg|m4a|aac)$/i, 'audio'], [/\.svg$/i, 'svg'],
  [/\.(jpe?g|png|webp|avif|gif)$/i, 'images'], [/\.(woff2?|ttf|otf)$/i, 'fonts'], [/\.(glsl|vert|frag|wgsl)$/i, 'shaders'],
  [/\.(wasm|js|mjs|css|json|html?)$/i, 'code'],
];
const typeOf = (u, mime = '') => {
  const p = new URL(u).pathname;
  for (const [re, t] of TYPE) if (re.test(p)) return t;
  if (/model\/gltf/.test(mime)) return '3d'; if (/^image\//.test(mime)) return 'images'; if (/^video\//.test(mime)) return 'video';
  if (/^audio\//.test(mime)) return 'audio'; if (/font/.test(mime)) return 'fonts'; if (/javascript|css|json|html|wasm/.test(mime)) return 'code';
  return null;
};
const localPath = (u, t) => {
  const url = new URL(u); let p = decodeURIComponent(url.pathname).replace(/[<>:"|?*]/g, '_');
  if (p.endsWith('/')) p += 'index.html'; if (!path.extname(p) && t === 'code') p += '.html';
  const host = url.host === new URL(origin).host ? '' : '_ext/' + url.host;
  return path.join(ORIG, t, site, host, p);
};

// WebGL hook: runs before any page script, records every shader + program + texture upload.
const HOOK = () => {
  const cap = window.__glcap = {shaders: [], programs: [], textures: [], contexts: 0};
  const wrap = proto => {
    if (!proto || proto.__wrapped) return; proto.__wrapped = 1;
    const src = proto.shaderSource, link = proto.linkProgram, att = proto.attachShader, t2 = proto.texImage2D, ts = proto.texStorage2D;
    proto.shaderSource = function (sh, s) { sh.__id = cap.shaders.length; cap.shaders.push({src: s}); return src.call(this, sh, s); };
    proto.attachShader = function (p, sh) { (p.__sh ||= []).push(sh); return att.call(this, p, sh); };
    proto.linkProgram = function (p) {
      const r = link.call(this, p);
      try {
        const n = this.getProgramParameter(p, this.ACTIVE_UNIFORMS), u = [];
        for (let i = 0; i < n; i++) u.push(this.getActiveUniform(p, i).name);
        cap.programs.push({shaders: (p.__sh || []).map(s => s.__id), uniforms: u});
      } catch {}
      return r;
    };
    proto.texImage2D = function (...a) {
      try { const s = a[a.length - 1]; if (cap.textures.length < 400) cap.textures.push({w: s?.width ?? a[3], h: s?.height ?? a[4], src: s?.currentSrc || s?.src || s?.tagName || typeof s}); } catch {}
      return t2.apply(this, a);
    };
    if (ts) proto.texStorage2D = function (...a) { if (cap.textures.length < 400) cap.textures.push({w: a[3], h: a[4], storage: true}); return ts.apply(this, a); };
  };
  wrap(window.WebGLRenderingContext?.prototype); wrap(window.WebGL2RenderingContext?.prototype);
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) { if (/webgl/.test(t)) cap.contexts++; return gc.call(this, t, o); };
};

const browser = await chromium.launch({headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
await ctx.addInitScript(HOOK);

const net = new Map(), saved = new Set(), initiators = new Map();
let current = start;
async function onResponse(res) {
  try {
    const u = res.url(); if (!/^https?:/.test(u)) return;
    const h = res.headers(), mime = (h['content-type'] || '').split(';')[0], t = typeOf(u, mime);
    const req = res.request(), key = u.split('#')[0];
    const rec = net.get(key) || {url: key, filename: path.basename(new URL(u).pathname) || 'index', ext: path.extname(new URL(u).pathname).slice(1).toLowerCase(),
      mime, status: res.status(), resourceType: req.resourceType(), initiator: initiators.get(key) || null, pages: [], type: t, size: null, saved: null};
    if (!rec.pages.includes(current)) rec.pages.push(current);
    net.set(key, rec);
    if (!t || saved.has(key) || res.status() >= 300 || req.method() !== 'GET') return;
    saved.add(key);
    const body = await res.body().catch(() => null); if (!body) return;
    const out = localPath(u, t); fs.mkdirSync(path.dirname(out), {recursive: true});
    if (!fs.existsSync(out)) fs.writeFileSync(out, body);
    rec.size = body.length; rec.saved = path.relative(ROOT, out).replaceAll('\\', '/');
  } catch {}
}

const norm = u => { const x = new URL(u, origin); x.hash = ''; x.search = ''; return x.href.replace(/\/$/, ''); };
const queue = [norm(start)], seen = new Set(queue), pages = [];
const spectorSrc = path.join(ROOT, 'tools/scrap/node_modules/spectorjs/dist/spector.bundle.js');

while (queue.length && pages.length < MAX) {
  const url = queue.shift(); current = url;
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', e => { const i = e.initiator; initiators.set(e.request.url.split('#')[0], i.url || i.stack?.callFrames?.[0]?.url || i.type); });
  page.on('response', onResponse);
  const slug = (new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home').slice(0, 60);
  console.log(`[${pages.length + 1}/${MAX}] ${url}`);
  const rec = {url, slug, title: '', links: [], webgl: false, video: false, canvases: 0, height: 0};
  try {
    await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
    await page.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {});
    await page.waitForTimeout(3500);
    await page.screenshot({path: path.join(RES, 'screenshots', `${slug}-00-arrival.png`)});
    for (const txt of ['Enter', 'Skip', 'Start', 'Explore']) {
      const b = page.getByRole('button', {name: new RegExp(`^${txt}`, 'i')}).first();
      if (await b.isVisible().catch(() => false)) { await b.click({timeout: 2000}).catch(() => {}); await page.waitForTimeout(1500); }
    }
    // Slow wheel scroll: drives smooth-scroll libraries and scroll-linked WebGL.
    // End detection compares frames (inner scroll containers keep window.scrollY at 0).
    let last = '', same = 0, shots = 0;
    for (let i = 0; i < 320; i++) {
      await page.mouse.move(720, 450); await page.mouse.wheel(0, 260); await page.waitForTimeout(160);
      if (i % 7 === 6) {
        const buf = await page.screenshot({path: path.join(RES, 'screenshots', `${slug}-${String(++shots).padStart(2, '0')}.png`)});
        const sig = buf.length + ':' + buf.subarray(buf.length / 2, buf.length / 2 + 64).toString('hex');
        same = sig === last ? same + 1 : 0; last = sig;
        if (same >= 3) break;
      }
    }
    const hovers = await page.locator('a:visible, button:visible, [role=button]:visible').all();
    for (const h of hovers.slice(0, 40)) await h.hover({timeout: 800}).catch(() => {});
    await page.waitForTimeout(1200);
    Object.assign(rec, await page.evaluate(o => {
      const links = [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(o));
      const fonts = {}; for (const sel of ['body', 'h1', 'h2', 'h3', 'p', 'a', 'button']) { const e = document.querySelector(sel); if (e) { const c = getComputedStyle(e); fonts[sel] = {family: c.fontFamily, size: c.fontSize, weight: c.fontWeight, lh: c.lineHeight, ls: c.letterSpacing, tt: c.textTransform}; } }
      const sections = [...document.querySelectorAll('section, header, footer, main > div')].slice(0, 60).map(s => { const b = s.getBoundingClientRect(), c = getComputedStyle(s); return {tag: s.tagName, cls: String(s.className).slice(0, 80), h: Math.round(b.height), w: Math.round(b.width), pad: c.padding, pos: c.position, display: c.display, grid: c.gridTemplateColumns}; });
      const libs = {threeRev: window.__THREE__ || null, gsap: window.gsap?.version || null, ScrollTrigger: !!window.ScrollTrigger, lenis: !!(window.lenis || window.Lenis), barba: !!window.barba, pixi: !!window.PIXI, babylon: !!window.BABYLON};
      return {title: document.title, links: [...new Set(links)], canvases: document.querySelectorAll('canvas').length, video: !!document.querySelector('video'),
        webgl: (window.__glcap?.contexts || 0) > 0, height: document.documentElement.scrollHeight, fonts, sections, libs,
        colors: [...new Set([...document.querySelectorAll('body *')].slice(0, 1500).flatMap(e => { const c = getComputedStyle(e); return [c.color, c.backgroundColor]; }))].slice(0, 40)};
    }, origin));
    const gl = await page.evaluate(() => window.__glcap);
    if (gl?.shaders.length) {
      fs.writeFileSync(path.join(RES, 'shaders', `${slug}.json`), JSON.stringify(gl, null, 1));
      const dir = path.join(RES, 'shaders', slug); fs.mkdirSync(dir, {recursive: true});
      gl.shaders.forEach((s, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(3, '0')}.${/gl_FragColor|fragColor|pc_fragColor|gl_FragData/.test(s.src) ? 'frag' : 'vert'}.glsl`), s.src));
      rec.glsl = {shaders: gl.shaders.length, programs: gl.programs.length, textures: gl.textures.length};
    }
    if (rec.webgl && fs.existsSync(spectorSrc)) {
      await page.addScriptTag({path: spectorSrc}).catch(() => {});
      const cap = await page.evaluate(() => new Promise(done => {
        try {
          const S = new SPECTOR.Spector(), c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
          const t = setTimeout(() => done(null), 8000);
          S.onCapture.add(x => { clearTimeout(t); try { done(JSON.stringify(x)); } catch { done(null); } }); S.captureCanvas(c, 0, true);
        } catch { done(null); }
      })).catch(() => null);
      if (cap) { fs.writeFileSync(path.join(RES, 'spector', `${slug}.json`), cap); rec.spector = `research/${site}/spector/${slug}.json`; }
    }
    fs.writeFileSync(path.join(RES, 'pages', `${slug}.json`), JSON.stringify(rec, null, 1));
    for (const l of rec.links) { const n = norm(l); if (!seen.has(n) && !/\.(pdf|jpg|png|zip)$/i.test(n)) { seen.add(n); queue.push(n); } }
  } catch (e) { rec.error = String(e).slice(0, 300); console.log('  !', rec.error); }
  pages.push({url: rec.url, title: rec.title, slug, webgl: rec.webgl, video: rec.video, canvases: rec.canvases, height: rec.height, glsl: rec.glsl, spector: rec.spector, error: rec.error});
  await page.close();
}

const mctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true});
const mp = await mctx.newPage(); current = start; mp.on('response', onResponse);
try {
  await mp.goto(start, {waitUntil: 'domcontentloaded', timeout: 60000}); await mp.waitForTimeout(5000);
  for (let i = 0; i < 6; i++) { await mp.screenshot({path: path.join(RES, 'screenshots', `mobile-${i}.png`)}); await mp.evaluate(() => scrollBy(0, innerHeight)); await mp.waitForTimeout(1200); }
} catch {}
await browser.close();

fs.writeFileSync(path.join(RES, 'site-map.json'), JSON.stringify({site, origin, crawled: new Date().toISOString(), pages, unvisited: queue}, null, 1));
const list = [...net.values()];
fs.writeFileSync(path.join(RES, 'network-assets.json'), JSON.stringify(list, null, 1));
const by = {}; for (const r of list) if (r.saved) by[r.type] = (by[r.type] || 0) + 1;
console.log('pages', pages.length, 'requests', list.length, 'saved', by);
