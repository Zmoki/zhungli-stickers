/*! Жунгли stickers · Copyright (c) 2026 Zarema Khalilova. All rights reserved. See LICENSE. */
// Builds animated Telegram video stickers: webm/*.webm (512x512 VP9 with alpha, under 3 s, 24 fps, looping).
// Each frame is an SVG drawn from the same parts as build.js, rendered by headless Chrome, then joined by ffmpeg.
// Run `node animate.js` for all, or `node animate.js 08-sleepy` for one.
// `node animate.js 08-sleepy --stills` shows 4 moments of the loop before rendering (stills.png);
// `node animate.js 08-sleepy --check` shows every 10th frame of the finished file (check.png).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const { SHAPES, POT_SVG, FACES, NEW_FACES, THOUGHT, thinkHand, CHEEKS, POT_SCALE, CHROME, drop, heart, spark, zed, potWith, svgDoc } = require('./build.js');

// Telegram allows up to 3 s, 30 fps and 256 KB. Whole-sticker moves are translations, not rotations:
// a rotated frame changes every pixel and the size limit then forces heavy compression.
// 24 fps leaves room for higher quality:
// at 30 fps the size limit forces CRF 34, which smudges the pot on some frames.
const FPS = 24, FRAMES = 70, CRF = 28; // 2.92 s
const LIMIT = 255 * 1024; // if a file is bigger, it's encoded again with more compression
const TAU = Math.PI * 2;
const POT_BOTTOM = 40.5 + 19.8 * POT_SCALE; // the pot squashes from its base
const POT_HEIGHT = 19.8 * POT_SCALE;
const BASE = `${32} ${POT_BOTTOM.toFixed(2)}`; // whole-sticker rotations pivot on the pot's base

const f = n => (+n).toFixed(3);
const sin = x => Math.sin(TAU * x), cos = x => Math.cos(TAU * x);
// 0 → 1 → 0 bump centered at c on the loop, half-width w
const bump = (t, c, w) => { const d = Math.abs(((t - c + 1.5) % 1) - .5); return d < w ? (1 + Math.cos(Math.PI * d / w)) / 2 : 0; };
// Fade in at the start of a prop's life p and out at its end
const fade = (p, fin = .15, fout = .3) => Math.max(0, Math.min(1, p / fin, (1 - p) / fout));
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const backOut = x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

// Squash round eyes (class="fe" circles) to a line; k = 1 open, ~0.1 closed
const eyes = (face, k) => {
  let s = face.replace(/<circle class="fe" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"\/>/g,
    (_, cx, cy, r) => `<ellipse class="fe" cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r * k)}"/>`);
  if (k < .6) s = s.replace(/<circle fill="#fff"[^>]*\/>/g, ''); // eye highlights
  return s;
};
const blink = (face, t, at) => eyes(face, 1 - .92 * bump(t, at, .045));
// A prop with its own outline, faded as a whole
const float = (svg, a, transform = '') => a < .002 ? '' :
  `<g opacity="${f(Math.min(1, a))}"><g filter="url(#o)"${transform ? ` transform="${transform}"` : ''}>${svg}</g></g>`;

// One frame: plant (sway, sag) on a pot (squash from its base), with props behind/in front.
// back: drawn inside the main outline, behind the plant; fore: inside the main outline, in front of the pot; front: own outlines, moves with the sticker; over: own outlines, stays put.
function scene({ shape, face, rot = 0, sag = 1, potSx = 1, potSy = 1, whole = '', back = '', fore = '', front = '', over = '' }) {
  const lift = -(potSy - 1) * POT_HEIGHT; // the rim moves with the squash, the plant rides on it
  const plant = `<g transform="translate(0 ${f(lift)}) rotate(${f(rot)} 32 44) translate(32 44) scale(1 ${f(sag)}) translate(-32 -44)">` +
    `${SHAPES[shape].replace(POT_SVG, '')}</g>`;
  const pot = `<g transform="translate(32 ${POT_BOTTOM}) scale(${f(potSx)} ${f(potSy)}) translate(-32 ${-POT_BOTTOM})">${potWith(face)}</g>`;
  return `<g${whole ? ` transform="${whole}"` : ''}><g filter="url(#o)">${back}${plant}${pot}${fore}</g>${front}</g>${over}`;
}

