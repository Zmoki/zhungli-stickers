/*! Жунгли stickers · Copyright (c) 2026 Zarema Khalilova. All rights reserved. See LICENSE. */
// Pack icon: icon/icon.png, 100x100 PNG with a clear background (what /setpackicon in @Stickers accepts).
// The monstera in a pink pot from the 💧 sticker, cropped tight. Not the app icon: the Telegram mini app uses that.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { SHAPES, POT_SVG, FACES, CHEEKS, potWith, svgDoc, shot } = require('./build.js');

const out = path.join(__dirname, 'icon');
fs.mkdirSync(out, { recursive: true });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sticker-icon-'));
const svg = svgDoc(2, `<g filter="url(#o)">${SHAPES.split.replace(POT_SVG, '')}${potWith(CHEEKS + FACES.fine)}</g>`)
  .replace(/viewBox="[^"]*"/, 'viewBox="-3 -1 70 70"'); // tight square crop around plant and pot
fs.writeFileSync(path.join(dir, 'icon.svg'), svg);
shot(path.join(dir, 'icon.svg'), path.join(dir, 'icon.png'));
execFileSync('magick', [path.join(dir, 'icon.png'), '-resize', '100x100', path.join(out, 'icon.png')]);
fs.rmSync(dir, { recursive: true });
console.log('icon/icon.png');
