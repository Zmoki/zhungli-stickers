/*! Жунгли stickers · Copyright (c) 2026 Zarema Khalilova. All rights reserved. See LICENSE. */
// Pack icon from the app icon (../zhungli/app/icons/icon.svg): icon/icon.png (100x100, static packs)
// and icon/icon.webm (100x100, leaves sway; video packs, up to 32 KB). Set it with /setpackicon in @Stickers.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const { CHROME } = require('./build.js');

const FPS = 24, FRAMES = 70, LIMIT = 32 * 1024;
const svg = fs.readFileSync(path.join(__dirname, '../zhungli/app/icons/icon.svg'), 'utf8').replace(/<!--[\s\S]*?-->\s*/, '');
// The first four lines inside the plant group are the stems and leaves; they sway around the stem base.
const lines = svg.split('\n');
const g = lines.findIndex(l => l.includes('<g transform'));
const frame = t => {
  const a = (4 * Math.sin(2 * Math.PI * t)).toFixed(3);
  return [...lines.slice(0, g + 1), `<g transform="rotate(${a} 32 44)">`, ...lines.slice(g + 1, g + 5), '</g>', ...lines.slice(g + 5)]
    .join('\n').replace('<svg ', '<svg width="512" height="512" ');
};
const shoot = (svgPath, pngPath, profile) => promisify(execFile)(CHROME, ['--headless', '--disable-gpu', '--hide-scrollbars',
  '--default-background-color=00000000', `--user-data-dir=${profile}`, '--window-size=512,512', `--screenshot=${pngPath}`, `file://${svgPath}`],
  { timeout: 20000, killSignal: 'SIGKILL' });

(async () => {
  const out = path.join(__dirname, 'icon');
  fs.mkdirSync(out, { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sticker-icon-'));
  const jobs = Array.from({ length: FRAMES }, (_, i) => i);
  await Promise.all(Array.from({ length: 6 }, async (_, k) => {
    for (let i; (i = jobs.shift()) !== undefined;) {
      const n = String(i).padStart(3, '0'), svgPath = path.join(dir, `${n}.svg`);
      fs.writeFileSync(svgPath, frame(i / FRAMES));
      for (let tries = 3; ; tries--) {
        try { await shoot(svgPath, path.join(dir, `${n}.png`), path.join(dir, `chrome-${k}`)); break; } catch (e) { if (tries <= 1) throw e; }
      }
    }
  }));
  execFileSync('magick', [path.join(dir, '000.png'), '-resize', '100x100', path.join(out, 'icon.png')]);
  const webm = path.join(out, 'icon.webm');
  let crf = 24;
  for (;;) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%03d.png'),
      '-vf', 'scale=100:100:flags=lanczos', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(crf), '-an', webm]);
    if (fs.statSync(webm).size <= LIMIT || crf >= 50) break;
    crf += 4;
  }
  fs.rmSync(dir, { recursive: true });
  console.log('icon.png, icon.webm', `${(fs.statSync(webm).size / 1024).toFixed(0)} KB`, `CRF ${crf}`);
})();
