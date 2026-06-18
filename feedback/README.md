# User feedback log

Submitted feedback from the app is appended to `entries.jsonl` in this folder (one JSON object per line).

Each entry includes:

- `id` — unique entry id
- `category` — bug, feature, or general
- `message` — user comment
- `contact` — optional name or email
- `status` — `open` or `fixed`
- `fixedAt` — ISO timestamp when marked fixed (null if open)
- `context` — passage reference, language, page URL, browser info
- `receivedAt` — ISO timestamp

## Setup (Vercel)

Add these environment variables in the Vercel project settings:

| Variable | Value |
|----------|--------|
| `GITHUB_TOKEN` | GitHub personal access token with `repo` scope |
| `GITHUB_REPO` | `Kithkin22/Hebrew-Contour-App` |
| `FEEDBACK_ADMIN_PASSWORD` | Password for the private admin inbox (choose your own) |

Redeploy after adding the variables. Without `GITHUB_TOKEN` / `GITHUB_REPO`, the Feedback button still opens, but submissions cannot be saved to GitHub.

## Admin inbox (private)

Review feedback and mark items fixed at **`/admin.html`** on your deployed site (not linked from the public app).

1. Open `https://your-app.vercel.app/admin.html`
2. Sign in with `FEEDBACK_ADMIN_PASSWORD`
3. Use the **Mark fixed** checkbox on each item, or filter by Open / Fixed

The admin page calls `/api/feedback-admin`, which reads and updates `entries.jsonl` via the same GitHub token.
