/*! Жунгли stickers · Copyright (c) 2026 Zarema Khalilova. All rights reserved. See LICENSE. */
// Builds a test Telegram sticker set from the app's plant drawings (zhungli/app/shapes.js).
// Output: svg/*.svg (sources) and png/*.png (512x512, transparent), rendered by headless Chrome.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const SHAPES_JS = path.join(__dirname, '../zhungli/app/shapes.js');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const code = fs.readFileSync(SHAPES_JS, 'utf8') + ';globalThis.__x = { SHAPES, FACES, CHEEKS, POT_SVG };';
const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);
const { SHAPES, FACES, CHEEKS, POT_SVG } = ctx.__x;

// Light theme colors from style.css
const CSS = `
.lf{fill:#33b067}.lf2{fill:#1f8a4c}.lf3{fill:#8ee3ae}.bl{fill:#ff7fb0}.ye{fill:#ffc93c}.gl{fill:#d3e8ff}
.pot{fill:var(--pot)}.pot2{fill:var(--pot-2)}.shine{fill:#fff;opacity:.35}
.fs{fill:none;stroke:#2a2118;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.fe{fill:#2a2118}.ck{fill:#ff6f9f;opacity:.5}
.st{fill:none;stroke:#1f8a4c;stroke-width:2;stroke-linecap:round}.vein{fill:none;stroke:#8ee3ae;stroke-width:1.2;stroke-linecap:round}
.cut{fill:none;stroke:rgba(255,255,255,.85);stroke-width:2;stroke-linecap:round}.co{fill:#e2457e;stroke:#33b067;stroke-width:1.6}
.trap{fill:#e2457e}.trunk{fill:#8a5a3c}.jar{fill:none;stroke:#c9bfb2;stroke-width:1.6}.rt{fill:none;stroke:var(--pot-2);stroke-width:1.4;stroke-linecap:round}
.drop{fill:#6bb5ff}.ink{fill:none;stroke:#2a2118;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
`;
const POTS = [['#ff8a3d', '#e2702a'], ['#6bb5ff', '#4a96e6'], ['#ff9ec4', '#ef7aa8'], ['#a99bff', '#8b7bf0'], ['#ffc93c', '#ecb11e'], ['#4cc77a', '#34ad62']];

// Small drawings around the plant
const drop = (x, y, s = 1) => `<path class="drop" transform="translate(${x} ${y}) scale(${s})" d="M0-3.4C1.6-1.2 2.4.2 2.4 1.2a2.4 2.4 0 0 1-4.8 0C-2.4.2-1.6-1.2 0-3.4z"/>`;
const heart = (x, y, s = 1, c = '#e2457e') => `<path fill="${c}" transform="translate(${x} ${y}) scale(${s})" d="M0 2C-2.6.3-3.4-1.4-2.2-2.4c.9-.7 1.8-.3 2.2.4.4-.7 1.3-1.1 2.2-.4 1.2 1 .4 2.7-2.2 4.4z"/>`;
const spark = (x, y, s = 1, c = '#ffc93c') => `<path fill="${c}" transform="translate(${x} ${y}) scale(${s})" d="M0-3.2Q.5-.5 3.2 0 .5.5 0 3.2-.5.5-3.2 0-.5-.5 0-3.2z"/>`;
const zed = (x, y, s) => `<path class="ink" d="M${x} ${y}h${s}l-${s} ${s}h${s}"/>`;
const PROPS = {
  hot: `<circle fill="#ffc93c" cx="4" cy="6" r="4.2"/><path stroke="#ffc93c" stroke-width="1.6" stroke-linecap="round" d="M4-2.5v1.6M4 13v1.6M-4.5 6h1.6M11 6h1.6M-2 0l1.1 1.1M8.9 10.9 10 12M-2 12l1.1-1.1M8.9 1.1 10 0"/>${drop(15, 37, .8)}${drop(50, 35, .9)}`,
  watered: `${drop(9, 13)}${drop(16, 5, .8)}${drop(4, 23, .7)}`,
  dim: `<g fill="#aab6c8"><circle cx="54" cy="4" r="3.6"/><circle cx="59" cy="2" r="4.4"/><circle cx="64" cy="4.4" r="3.2"/><rect x="52" y="4" width="13" height="4" rx="2"/></g>${drop(55, 12, .55)}${drop(61, 13.5, .55)}`,
  love: `${heart(7, 10, 1.3)}${heart(57, 6, 1)}${heart(61, 15, .7, '#ff6f9f')}`,
  sleepy: `${zed(54, -2, 3)}${zed(59.5, -7, 4.5)}`,
  wow: `<rect fill="#ff8a3d" x="29.8" y="2" width="4.4" height="11" rx="2.2"/><circle fill="#ff8a3d" cx="32" cy="17" r="2.4"/>`,
  party: [['#ff7fb0', 9, 8, 20], ['#6bb5ff', 15, 2, -30], ['#ffc93c', 50, 3, 40], ['#a99bff', 56, 10, -15], ['#4cc77a', 5, 17, 60], ['#ff8a3d', 60, 19, 25], ['#ffc93c', 22, -3, 10], ['#ff7fb0', 43, -4, -40]]
    .map(([c, x, y, r]) => `<rect fill="${c}" x="${x - 1.6}" y="${y - .8}" width="3.2" height="1.6" rx=".5" transform="rotate(${r} ${x} ${y})"/>`).join(''),
  grumpy: `<path fill="none" stroke="#e2457e" stroke-width="1.8" stroke-linecap="round" d="M53 4.6q2.4 0 2.4-2.4M58.6 2.2q0 2.4 2.4 2.4M61 8.2q-2.4 0-2.4 2.4M55.4 10.6q0-2.4-2.4-2.4"/>`,
  wink: `${spark(58, 47, 1.1)}${spark(60, 40, .6)}`,
  fine: `${spark(8, 12, .9)}${spark(57, 36, .7)}`,
};

