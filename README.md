Forked to move it to JavaScript and because npm version also have removed original code. 

# Egghead.io video downloader

If you have a pro account with egghead.io you can download a HD video series for later viewing.

Copy `.env-example` to `.env` and update it with your email and password and run the script with the url of a video series e.g.

```bash
npm install
npm run download https://egghead.io/series/getting-started-with-redux
```

If you have VLC installed you can play the series from the terminal e.g.

```bash
vlc "videos/getting-started-with-redux"
```