const SUN = '<circle fill="#ffc93c" cx="4" cy="6" r="4.2"/><path stroke="#ffc93c" stroke-width="1.6" stroke-linecap="round" d="M4-2.5v1.6M4 13v1.6M-4.5 6h1.6M11 6h1.6M-2 0l1.1 1.1M8.9 10.9 10 12M-2 12l1.1-1.1M8.9 1.1 10 0"/>';
const CLOUD = '<g fill="#aab6c8"><circle cx="54" cy="4" r="3.6"/><circle cx="59" cy="2" r="4.4"/><circle cx="64" cy="4.4" r="3.2"/><rect x="52" y="4" width="13" height="4" rx="2"/></g>';
const ANGER = '<path fill="none" stroke="#e2457e" stroke-width="1.8" stroke-linecap="round" d="M53 4.6q2.4 0 2.4-2.4M58.6 2.2q0 2.4 2.4 2.4M61 8.2q-2.4 0-2.4 2.4M55.4 10.6q0-2.4-2.4-2.4"/>';
const BANG = '<rect fill="#ff8a3d" x="29.8" y="2" width="4.4" height="11" rx="2.2"/><circle fill="#ff8a3d" cx="32" cy="17" r="2.4"/>';
const CONFETTI = ['#ff7fb0', '#6bb5ff', '#ffc93c', '#a99bff', '#4cc77a', '#ff8a3d'];