// New faces (same grid as FACES in shapes.js: eyes at y≈50, mouth at y≈54)
const NEW_FACES = {
  love: `${heart(28, 50.2, .85)}${heart(36, 50.2, .85)}<path class="fs" d="M29 53.2q3 2.8 6 0"/>`,
  laugh: '<path class="fs" d="M26.2 51l1.8-1.9 1.8 1.9M34.2 51l1.8-1.9 1.8 1.9"/><path class="fe" d="M28.6 52.6h6.8q-.3 3.8-3.4 3.8t-3.4-3.8z"/>',
  sleepy: '<path class="fs" d="M26.2 50.2q1.8 1.5 3.6 0M34.2 50.2q1.8 1.5 3.6 0"/><circle class="fe" cx="32" cy="54.8" r="1.1"/>',
  wow: '<path class="fs" d="M26.2 47.8q1.8-1 3.6 0M34.2 47.8q1.8-1 3.6 0"/><circle class="fe" cx="28" cy="50.6" r="1.8"/><circle class="fe" cx="36" cy="50.6" r="1.8"/><circle fill="#fff" cx="28.6" cy="50" r=".55"/><circle fill="#fff" cx="36.6" cy="50" r=".55"/><ellipse class="fe" cx="32" cy="55" rx="1.4" ry="1.8"/>',
  party: '<path class="fs" d="M26.2 51l1.8-1.9 1.8 1.9M34.2 51l1.8-1.9 1.8 1.9"/><path class="fe" d="M28.8 52.8h6.4q-.3 3.4-3.2 3.4t-3.2-3.4z"/><path fill="#ff6f9f" d="M30.6 55.4q1.4-1.2 2.8 0-.5.8-1.4.8t-1.4-.8z"/>',
  grumpy: '<path class="fs" d="M25.8 47.4l3.4 1.5M38.2 47.4l-3.4 1.5M29.4 55.4q2.6-1.8 5.2 0"/><circle class="fe" cx="28" cy="50.8" r="1.5"/><circle class="fe" cx="36" cy="50.8" r="1.5"/>',
  wink: '<circle class="fe" cx="28" cy="50.2" r="1.5"/><path class="fs" d="M34.2 50.6q1.8-1.8 3.6 0M29 53.2q3 2.8 6 0"/>',
};
// Props drawn inside the face, so they scale with it
const FACE_PROPS = { laugh: `${drop(22.6, 49.6, .5)}${drop(41.4, 49.6, .5)}` };
const face = m => CHEEKS + (FACES[m] || NEW_FACES[m]) + (FACE_PROPS[m] || '');
// Stickers are seen at ~160 px in a chat, so the pot grows from its rim and the face grows inside it.
const POT_SCALE = 1.3, FACE_SCALE = 1.15;
// Telegram stretches the 512 px canvas to its sticker size, so empty margin makes stickers look smaller.
// 80 units fit the drawing edge to edge; 94 shows it at about 85%.
const SIZE = 94, VIEW = `${32 - SIZE / 2} ${31 - SIZE / 2} ${SIZE} ${SIZE}`;
const potWith = faceSvg => `<g transform="translate(32 40.5) scale(${POT_SCALE}) translate(-32 -40.5)">${POT_SVG}` +
  `<g transform="translate(32 52) scale(${FACE_SCALE}) translate(-32 -52)">${faceSvg}</g></g>`;
