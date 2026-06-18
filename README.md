# Hebrew Contour Table App PWA

This folder contains the installable PWA version of the Hebrew Contour Table App.

## Files
- `index.html` — the app
- `manifest.json` — app install metadata
- `service-worker.js` — offline caching
- `icons/` — home screen icons

## Install on iPhone
1. Upload this folder to a web host such as GitHub Pages.
2. Open the site in Safari on your iPhone.
3. Tap Share.
4. Tap Add to Home Screen.

After the first load, the app should continue to open offline from the Home Screen.

## User feedback

The app includes a **Feedback** button in the workspace toolbar. Submissions are appended to [`feedback/entries.jsonl`](feedback/entries.jsonl) in this repository via a Vercel serverless function.

A private admin inbox at [`admin.html`](admin.html) lets you review feedback and mark items fixed (password-protected; not linked from the main app).

### Vercel setup

In the Vercel project, add environment variables:

- `GITHUB_TOKEN` — personal access token with `repo` scope
- `GITHUB_REPO` — `Kithkin22/Hebrew-Contour-App`
- `FEEDBACK_ADMIN_PASSWORD` — password for `/admin.html`

Redeploy after saving the variables.
