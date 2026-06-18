# User feedback log

Submitted feedback from the app is appended to `entries.jsonl` in this folder (one JSON object per line).

Each entry includes:

- `category` — bug, feature, or general
- `message` — user comment
- `contact` — optional name or email
- `context` — passage reference, language, page URL, browser info
- `receivedAt` — ISO timestamp

## Setup (Vercel)

Add these environment variables in the Vercel project settings:

| Variable | Value |
|----------|--------|
| `GITHUB_TOKEN` | GitHub personal access token with `repo` scope |
| `GITHUB_REPO` | `Kithkin22/Hebrew-Contour-App` |

Redeploy after adding the variables. Without them, the Feedback button still opens, but submissions cannot be saved to GitHub.
