# User feedback log

Submitted feedback from the app is appended to `entries.jsonl` in this folder (one JSON object per line).

Each entry includes:

- `id` — unique ticket id
- `category` — bug, feature, or general
- `message` — user comment
- `contact` — optional name or email (raw field from the form)
- `ticketEmail` — parsed email address used for ticket notifications (null if none)
- `status` — `open` or `fixed`
- `fixedAt` — ISO timestamp when marked fixed (null if open)
- `userNotifiedReceivedAt` — when the user received a “ticket received” email
- `userNotifiedFixedAt` — when the user received a “ticket fixed” email
- `context` — passage reference, language, page URL, browser info
- `receivedAt` — ISO timestamp

Admin notification addresses are stored separately in `settings.json`:

```json
{
  "notifyEmails": ["you@example.com"],
  "updatedAt": "2026-06-23T12:00:00.000Z"
}
```

## Ticket email flow

1. User submits feedback with an email in the contact field.
2. Admin notification goes to addresses in `settings.json` (or `FEEDBACK_NOTIFY_EMAIL` until settings are saved in the admin UI).
3. User receives a **received** email with their ticket id.
4. When an admin marks the ticket **fixed**, the user receives a **fixed** email (once per ticket).

## Setup (Vercel)

Add these environment variables in the Vercel project settings:

| Variable | Value |
|----------|--------|
| `GITHUB_TOKEN` | GitHub personal access token with `repo` scope |
| `GITHUB_REPO` | `Kithkin22/Hebrew-Contour-App` |
| `FEEDBACK_ADMIN_PASSWORD` | Password for the private admin inbox (choose your own) |
| `FEEDBACK_NOTIFY_EMAIL` | Fallback admin email(s) for new-feedback alerts — comma-separated until you save addresses in `/admin.html` |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key for sending emails |
| `FEEDBACK_EMAIL_FROM` | Optional verified sender, e.g. `Contour App <notify@yourdomain.com>` (defaults to Resend test sender) |
| `FEEDBACK_SITE_URL` | Optional site base URL for links in emails (e.g. `https://your-app.vercel.app`) |

Redeploy after adding the variables. Without `GITHUB_TOKEN` / `GITHUB_REPO`, the Feedback button still opens, but submissions cannot be saved to GitHub.

Without `RESEND_API_KEY`, feedback is still saved but no emails are sent.

## Admin notification emails

Open **`/admin.html`**, sign in, and use **Admin notification emails** at the top of the inbox. Saved addresses are written to `feedback/settings.json` in the repo — they are not tied to your GitHub account email.

If no addresses are saved yet, the app falls back to `FEEDBACK_NOTIFY_EMAIL` from Vercel.

## Admin inbox badge

The **Admin** link in the app toolbar shows a red badge with the count of **unread open** feedback (messages received since you last opened `/admin.html`). The count refreshes every two minutes and when you return to the tab.

## Admin inbox (private)

Review feedback and mark items fixed at **`/admin.html`** on your deployed site (not linked from the public app).

1. Open `https://your-app.vercel.app/admin.html`
2. Sign in with `FEEDBACK_ADMIN_PASSWORD`
3. Set admin notification emails (optional but recommended)
4. Use the **Mark fixed** checkbox on each item, or filter by Open / Fixed

The admin page calls `/api/feedback-admin`, which reads and updates `entries.jsonl` and `settings.json` via the same GitHub token.
