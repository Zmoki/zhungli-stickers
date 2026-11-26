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
// Thought bubble: two small circles, a bubble and a "?" (animate.js pops them in one by one around AT)
const AT = { c1: [50, 19.5], c2: [53.6, 14.2], bubble: [59.5, 6] };
const THOUGHT = {
  AT,
  c1: `<circle fill="#e3ddff" cx="${AT.c1[0]}" cy="${AT.c1[1]}" r="1.2"/>`,
  c2: `<circle fill="#e3ddff" cx="${AT.c2[0]}" cy="${AT.c2[1]}" r="1.7"/>`,
  bubble: `<ellipse fill="#e3ddff" cx="${AT.bubble[0]}" cy="${AT.bubble[1]}" rx="7.5" ry="6"/>`,
  q: `<g transform="translate(${AT.bubble[0] - 61} ${AT.bubble[1] - 3})"><path fill="none" stroke="#6b5bd6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M58.6 1.4q0-2.6 2.5-2.6t2.5 2.3q0 1.6-2.3 2.5v1.2"/><circle fill="#6b5bd6" cx="61.3" cy="7.2" r=".95"/></g>`,
};
// 🤔: the app's pothos (trailing) with its right vine as an arm. The vine is drawn in front of the pot
// so it can reach the chin; u = 0 hangs down beside the pot like in the app, u = 1 holds the chin.
// tap tilts the end leaf (degrees).
SHAPES['trailing-arm'] = SHAPES.trailing.replace('M40 42c6 2 9 6 10 13', '').replace(/<ellipse class="lf2?" cx="5[01]"[^>]*\/>/g, '');
const ARM_REST = [[48, 43], [54, 44], [57, 51], [56.5, 57.5]], ARM_UP = [[48, 43], [57, 44.5], [56, 67], [43.5, 64.2]];
const bez = (p, t) => [0, 1].map(i => (1 - t) ** 3 * p[0][i] + 3 * (1 - t) ** 2 * t * p[1][i] + 3 * (1 - t) * t ** 2 * p[2][i] + t ** 3 * p[3][i]);
const bezTan = (p, t) => [0, 1].map(i => 3 * (1 - t) ** 2 * (p[1][i] - p[0][i]) + 6 * (1 - t) * t * (p[2][i] - p[1][i]) + 3 * t ** 2 * (p[3][i] - p[2][i]));
const deg = v => Math.atan2(v[1], v[0]) * 180 / Math.PI;
const n2 = v => v.map(x => x.toFixed(2)).join(' ');
const thinkHand = (u = 1, tap = 0) => {
  const p = ARM_REST.map((a, i) => a.map((v, j) => v + (ARM_UP[i][j] - v) * u));
  const m = bez(p, .45), ma = deg(bezTan(p, .45)), e = p[3], ea = deg(bezTan(p, 1)) + +tap;
  const mr = (ma - 90) * Math.PI / 180, mc = [m[0] + 2.6 * Math.cos(mr), m[1] + 2.6 * Math.sin(mr)];
  const er = ea * Math.PI / 180, ec = [e[0] + 3.4 * Math.cos(er), e[1] + 3.4 * Math.sin(er)];
  return `<path class="st" d="M${n2(p[0])}C${n2(p[1])} ${n2(p[2])} ${n2(p[3])}"/>` +
    `<ellipse class="lf2" cx="${mc[0].toFixed(2)}" cy="${mc[1].toFixed(2)}" rx="4.5" ry="3.2" transform="rotate(${(ma - 40).toFixed(1)} ${n2(mc)})"/>` +
    `<ellipse class="lf" cx="${ec[0].toFixed(2)}" cy="${ec[1].toFixed(2)}" rx="4.5" ry="3.2" transform="rotate(${ea.toFixed(1)} ${n2(ec)})"/>`;
};
// 😭: the peace lily (upright), famous for collapsing dramatically. k = 0 upright, 1 fully drooped:
// the side leaves turn further out and down.
const droop = k => SHAPES.upright.replace(/rotate\((-?)(42|20) 32 44\)/g,
  (_, sign, a) => `rotate(${sign}${(+a + (a === '42' ? 22 : 12) * k).toFixed(1)} 32 44)`);
