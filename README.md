# Hebrew Contour Table App PWA

This folder contains the installable PWA version of the Hebrew Contour Table App.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for BHSA / SHEBANQ proxy design, deployment requirements (Vercel vs GitHub Pages), error/cache behavior, and local verification commands.

## Files
- `index.html` — the app
- `manifest.json` — app install metadata
- `service-worker.js` — offline caching
- `icons/` — home screen icons
- `api/bhsa-verse.js` — BHSA same-origin proxy (Vercel serverless)
- `docs/ARCHITECTURE.md` — BHSA and related architecture notes

## Install on iPhone
1. Upload this folder to a web host such as GitHub Pages.
2. Open the site in Safari on your iPhone.
3. Tap Share.
4. Tap Add to Home Screen.

After the first load, the app should continue to open offline from the Home Screen.

**Note:** GitHub Pages cannot run the BHSA serverless proxy. Use the Vercel deployment for BHSA generation, or use WLC / paste mode on static hosts. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## User feedback

The app includes a **Feedback** button in the workspace toolbar. Submissions are appended to [`feedback/entries.jsonl`](feedback/entries.jsonl) in this repository via a Vercel serverless function.

Users who enter an email receive ticket updates: a **received** confirmation when they submit, and a **fixed** notice when an admin marks the ticket addressed.

A private admin inbox at [`admin.html`](admin.html) lets you review feedback, configure admin notification emails (saved in `feedback/settings.json`, not tied to your GitHub account), and mark items fixed (password-protected; not linked from the main app).

### Vercel setup

In the Vercel project, add environment variables:

- `GITHUB_TOKEN` — personal access token with `repo` scope
- `GITHUB_REPO` — `Kithkin22/Hebrew-Contour-App`
- `FEEDBACK_ADMIN_PASSWORD` — password for `/admin.html`
- `FEEDBACK_NOTIFY_EMAIL` — fallback admin email(s) for new-feedback alerts until you save addresses in `/admin.html`
- `RESEND_API_KEY` — [Resend](https://resend.com) API key for sending those alerts
- `FEEDBACK_EMAIL_FROM` — optional verified sender address (see `feedback/README.md`)
- `FEEDBACK_SITE_URL` — optional deployed site URL for links in alert emails

The **Admin** link in the toolbar shows a red badge when there is unread open feedback (since you last opened `/admin.html`).

Redeploy after saving the variables.
