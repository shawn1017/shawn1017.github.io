// Build a single, self-contained, offline-ready HTML file from the modular app.
// Run: node tools/build-offline.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const CSS = ['css/base.css', 'css/layout.css', 'css/components.css', 'css/exam.css', 'css/animations.css', 'css/ai.css'];
const JS = ['js/store.js', 'js/fx.js', 'js/engine.js', 'js/ui.js', 'js/pages.js', 'js/bank.js', 'js/exam.js', 'js/exampages.js', 'js/ai.js', 'js/app.js'];

const allCss = CSS.map(read).join('\n/* === */\n');
const allJs = JS.map(read).join('\n/* === */\n').replace(/<\/script>/gi, '<\\/script>');

const favicon = read('assets/favicon.svg');
const faviconUri = 'data:image/svg+xml,' + encodeURIComponent(favicon);

// PWA manifest (inline) so the page can be "added to home screen" on phones.
const manifest = {
  name: 'Questly · 每日挑战',
  short_name: 'Questly',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F6F7FB',
  theme_color: '#F6F7FB',
  icons: [{ src: faviconUri, sizes: 'any', type: 'image/svg+xml' }],
};
const manifestUri = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest));

let html = read('index.html');

// 1) drop external <link rel=stylesheet> and <script src> tags
html = html.replace(/<link rel="stylesheet"[^>]*>\s*/g, '');
html = html.replace(/<script src="js\/[^"]*"><\/script>\s*/g, '');

// 2) inline favicon
html = html.replace(
  /<link rel="icon"[^>]*>/,
  `<link rel="icon" href="${faviconUri}" type="image/svg+xml">`
);

// 3) inject PWA / mobile meta into <head>
const pwaMeta = [
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Questly">',
  `<link rel="manifest" href="${manifestUri}">`,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">',
].join('\n  ');
html = html.replace('</head>', pwaMeta + '\n</head>');

// 4) inline CSS before </head>
html = html.replace('</head>', `  <style>\n${allCss}\n  </style>\n</head>`);

// 5) inline JS just before </body>
html = html.replace('</body>', `  <script>\n${allJs}\n  </script>\n</body>`);

const out = path.join(ROOT, 'questly-offline.html');
fs.writeFileSync(out, html, 'utf8');
const kb = (fs.statSync(out).size / 1024).toFixed(1);
console.log(`✓ built ${out} (${kb} KB) — fully offline, single file`);