SHAPES['upright-droop'] = droop(1);
// Tear streams run from the eyes to the bottom of the pot (face coordinates); drops fall below it (sticker coordinates).
const TEAR_STREAMS = ['M28 51.8c-.4 2.6.4 5 0 7.6', 'M36 51.8c.4 2.6-.4 5 0 7.6'];
const TEAR_X = [26, 38];
const tears = (flow = 0) => TEAR_STREAMS.map(d => `<path fill="none" stroke="#6bb5ff" stroke-width="1.9" stroke-linecap="round" d="${d}"/>` +
  `<path fill="none" stroke="#d3e8ff" stroke-width=".7" stroke-linecap="round" stroke-dasharray="1 2.2" stroke-dashoffset="${flow}" d="${d}"/>`).join('');
// 💧: a watering can top right, tilted by theta (degrees; negative tips the spout down onto the plant)
const CAN_AT = [58.5, 4], CAN_TIP = [-13.6, -5.6];
const canTip = theta => { const r = theta * Math.PI / 180;
  return [CAN_AT[0] + CAN_TIP[0] * Math.cos(r) - CAN_TIP[1] * Math.sin(r), CAN_AT[1] + CAN_TIP[0] * Math.sin(r) + CAN_TIP[1] * Math.cos(r)]; };
// Kept simple on purpose (one color: body, straight spout, handle); a detailed can looked busy at chat size.
const can = theta => `<g transform="translate(${CAN_AT.join(' ')}) rotate(${(+theta).toFixed(2)})" fill="#6bb5ff" stroke="#6bb5ff" stroke-linecap="round">` +
  '<rect x="-6" y="-5" width="12" height="10" rx="3" stroke="none"/><path d="M-5 1.4-13-5" fill="none" stroke-width="2.8"/>' +
  '<path d="M6-3q5 0 5 3.4T6 3.6" fill="none" stroke-width="2.2"/></g>';
const FRONT = { thinking: thinkHand(), crying: drop(TEAR_X[0], 69, .7) + drop(TEAR_X[1], 71.5, .6) };
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
  thinking: THOUGHT.c1 + THOUGHT.c2 + THOUGHT.bubble + THOUGHT.q,
  water: '', // set below, after the can is defined
};
PROPS.water = can(-38) + [[.6, 2.6, .5], [-.2, 6.8, .55], [-.8, 11, .6]].map(([dx, dy, k]) => {
  const [x, y] = canTip(-38); return drop((x + dx).toFixed(2), (y + dy).toFixed(2), k); }).join('');

