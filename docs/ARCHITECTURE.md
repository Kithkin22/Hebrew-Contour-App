# Architecture

## BHSA Architecture

Hebrew BHSA generation uses the ETCBC / BHS text via SHEBANQ. The browser **must not** call SHEBANQ directly.

### Why a proxy is required

`https://shebanq.ancient-data.org` does **not** send `Access-Control-Allow-Origin`. A browser `fetch()` to SHEBANQ therefore fails with a CORS error (`TypeError: Failed to fetch`) even when the user is online and SHEBANQ itself returns HTTP 200.

### Browser flow

```text
Browser
  ↓  GET /api/bhsa-verse?version=&book=&chapter=&verse=
Same-origin Vercel function (api/bhsa-verse.js)
  ↓  server-side fetch
SHEBANQ  (https://shebanq.ancient-data.org/hebrew/verse.json)
```

Client code lives in `js/app/layout.js` (`fetchShebanqVerse` / `getBhsaText`). The proxy lives in `api/bhsa-verse.js`.

### Why direct browser requests must never be restored

Restoring a direct browser → SHEBANQ call will:

- Fail in every modern browser with CORS
- Surface misleading “check your internet connection” errors
- Break BHSA generation on Job, Genesis, Ruth, and every other passage

Always keep the same-origin `/api/bhsa-verse` hop.

### Expected request format

```http
GET /api/bhsa-verse?version=4b&book=Iob&chapter=1&verse=1
Accept: application/json
```

| Param | Rules |
| --- | --- |
| `version` | Allowlisted: `4`, `4b` (default), `2017`, `2021` |
| `book` | SHEBANQ Latin book id allowlist (e.g. `Iob`, `Genesis`, `Ruth`) |
| `chapter` | Positive integer 1–200 |
| `verse` | Positive integer 1–200 |

Unknown query keys (including open-proxy style `url=…`) are rejected with HTTP 400. Only `GET` and `OPTIONS` are allowed.

### Error / status behavior

| Condition | Typical status | User-facing behavior |
| --- | --- | --- |
| Success | 200 | Verse JSON `{ good, data: { text, phonetic } }` |
| Invalid input | 400 | Rejected; generator shows upstream/proxy error text |
| Method not allowed | 405 | Rejected |
| Upstream contact failure | 502 | “Unable to contact BHSA server…” |
| Upstream timeout (~15s) | 504 | “BHSA request timed out.” |
| Unexpected proxy exception | 500 | “Internal proxy error.” |
| Proxy route missing (static host) | 404 | “BHSA proxy is unavailable… use Vercel or WLC/paste” |
| True offline (`navigator.onLine === false`) | n/a | Only then: “Check your internet connection…” |

The client logs structured `[BHSA]` events (URL, passage, status, truncated body, exception) without dumping large responses.

### Cache behavior

- **Client** fetch uses `cache: 'no-store'` so generation always hits the proxy route.
- **Successful** proxy responses: `Cache-Control: public, max-age=3600`.
- **Error** proxy responses: `Cache-Control: no-store`.

### Deployment requirement

BHSA generation requires a host that can run the serverless function `api/bhsa-verse.js` (this project targets **Vercel**).

**Static hosts such as GitHub Pages cannot support BHSA generation.** On those hosts, direct users to **Hebrew — WLC (offline)** or paste mode. The UI already says so when `/api/bhsa-verse` is unavailable.

### Local testing

```bash
node scripts/test_bhsa_generate.mjs
node scripts/verify_bhsa_deployment.mjs

# Optional live preview (needs auth bypass if Deployment Protection is on):
PREVIEW_URL=https://…vercel.app \
VERCEL_AUTOMATION_BYPASS_SECRET=… \
node scripts/verify_bhsa_deployment.mjs
```

These cover Job 1:1–3, Genesis 1:1–5, CORS proof, Generate Reference BHSA preservation, network routing, and failure-message behavior.

### Generate Reference preserves BHSA

Book aliases only distinguish `hebrew` vs `greek`. When the generator Source is already **Hebrew — BHSA**, Generate Reference **must keep BHSA** and must **not** silently downgrade to WLC. That preservation is intentional (`setGeneratorFromParsedRef` / pane reference loading in `js/app/layout.js` and `js/app/core.js`).

## Surface form vs Lexical form (Hebrew Inspector)

Contour distinguishes:

| Role | UI label | Source |
| --- | --- | --- |
| Surface / text form | **Text form** | `word.text` in the manuscript / MorphHB `word` |
| Lexical form / lemma | **Lexical form** | MorphHB `lemma` / `lemmaHebrew` (never the inflected surface) |
| Root | **Root** | MorphHB `root` / `rootHebrew` when available |
| Morphology | **Parsing** | Analysis of the **surface** form |

Helpers live in `js/app/hebrew-forms.js`. Manuscript rendering always uses `word.text` and must never substitute lemma. There is no `@aleph/inspector` package in this repo — Inspector UI is Contour-owned (`js/app/inspector.js`, `inspector-morph.js`) and must not import Aleph Study / vocabulary persistence.
