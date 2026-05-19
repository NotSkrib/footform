# ⚽ 10 Year Football Anniversary Survey

A secure, self-hosted survey form for the Seville & Greenwich anniversary events.

## Stack
- **Backend**: Node.js + Express
- **Security**: Helmet, CORS (same-origin), rate limiting, input sanitisation
- **Storage**: JSON flat file (in `/data/responses.json`, gitignored)
- **Frontend**: Vanilla HTML/CSS/JS — no frameworks needed

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Edit .env and set a strong ADMIN_PASSWORD

# 3. Start the dev server
npm run dev   # uses nodemon for auto-reload

# 4. Open http://localhost:3000
```

---

## Deploy to Render

1. **Push to GitHub** (your private repo)
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will detect `render.yaml` automatically
5. In **Environment** settings on Render, add:
   - `ADMIN_PASSWORD` = a strong random password (never commit this)
6. Deploy!

### Generate a strong password
```bash
openssl rand -base64 24
```

---

## Admin Dashboard

Visit `/admin` on your deployed URL.

- Enter your `ADMIN_PASSWORD`
- View all responses in a table
- See live stats (total, Seville count, fully committed, etc.)
- Export responses as CSV
- Delete individual responses

---

## Security Features

| Feature | Details |
|---|---|
| Helmet headers | CSP, X-Frame, HSTS, etc. |
| Rate limiting | Max 5 form submissions per IP per 15 min |
| Input sanitisation | All fields trimmed, HTML-stripped, max lengths |
| Payload cap | 10kb max request body |
| Same-origin CORS | No cross-origin API access |
| No IP in API | IPs stored server-side only, never sent to admin UI |
| Duplicate guard | One submission per name |
| Password auth | Bearer token required for all `/api/admin/*` routes |

---

## File Structure

```
football-survey/
├── server.js           ← Express backend
├── public/
│   ├── index.html      ← Survey form
│   └── admin.html      ← Admin dashboard
├── data/               ← Auto-created, gitignored
│   └── responses.json
├── .env.example
├── .env                ← gitignored, create locally
├── .gitignore
├── render.yaml
└── package.json
```
