/*! Жунгли stickers · Copyright (c) 2026 Zarema Khalilova. All rights reserved. See LICENSE. */
// Builds animated Telegram video stickers: webm/*.webm (512x512 VP9 with alpha, under 3 s, 24 fps, looping).
// Each frame is an SVG drawn from the same parts as build.js, rendered by headless Chrome, then joined by ffmpeg.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const { SHAPES, POT_SVG, CHEEKS, POT_SCALE, CHROME, zed, potWith, svgDoc } = require('./build.js');

// Telegram allows up to 3 s, 30 fps and 256 KB. 24 fps leaves room for higher quality:
// at 30 fps the size limit forces CRF 34, which smudges the pot on some frames.
const FPS = 24, FRAMES = 70, CRF = 28; // 2.92 s
const TAU = Math.PI * 2;
const POT_BOTTOM = 40.5 + 19.8 * POT_SCALE; // the pot squashes from its base
const POT_HEIGHT = 19.8 * POT_SCALE;

// Each animation returns the SVG body for loop position t in [0, 1).
const ANIMATIONS = {
  '08-sleepy': {
    pot: 1,
    frame(t) {
      const b = Math.sin(TAU * t); // one slow breath per loop
      const sx = 1 - .02 * b, sy = 1 + .03 * b;
      const lift = -.03 * b * POT_HEIGHT; // the rim rises with the breath, the plant rides on it
      const face = CHEEKS + '<path class="fs" d="M26.2 50.2q1.8 1.5 3.6 0M34.2 50.2q1.8 1.5 3.6 0"/>' +
        `<ellipse class="fe" cx="32" cy="54.8" rx="${(1.05 + .25 * b).toFixed(3)}" ry="${(1.1 + .5 * b).toFixed(3)}"/>`;
      const plant = `<g transform="translate(0 ${lift.toFixed(3)}) rotate(${(1.5 * Math.sin(TAU * t - .6)).toFixed(3)} 32 44)">${SHAPES.palm.replace(POT_SVG, '')}</g>`;
      const pot = `<g transform="translate(32 ${POT_BOTTOM}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-32 ${-POT_BOTTOM})">${potWith(face)}</g>`;
      // Three Zs float up and fade, a third of a loop apart, so the loop has no seam.
      const zs = [0, 1, 2].map(i => {
        const p = (t + i / 3) % 1;
        const x = 52 + 12 * p + 1.2 * Math.sin(TAU * p * 1.5), y = 8 - 20 * p, s = 2.2 + 3.4 * p;
        const a = Math.min(1, p / .15, (1 - p) / .3);
        return `<g opacity="${a.toFixed(3)}"><g filter="url(#o)" transform="rotate(${(-12 + 18 * p).toFixed(2)} ${x + s / 2} ${y + s / 2})">${zed(x.toFixed(3), y.toFixed(3), s.toFixed(3))}</g></g>`;
      }).join('');
      return `<g filter="url(#o)">${plant}${pot}</g>${zs}`;
    },
  },
};

async function render(name, { pot, frame }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sticker-${name}-`));
  const run = promisify(execFile);
  const jobs = Array.from({ length: FRAMES }, (_, i) => i);
  // Several Chrome processes at once, each with its own profile folder
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
  fs.mkdirSync(path.join(__dirname, 'webm'), { recursive: true });
  const out = path.join(__dirname, 'webm', `${name}.webm`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%03d.png'),
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(CRF), '-deadline', 'good', '-an', out]);
  if (process.env.KEEP_FRAMES) console.log('frames kept in', dir); else fs.rmSync(dir, { recursive: true });
  console.log(name, `${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

(async () => {
  const only = process.argv[2];
  for (const [name, anim] of Object.entries(ANIMATIONS)) if (!only || name === only) await render(name, anim);
  // GIF preview of the first animation on a Telegram-like chat background
  const [first] = Object.keys(ANIMATIONS);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-c:v', 'libvpx-vp9', '-i', path.join(__dirname, 'webm', `${first}.webm`),
    '-f', 'lavfi', '-i', `color=c=0xc8dba8:s=512x512:r=${FPS}`, '-filter_complex',
    '[1][0]overlay=shortest=1,scale=256:256:flags=lanczos,split[a][b];[a]palettegen=reserve_transparent=0[p];[b][p]paletteuse',
    '-loop', '0', path.join(__dirname, 'animated-preview.gif')]);
})();
