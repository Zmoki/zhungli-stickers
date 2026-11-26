# Жунгли stickers

Telegram stickers with the plants from the [Жунгли](https://zhungli.zmoki.xyz/) app. Test set, not published in Telegram yet.

![12 stickers on light and dark chat backgrounds](preview.png)

## Files

- `png/`: stickers, 512×512 with a clear background, ready for Telegram's @Stickers bot
- `svg/`: the same stickers as vector files
- `set.json`: the emoji and meaning for each sticker
- `build.js`: builds everything above and `preview.png`

## Build

The plant drawings come from the app, so clone [zhungli](https://github.com/Zmoki/zhungli) next to this repo:

```
Projects/
  zhungli/
  zhungli-stickers/
```

Then run `node build.js`. It needs Node and Google Chrome (macOS path).

## License

All rights reserved. You can send the stickers from the official pack in Telegram. See [LICENSE](LICENSE).