// Each animation returns the SVG body for loop position t in [0, 1). Motion repeats a whole number
// of times per loop, and props that travel fade in and out, so the loop has no seam.
const ANIMATIONS = {
  // Two happy hops, sparkles twinkle, one blink
  '01-ok': { pot: 0, frame(t) {
    const hop = Math.abs(sin(2 * t)), land = (1 - hop) ** 4;
    const tw = ph => .55 + .45 * sin(2 * t + ph);
    return scene({ shape: 'split', face: blink(CHEEKS + FACES.fine, t, .62), rot: 2 * cos(2 * t),
      potSx: 1 + .05 * land, potSy: 1 - .06 * land, whole: `translate(0 ${f(-2.6 * hop)})`,
      back: spark(8, 12, f(.9 * tw(0))) + spark(57, 36, f(.7 * tw(.5))) });
  } },
  // Leaves droop with a slow sigh, a sweat drop runs down the pot
  '02-thirsty': { pot: 1, frame(t) {
    const d = (1 - cos(t)) / 2;
    const sweat = `<g opacity="${f(fade(t, .1, .35))}">${drop(41.5, 47.2 + 3 * t, .55)}</g>`;
    return scene({ shape: 'arrow', face: blink(CHEEKS + FACES.need, t, .3) + sweat, rot: -1.2 * d, sag: 1 - .09 * d,
      potSx: 1 + .025 * d, potSy: 1 - .035 * d });
  } },
  // Water drops fall, the plant sways, the pot wiggles happily
  '03-bliss': { pot: 2, frame(t) {
    const drops = [[9, 0], [16, 1 / 3], [4, 2 / 3]].map(([x, ph]) => {
      const p = (t + ph) % 1;
      return float(drop(x, -8 + 30 * p, .8), fade(p, .12, .3));
    }).join('');
    return scene({ shape: 'orchid', face: CHEEKS + FACES.watered, rot: 2 * sin(t),
      potSx: 1 + .015 * sin(2 * t), potSy: 1 - .015 * sin(2 * t), front: drops });
  } },
  // Rain from a drifting cloud, the tree droops
  '04-sad': { pot: 3, frame(t) {
    const dx = 1.2 * sin(t), d = (1 - cos(t)) / 2;
    const rain = [[55, 0], [59.5, 1 / 3], [63, 2 / 3]].map(([x, ph]) => {
      const p = (t + ph) % 1;
      return float(drop(x + dx, 11 + 14 * p, .55), fade(p, .1, .3));
    }).join('');
    return scene({ shape: 'tree', face: CHEEKS + FACES.dim, rot: -d, sag: 1 - .035 * d, potSx: 1 + .015 * d, potSy: 1 - .02 * d,
      back: `<g transform="translate(${f(dx)} 0)">${CLOUD}</g>`, front: rain });
  } },
  // The sun turns and pulses, the cactus sways in the heat and pants, sweat drips
  '05-hot': { pot: 4, frame(t) {
    const sweat = [[15, 37, .8, 0], [50, 35, .9, .5]].map(([x, y, s, ph]) => {
      const p = (t + ph) % 1;
      return float(drop(x, y + 7 * p, s), fade(p, .15, .35));
    }).join('');
    const sun = `<g transform="rotate(${f(45 * t)} 4 6) translate(4 6) scale(${f(1 + .08 * sin(2 * t))}) translate(-4 -6)">${SUN}</g>`;
    return scene({ shape: 'cactus', face: CHEEKS + FACES.hot, rot: .8 * sin(3 * t + .15),
      potSx: 1 - .015 * sin(4 * t), potSy: 1 + .02 * sin(4 * t), whole: `translate(${f(.9 * sin(3 * t))} 0)`,
      front: sweat, over: float(sun, 1) });
  } },
  // Hearts float up, heart eyes beat
  '06-love': { pot: 2, frame(t) {
    const beat = Math.max(0, sin(2 * t)) ** 2;
    const face = CHEEKS + NEW_FACES.love.replace(/scale\(0\.85\)/g, `scale(${f(.85 * (1 + .22 * beat))})`);
    const hearts = [[8, 0, '#e2457e'], [56, 1 / 3, '#ff6f9f'], [48, 2 / 3, '#e2457e']].map(([x, ph, c]) => {
      const p = (t + ph) % 1;
      return float(heart(f(x + 1.5 * Math.sin(TAU * p * 1.5)), f(14 - 22 * p), f(.6 + .7 * p), c), fade(p, .15, .35));
    }).join('');
    return scene({ shape: 'heart', face, rot: 2.5 * sin(t), potSx: 1 + .02 * beat, potSy: 1 - .02 * beat, over: hearts });
  } },
  // Shakes with laughter, mouth opens on each "ha", tears roll
  '07-laugh': { pot: 5, frame(t) {
    const sh = sin(4 * t), mo = .75 + .35 * Math.abs(sh), p = (t * 2) % 1;
    const face = CHEEKS + '<path class="fs" d="M26.2 51l1.8-1.9 1.8 1.9M34.2 51l1.8-1.9 1.8 1.9"/>' +
      `<g transform="translate(32 52.6) scale(1 ${f(mo)}) translate(-32 -52.6)"><path class="fe" d="M28.6 52.6h6.8q-.3 3.8-3.4 3.8t-3.4-3.8z"/></g>` +
      `<g opacity="${f(fade(p, .1, .6))}">${drop(22.6, 49.6 + 3 * p, .5)}${drop(41.4, 49.6 + 3 * p, .5)}</g>`;
    return scene({ shape: 'flytrap', face, rot: 3 * sin(4 * t - .15),
      whole: `translate(${f(.8 * sh)} ${f(-1.4 * Math.abs(sh))})` });
  } },
  // Slow breath with a snore, leaves sway, Zs float up
  '08-sleepy': { pot: 1, frame(t) {
    const b = sin(t); // one slow breath per loop
    const face = CHEEKS + '<path class="fs" d="M26.2 50.2q1.8 1.5 3.6 0M34.2 50.2q1.8 1.5 3.6 0"/>' +
      `<ellipse class="fe" cx="32" cy="54.8" rx="${f(1.05 + .25 * b)}" ry="${f(1.1 + .5 * b)}"/>`;
    const zs = [0, 1, 2].map(i => {
      const p = (t + i / 3) % 1;
      const x = 52 + 12 * p + 1.2 * Math.sin(TAU * p * 1.5), y = 8 - 20 * p, s = 2.2 + 3.4 * p;
      return float(zed(f(x), f(y), f(s)), fade(p, .15, .3), `rotate(${f(-12 + 18 * p)} ${f(x + s / 2)} ${f(y + s / 2)})`);
    }).join('');
    return scene({ shape: 'palm', face, rot: 1.5 * Math.sin(TAU * t - .6), potSx: 1 - .02 * b, potSy: 1 + .03 * b, over: zs });
  } },
  // Jumps in surprise, leaves fly up, "!" pops
  '09-wow': { pot: 3, frame(t) {
    const jump = t < .3 ? Math.sin(Math.PI * t / .3) : 0;
    const squash = bump(t, .32, .07) + .6 * bump(t, .97, .04);
    const pop = t < .06 ? 0 : t < .2 ? backOut((t - .06) / .14) : t < .85 ? 1 : Math.max(0, 1 - (t - .85) / .12);
    return scene({ shape: 'succulent', face: blink(CHEEKS + NEW_FACES.wow, t, .62), sag: 1 + .1 * jump,
      potSx: 1 + .05 * squash, potSy: 1 - .07 * squash, whole: `translate(0 ${f(-4.5 * jump)})`,
      front: pop > .01 ? float(BANG, 1, `translate(32 19.4) scale(${f(pop)}) translate(-32 -19.4)`) : '' });
  } },
  // Dances, confetti falls
  '10-party': { pot: 0, frame(t) {
    const b = sin(2 * t);
    const confetti = Array.from({ length: 8 }, (_, i) => {
      const ph = (i * .37) % 1, p = (t + ph) % 1, spin = (i % 2 ? 1 : -1) * (1 + i % 3);
      const x = 2 + (i * 7.9) % 60 + 1.5 * Math.sin(TAU * (2 * p + ph)), y = -10 + 34 * p;
      const piece = `<rect fill="${CONFETTI[i % 6]}" x="-1.6" y="-.8" width="3.2" height="1.6" rx=".5"/>`;
      return float(piece, fade(p, .1, .25), `translate(${f(x)} ${f(y)}) rotate(${f(360 * spin * p)}) scale(1 ${f(Math.max(.15, Math.abs(Math.cos(TAU * 2 * p))))})`);
    }).join('');
    return scene({ shape: 'flowering', face: CHEEKS + NEW_FACES.party, rot: -2 * b,
      whole: `translate(${f(1.6 * b)} ${f(-1.6 * Math.abs(b))})`, over: confetti });
  } },
  // Trembles with anger, the anger mark pulses with each huff
  '11-grumpy': { pot: 4, frame(t) {
    const pu = bump((t * 3) % 1, .5, .25);
    return scene({ shape: 'prayer', face: blink(CHEEKS + NEW_FACES.grumpy, t, .15), rot: .6 * sin(14 * t + .2),
      potSx: 1 + .03 * pu, potSy: 1 - .04 * pu, whole: `translate(${f(.35 * sin(14 * t))} 0)`,
      back: `<g transform="translate(57 6.4) scale(${f(1 + .3 * pu)}) translate(-57 -6.4)">${ANGER}</g>` });
  } },
  // Looks, winks with a head tilt, sparkles appear
  '12-wink': { pot: 5, frame(t) {
    const w = t < .25 ? 0 : t < .33 ? smooth((t - .25) / .08) : t < .72 ? 1 : t < .8 ? 1 - smooth((t - .72) / .08) : 0;
    const face = CHEEKS + (w >= .5 ? NEW_FACES.wink :
      `<circle class="fe" cx="28" cy="50.2" r="1.5"/><ellipse class="fe" cx="36" cy="50.2" rx="1.5" ry="${f(Math.max(.15, 1.5 * (1 - 2 * w)))}"/><path class="fs" d="M29 53.2q3 2.8 6 0"/>`);
    const tw = 1 + .15 * sin(4 * t);
    return scene({ shape: 'coleus', face, rot: 1.5 * sin(t), whole: `rotate(${f(5 * w)} ${BASE})`,
      back: w > .01 ? spark(58, 47, f(1.1 * w * tw)) + spark(60, 40, f(.6 * w * tw)) : '' });
  } },
  // Hand on chin: eyes glance aside, then up at a thought bubble that pops in; the hand taps the chin twice
  '13-thinking': { pot: 3, frame(t) {
    const out = t < .86 ? 1 : 1 - smooth((t - .86) / .1); // the bubble goes away before the loop restarts
    const pop = at => (t < at ? 0 : backOut(Math.min(1, (t - at) / .1))) * out;
    const grow = (svg, k, [cx, cy], extra = '') => k > .01 ? float(svg, 1, `translate(${cx} ${cy}) scale(${f(k)}) ${extra} translate(${-cx} ${-cy})`) : '';
    // eyes: up-left first, then up-right at the bubble, back at the end
    const side = -1 + 2 * (smooth((t - .3) / .1) - smooth((t - .86) / .1));
    const ex = 28.2 + .9 * side, ey = 50.5, r = .35 * (side + 1);
    const eye = x => `<circle class="fe" cx="${f(x)}" cy="${f(ey)}" r="1.6"/><circle fill="#fff" cx="${f(x + .6)}" cy="${f(ey - .7)}" r=".55"/>`;
    const face = CHEEKS + blink(eye(ex) + eye(ex + 8), t, .62) +
      `<path class="fs" d="M34.8 ${f(47.9 - .3 * r)}q1.8 ${f(-1.1 - r)} 3.6 0"/>` +
      `<path class="fs" transform="translate(${f(.4 * sin(2 * t))} 0)" d="M29.4 55q1-.9 2 0t2 0"/>`;
    const tap = -12 * (bump(t, .12, .05) + bump(t, .22, .05));
    const { AT } = THOUGHT;
    const bubble = grow(THOUGHT.c1, pop(.36), AT.c1) + grow(THOUGHT.c2, pop(.42), AT.c2) +
      grow(THOUGHT.bubble + THOUGHT.q, pop(.48), AT.bubble, `rotate(${f(5 * sin(2 * t))})`);
    return scene({ shape: 'spider', face, rot: 1.5 * sin(t), fore: thinkHand(f(tap)), over: bubble });
  } },
};