const potWithFace = m => potWith(face(m));

// [file, shape, mood, pot color, emoji, meaning]
const SET = [
  ['01-ok', 'split', 'fine', 0, '👍', 'all good'],
  ['02-thirsty', 'arrow', 'need', 1, '😩', 'so tired'],
  ['03-bliss', 'orchid', 'watered', 2, '😌', 'bliss / thanks'],
  ['04-sad', 'tree', 'dim', 3, '😔', 'sad'],
  ['05-hot', 'cactus', 'hot', 4, '🥵', 'so hot'],
  ['06-love', 'heart', 'love', 2, '😍', 'love it'],
  ['07-laugh', 'flytrap', 'laugh', 5, '😂', 'lol'],
  ['08-sleepy', 'palm', 'sleepy', 1, '😴', 'sleepy'],
  ['09-wow', 'succulent', 'wow', 3, '😮', 'wow'],
  ['10-party', 'flowering', 'party', 0, '🥳', 'party'],
  ['11-grumpy', 'prayer', 'grumpy', 4, '😤', 'grumpy'],
  ['12-wink', 'coleus', 'wink', 5, '😉', 'wink'],
];

// Thin white sticker outline with a soft shadow. Blur + threshold gives a round edge
// (a box-shaped dilate makes square corners).
const EDGE = [.6, .1, 25]; // [blur, cut, sharpness]: more blur or lower cut = wider outline
const FILTER = `<filter id="o" x="-30%" y="-30%" width="160%" height="160%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${EDGE[0]}"/>
  <feComponentTransfer result="d"><feFuncA type="linear" slope="${EDGE[2]}" intercept="${-EDGE[2] * EDGE[1]}"/></feComponentTransfer>
  <feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/>
  <feGaussianBlur in="d" stdDeviation=".9"/><feOffset dy=".7"/><feComponentTransfer><feFuncA type="linear" slope=".25"/></feComponentTransfer>
  <feMerge><feMergeNode/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

const svgDoc = (pot, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="${VIEW}">
<style>:root{--pot:${POTS[pot][0]};--pot-2:${POTS[pot][1]}}html,body,svg{margin:0;background:transparent}${CSS}</style>
<defs>${FILTER}</defs>${body}</svg>`;
const shot = (svgPath, pngPath) => execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
  '--default-background-color=00000000', '--window-size=512,512', `--screenshot=${pngPath}`, `file://${svgPath}`], { stdio: 'ignore' });

module.exports = { SHAPES, POT_SVG, FACES, NEW_FACES, CHEEKS, CHROME, SET, POT_SCALE, drop, heart, spark, zed, potWith, svgDoc, shot };
if (require.main === module) main();

function main() {
fs.mkdirSync(path.join(__dirname, 'svg'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'png'), { recursive: true });
for (const [file, shape, mood, pot, emoji] of SET) {
  const svg = svgDoc(pot, `<g filter="url(#o)">${PROPS[mood] || ''}${SHAPES[shape].replace(POT_SVG, '')}${potWithFace(mood)}</g>`);
  const svgPath = path.join(__dirname, 'svg', `${file}.svg`);
  fs.writeFileSync(svgPath, svg);
  const pngPath = path.join(__dirname, 'png', `${file}.png`);
  shot(svgPath, pngPath);
  console.log(file, emoji);
}
fs.writeFileSync(path.join(__dirname, 'set.json'), JSON.stringify(SET.map(([file, shape, mood, pot, emoji, meaning]) => ({ file: `png/${file}.png`, shape, mood, emoji, meaning })), null, 2));

// Preview sheet on Telegram-like light and dark chat backgrounds
const cells = SET.map(([file, , , , emoji, meaning]) => `<figure><img src="png/${file}.png"><figcaption>${emoji} ${meaning}</figcaption></figure>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:600 15px -apple-system,system-ui,sans-serif}
section{padding:24px;display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.light{background:#c8dba8}.dark{background:#0e1621;color:#e6ebf0}
figure{margin:0;text-align:center}img{width:100%;display:block}figcaption{margin-top:2px;opacity:.8}
</style><section class="light">${cells}</section><section class="dark">${cells}</section>`;
const htmlPath = path.join(__dirname, 'preview.html');
fs.writeFileSync(htmlPath, html);
execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,962',
  `--screenshot=${path.join(__dirname, 'preview.png')}`, `file://${htmlPath}`], { stdio: 'ignore' });
fs.unlinkSync(htmlPath);
}
