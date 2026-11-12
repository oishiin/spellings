# Look, Cover, Write, Check

A simple spelling practice game for kids, with your own word lists.

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

## Privacy

Everything runs in the browser. Word lists and settings are saved in `localStorage`
on the device only (keys starting with `lcwc-`). Nothing is sent anywhere, and there is
no AI or text-to-speech. The only outside request is for the Google Fonts stylesheet.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
4. The site will be live at `https://<your-username>.github.io/<repo-name>/`.

## Files

- `index.html`: the whole app (HTML, CSS and JavaScript in one file)
- `.nojekyll`: tells GitHub Pages to serve the files as they are
