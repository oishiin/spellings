# Spell with Hen 🐔

A simple "Look, Cover, Write, Check" spelling practice game for kids, with your own word lists.

1. **Look** at the word.
2. **Cover** it.
3. **Write** it from memory on the on-screen keyboard.
4. **Check** it. Mistakes are shown letter by letter, so you can try again.

## Features

- Make your own spelling lists (type or paste words, one per line or comma-separated)
- Pick one or more lists to practise
- Options: mix up the order, show letter boxes, cover automatically after 3/5/10 seconds
- On-screen keyboard for tablets (a normal keyboard works too)
- Progress lights, and a "practise these again" round for tricky words

## Font

The game uses [OpenDyslexic](https://opendyslexic.org), a free font designed to be easier
to read for people with dyslexia. It is released under the SIL Open Font License 1.1.

## Privacy

Everything runs in the browser. Word lists and settings are saved in `localStorage`
on the device only (keys starting with `lcwc-`). Nothing is sent anywhere, and there is
no AI or text-to-speech. The page makes no requests to other websites.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. The site will be live at `https://<your-username>.github.io/spell-with-hen/`.

## Files

- `index.html`: the page layout
- `style.css`: all the styles (colours, layout, keyboard, animations)
- `script.js`: the game code
- `fonts/`: the OpenDyslexic font (regular and bold), with its licence in `fonts/OFL.txt`
- `.nojekyll`: tells GitHub Pages to serve the files as they are
