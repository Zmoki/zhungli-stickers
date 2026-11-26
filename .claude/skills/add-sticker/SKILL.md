---
name: add-sticker
description: Add a new sticker (static PNG and animated WEBM) to the Жунгли Telegram pack, or change an existing one, in the house style. Use for "add a sticker for 🤔", "make a crying plant sticker", "animate X differently", "redo the party sticker".
---

# Add a sticker

The pack is https://t.me/addstickers/wearejungly. Every sticker exists twice with the same name and emoji: `png/NN-name.png` (from `build.js`) and `webm/NN-name.webm` (from `animate.js`). Drawings come from `../zhungli/app/shapes.js`.

## House style (settled with the user, keep it)

- Pot and face are bigger than in the app (`POT_SCALE`, `FACE_SCALE`): stickers show at ~160 px in a chat.
- The drawing fills ~85% of the canvas (`SIZE = 94`). Full-bleed looked too huge in Telegram.
- Very thin round white outline (`EDGE`). A wide outline, or a square one that hugs every detail, looked dirty.
- No text on stickers: they serve both Жунгли and Jungly.

Don't change these constants without asking the user.

## 1. Pick

Agree with the user on:
- **emoji and meaning**: an everyday chat reaction, not a plant fact;
- **plant**: a key of `SHAPES` (leafy, trailing, succulent, cactus, orchid, palm, flowering, herbs, arrow, split, heart, upright, tree, prayer, coleus, flytrap, sundew, pitcher). Prefer one the pack doesn't use yet;
- **pot color**: 0–5 in `POTS`, different from its neighbors in `SET`;
- **face**: an existing one in `FACES` (shapes.js) or `NEW_FACES` (build.js), or a new one;
- **prop** (optional): drops, hearts, sparks, Zs, or a new small drawing.

## 2. Static sticker (build.js)

- New face: add to `NEW_FACES` on the face grid: eyes at x 28 and 36, y ≈ 50; mouth y ≈ 54; brows no higher than y 47.4 (the rim starts above). Class `fe` is filled ink, `fs` is an ink stroke. Low or flat brows close to the eyes read angry; for friendly faces leave brows out or raise them, and add a white shine to round eyes (`<circle fill="#fff" … r=".55"/>`). Look at the face at full size before moving on.
- Gestures (like the 🤔 hand on chin): add to `FRONT` (drawn in front of the pot) and pass the same drawing as `fore` in `scene()`. An arm joined to the rim and hugging the pot reads as a mug handle; start it on the pot's side, bend it at an elbow, end in a leaf hand (see `thinkHand`).
- New prop: add to `PROPS` under the mood name. Keep it inside x −4…68, y −8…68 and off the pot (the pot is wider than in the app: x 11–53 at the rim).
- Add a row to `SET`: next number, file `NN-name`, shape, mood, pot, emoji, meaning.
- Run `node build.js` and look at `preview.png` (light and dark chat backgrounds).

## 3. Animated sticker (animate.js)

Add an entry to `ANIMATIONS` with the same file name. Build the frame with `scene()`; helpers: `sin`, `cos`, `bump`, `fade`, `smooth`, `backOut`, `blink`, `eyes`, `float`.

Rules:
- **Seamless loop**: repeating motion uses whole numbers of cycles per loop (`sin(2 * t)`); props that travel use `p = (t + phase) % 1` and fade in and out with `fade(p)`.
- **Move the whole sticker by translation** (`whole: translate(...)`), not rotation. Rotation changes every pixel, the 256 KB limit then forces heavy compression and the pot smudges. A small, short rotation can pass if the CRF stays at 28–30.
- Props that fade get their own outline through `float()`; props that only scale or turn can go in `back`.
- Keep a sticker's motion small and readable at 160 px: one main action plus a gentle sway or blink.

Steps:
1. `node animate.js NN-name --stills`, then look at `stills.png` (4 moments). Fix the composition here; it takes seconds.
2. `node animate.js NN-name` renders it (~40 s). It prints size and CRF. CRF 28–30 is good. Higher means too much motion: reduce it rather than accept smudges.
3. `node animate.js NN-name --check`, then look at `check.png` (every 10th frame) for smudges, grey patches or ghost edges on the pot.
4. Run `node animate.js` with no name once at the end, so `animated-preview.gif` includes the new sticker.

## 4. Finish

- Commit and push (`png/`, `svg/`, `webm/`, `set.json`, previews, code).
- Send the user the PNG and WEBM files with `SendUserFile` and these @Stickers steps:
  - add: `/addsticker`, pick the pack, send the file **as a file** (not a photo), then the emoji;
  - replace an existing one: `/replacesticker`, pick the sticker, send the new file;
  - order: `/ordersticker`.
- Telegram limits: 512 px, PNG/WEBP for static; WEBM VP9, up to 3 s, 30 fps, 256 KB, no sound for video. The scripts already meet them.
