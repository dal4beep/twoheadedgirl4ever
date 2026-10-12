# Two Headed Girl — website

Static site for the band **Two Headed Girl (THG)**. No build step: open `index.html` or host the folder anywhere (GitHub Pages, Netlify, Squarespace code block, etc.).

```
index.html        page markup
css/styles.css    all styles
js/marquee.js     WebGL liquid marquee ("TWO HEADED GIRL / IS SO SEXY")
js/tv.js          1978 wood-grain TV console: channel list lives at the top
js/main.js        "NEW ALBUM COMING SOON" equalizer, footer typewriter, year
```

## Things to fill in
- Booking email: `mailto:booking@example.com` in `index.html`
- Social links (Instagram / TikTok / Twitter) in the footer of `index.html`
- TV channels: edit the `channels` array in `js/tv.js`

## Preview locally
```
python3 -m http.server 8000
# then open http://localhost:8000
```
