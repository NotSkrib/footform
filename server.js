require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";
const DATA_FILE = path.join(__dirname, "data", "responses.json");

// ── Security middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

app.use(cors({ origin: false })); // same-origin only
app.use(express.json({ limit: "10kb" })); // cap payload size
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ── Rate limiting ────────────────────────────────────────────────────────────
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 submissions per IP per window
  message: { error: "Too many submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests." },
});

// ── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadResponses() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveResponses(responses) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(responses, null, 2));
}

function sanitise(str) {
  if (typeof str !== "string") return str;
  return str.trim().slice(0, 500).replace(/[<>]/g, "");
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Submit survey
app.post("/api/submit", submitLimiter, (req, res) => {
  const body = req.body;

  // Basic validation
  const required = ["fullName", "attendingEvents"];
  for (const field of required) {
    if (!body[field]) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  const response = {
    id: uuidv4(),
    submittedAt: new Date().toISOString(),
    ip: req.ip, // stored server-side only, never returned to clients
    fullName: sanitise(body.fullName),
    attendingEvents: sanitise(body.attendingEvents),
    sevilleLikelihood: sanitise(body.sevilleLikelihood) || null,
    sevilleDays: sanitise(body.sevilleDays) || null,
    sevilleLaLiga: sanitise(body.sevilleLaLiga) || null,
    sevilleMatch: sanitise(body.sevilleMatch) || null,
    sevilleAccommodation: sanitise(body.sevilleAccommodation) || null,
    greenwichPlan: sanitise(body.greenwichPlan) || null,
    suggestions: sanitise(body.suggestions) || null,
  };

  const responses = loadResponses();

  // Prevent duplicate name submissions
  const duplicate = responses.find(
    (r) => r.fullName.toLowerCase() === response.fullName.toLowerCase()
  );
  if (duplicate) {
    return res
      .status(409)
      .json({ error: "A response from this name already exists." });
  }

  responses.push(response);
  saveResponses(responses);

  res.json({ success: true, message: "Response saved!" });
});

// Admin: view responses (password protected)
app.get("/api/admin/responses", adminLimiter, (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res
      .status(401)
      .json({ error: "Unauthorised. Provide correct admin password." });
  }

  const responses = loadResponses().map(({ ip, ...rest }) => rest); // strip IP before sending
  res.json({ count: responses.length, responses });
});

// Admin: delete a response
app.delete("/api/admin/responses/:id", adminLimiter, (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: "Unauthorised." });
  }

  const responses = loadResponses();
  const idx = responses.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found." });

  responses.splice(idx, 1);
  saveResponses(responses);
  res.json({ success: true });
});

// Catch-all → serve SPA pages
app.get("*", (req, res) => {
  const page = req.path === "/admin" ? "admin.html" : "index.html";
  res.sendFile(path.join(__dirname, "public", page));
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`⚽  Survey server running on port ${PORT}`);
  if (ADMIN_PASSWORD === "changeme123") {
    console.warn(
      "⚠️  WARNING: Using default ADMIN_PASSWORD. Set a strong one in .env!"
    );
  }
});