// Renders the given frame numbers to PNGs in dir, several Chrome processes at once
async function renderFrames({ pot, frame }, frames, dir) {
  const run = promisify(execFile);
  const jobs = [...frames];
  const worker = async k => {
    for (let i; (i = jobs.shift()) !== undefined;) {
      const n = String(i).padStart(3, '0');
      const svgPath = path.join(dir, `${n}.svg`);
      fs.writeFileSync(svgPath, svgDoc(pot, frame(i / FRAMES)));
      const args = ['--headless', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
        `--user-data-dir=${path.join(dir, `chrome-${k}`)}`, '--window-size=512,512',
        `--screenshot=${path.join(dir, `${n}.png`)}`, `file://${svgPath}`];
      // Chrome sometimes hangs on a frame: give up after 20 s and try again
      for (let tries = 3; ; tries--) {
        try { await run(CHROME, args, { timeout: 20000, killSignal: 'SIGKILL' }); break; } catch (e) { if (tries <= 1) throw e; }
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, (_, k) => worker(k)));
}

async function render(name, anim) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sticker-${name}-`));
  await renderFrames(anim, Array.from({ length: FRAMES }, (_, i) => i), dir);
  fs.mkdirSync(path.join(__dirname, 'webm'), { recursive: true });
  const out = path.join(__dirname, 'webm', `${name}.webm`);
  let crf = CRF;
  for (;;) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%03d.png'),
      '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(crf), '-deadline', 'good', '-an', out]);
    if (fs.statSync(out).size <= LIMIT || crf >= 40) break;
    crf += 2;
  }
  if (process.env.KEEP_FRAMES) console.log('frames kept in', dir); else fs.rmSync(dir, { recursive: true });
  console.log(name, `${(fs.statSync(out).size / 1024).toFixed(0)} KB`, `CRF ${crf}`);
}

// Puts PNGs in rows on a Telegram-like chat background
const sheet = (pngs, size, perRow, out) => {
  const rows = [];
  for (let i = 0; i < pngs.length; i += perRow) rows.push(['(', ...pngs.slice(i, i + perRow), '-resize', `${size}x${size}`, '+append', ')']);
  execFileSync('magick', [...rows.flat(), '-background', 'none', '-append', '+repage', '-background', '#c8dba8', '-alpha', 'remove', out]);
};

// --stills: 4 moments of the loop before a full render (a few seconds instead of a minute)
async function stills(name, anim) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sticker-${name}-`));
  const frames = [0, .25, .5, .75].map(t => Math.round(t * FRAMES));
  await renderFrames(anim, frames, dir);
  sheet(frames.map(i => path.join(dir, `${String(i).padStart(3, '0')}.png`)), 256, 4, path.join(__dirname, 'stills.png'));
  fs.rmSync(dir, { recursive: true });
  console.log('stills.png');
}