// New faces (same grid as FACES in shapes.js: eyes at y≈50, mouth at y≈54)
const NEW_FACES = {
  love: `${heart(28, 50.2, .85)}${heart(36, 50.2, .85)}<path class="fs" d="M29 53.2q3 2.8 6 0"/>`,
  laugh: '<path class="fs" d="M26.2 51l1.8-1.9 1.8 1.9M34.2 51l1.8-1.9 1.8 1.9"/><path class="fe" d="M28.6 52.6h6.8q-.3 3.8-3.4 3.8t-3.4-3.8z"/>',
  sleepy: '<path class="fs" d="M26.2 50.2q1.8 1.5 3.6 0M34.2 50.2q1.8 1.5 3.6 0"/><circle class="fe" cx="32" cy="54.8" r="1.1"/>',
  wow: '<path class="fs" d="M26.2 47.8q1.8-1 3.6 0M34.2 47.8q1.8-1 3.6 0"/><circle class="fe" cx="28" cy="50.6" r="1.8"/><circle class="fe" cx="36" cy="50.6" r="1.8"/><circle fill="#fff" cx="28.6" cy="50" r=".55"/><circle fill="#fff" cx="36.6" cy="50" r=".55"/><ellipse class="fe" cx="32" cy="55" rx="1.4" ry="1.8"/>',
  party: '<path class="fs" d="M26.2 51l1.8-1.9 1.8 1.9M34.2 51l1.8-1.9 1.8 1.9"/><path class="fe" d="M28.8 52.8h6.4q-.3 3.4-3.2 3.4t-3.2-3.4z"/><path fill="#ff6f9f" d="M30.6 55.4q1.4-1.2 2.8 0-.5.8-1.4.8t-1.4-.8z"/>',
  grumpy: '<path class="fs" d="M25.8 47.4l3.4 1.5M38.2 47.4l-3.4 1.5M29.4 55.4q2.6-1.8 5.2 0"/><circle class="fe" cx="28" cy="50.8" r="1.5"/><circle class="fe" cx="36" cy="50.8" r="1.5"/>',
  wink: '<circle class="fe" cx="28" cy="50.2" r="1.5"/><path class="fs" d="M34.2 50.6q1.8-1.8 3.6 0M29 53.2q3 2.8 6 0"/>',
  // shiny eyes look up at the watering can, open happy smile
  water: '<circle class="fe" cx="29.4" cy="49.8" r="1.6"/><circle class="fe" cx="37.4" cy="49.8" r="1.6"/><circle fill="#fff" cx="30" cy="49.1" r=".55"/><circle fill="#fff" cx="38" cy="49.1" r=".55"/>' +
    '<path class="fe" d="M29.2 53h5.6q-.3 3.2-2.8 3.2t-2.8-3.2z"/><path fill="#ff6f9f" d="M30.6 55.4q1.4-1 2.8 0-.5.8-1.4.8t-1.4-.8z"/>',
  // eyes squeezed shut, worried brows (inner ends up), wide wailing mouth with a tongue, tear streams
  crying: '<path class="fs" d="M25.8 47.9l3.2-1.1M38.2 47.9l-3.2-1.1M26.2 51q1.8-1.8 3.6 0M34.2 51q1.8-1.8 3.6 0"/>' +
    '<path class="fe" d="M28 57.4q4-5.6 8 0z"/><path fill="#ff6f9f" d="M30.2 57.4q1.8-1.6 3.6 0z"/>' + tears(),
  // eyes with a shine glance up at the thought bubble, one brow raised, lips pursed to one side (no low brows: they read angry)
  thinking: '<circle class="fe" cx="29" cy="50.2" r="1.6"/><circle class="fe" cx="37" cy="50.2" r="1.6"/><circle fill="#fff" cx="29.6" cy="49.5" r=".55"/><circle fill="#fff" cx="37.6" cy="49.5" r=".55"/><path class="fs" d="M34.8 47.8q1.8-1.2 3.6 0M30.8 54.2q-1.1.9 0 1.8"/>',
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
  ['13-thinking', 'trailing-arm', 'thinking', 3, '🤔', 'thinking'],
  ['14-crying', 'upright-droop', 'crying', 0, '😭', 'crying'],
  ['15-water', 'split', 'water', 2, '💧', 'time to water'],
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

module.exports = { SHAPES, POT_SVG, FACES, NEW_FACES, THOUGHT, thinkHand, droop, tears, TEAR_X, can, canTip, CHEEKS, CHROME, SET, POT_SCALE, drop, heart, spark, zed, potWith, svgDoc, shot };
if (require.main === module) main();

function main() {
fs.mkdirSync(path.join(__dirname, 'svg'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'png'), { recursive: true });
for (const [file, shape, mood, pot, emoji] of SET) {
  const svg = svgDoc(pot, `<g filter="url(#o)">${PROPS[mood] || ''}${SHAPES[shape].replace(POT_SVG, '')}${potWithFace(mood)}${FRONT[mood] || ''}</g>`);
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
const rows = Math.ceil(SET.length / 6); // each section: padding, rows of ~213 px, gaps
execFileSync(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars', `--window-size=1200,${2 * (48 + rows * 213 + (rows - 1) * 8)}`,
  `--screenshot=${path.join(__dirname, 'preview.png')}`, `file://${htmlPath}`], { stdio: 'ignore' });
fs.unlinkSync(htmlPath);
}