// --check: every 10th frame of the finished WEBM at near full size, to spot compression smudges
function check(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sticker-${name}-`));
  // -c:v libvpx-vp9 before -i keeps the alpha channel
  execFileSync('ffmpeg', ['-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', path.join(__dirname, 'webm', `${name}.webm`),
    '-vf', 'select=not(mod(n\\,10))', '-fps_mode', 'passthrough', path.join(dir, '%02d.png')]);
  sheet(fs.readdirSync(dir).sort().map(n => path.join(dir, n)), 400, 4, path.join(__dirname, 'check.png'));
  fs.rmSync(dir, { recursive: true });
  console.log('check.png');
}

// GIF preview of all animations, 6 per row, on a Telegram-like chat background
function preview() {
  const names = Object.keys(ANIMATIONS), cell = 160, cols = 6, rows = Math.ceil(names.length / cols);
  const files = names.map(n => path.join(__dirname, 'webm', `${n}.webm`));
  if (!files.every(fs.existsSync)) return;
  const inputs = files.flatMap(file => ['-c:v', 'libvpx-vp9', '-i', file]);
  const scaled = names.map((_, i) => `[${i}:v]scale=${cell}:${cell}:flags=lanczos[s${i}]`).join(';');
  const layout = names.map((_, i) => `${(i % cols) * cell}_${Math.floor(i / cols) * cell}`).join('|');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs,
    '-f', 'lavfi', '-i', `color=c=0xc8dba8:s=${cols * cell}x${rows * cell}:r=${FPS}`, '-filter_complex',
    `${scaled};${names.map((_, i) => `[s${i}]`).join('')}xstack=inputs=${names.length}:layout=${layout}[g];` +
    `[${names.length}][g]overlay=shortest=1,split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse`,
    '-loop', '0', path.join(__dirname, 'animated-preview.gif')]);
}

module.exports = { ANIMATIONS };
if (require.main === module) (async () => {
  const [only, mode] = process.argv.slice(2);
  if (only && !ANIMATIONS[only]) throw new Error(`No animation named ${only}`);
  if (mode === '--stills') return stills(only, ANIMATIONS[only]);
  if (mode === '--check') return check(only);
  for (const [name, anim] of Object.entries(ANIMATIONS)) if (!only || name === only) await render(name, anim);
  preview();
})();
