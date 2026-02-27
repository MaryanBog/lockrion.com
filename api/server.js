import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ===== CONFIG =====
// Put your upstream RPC here (later you can replace with Helius/QuickNode URL).
// For now you can keep metaplex; Render server-side calls usually won't be blocked like your browser.
const SOLANA_UPSTREAM = process.env.SOLANA_UPSTREAM || "https://api.metaplex.solana.com";

// CoinGecko upstream
const COINGECKO_UPSTREAM = "https://api.coingecko.com/api/v3";

// CORS (if you call from lockrion.com, set exact origin)
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";

// --- CORS headers ---
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// --- Health ---
app.get("/health", (req, res) => res.json({ ok: true }));

// --- Simple GET test endpoint (so you can test in browser without console) ---
app.get("/api/solana/balance/:pubkey", async (req, res) => {
  try {
    const pubkey = String(req.params.pubkey || "").trim();
    if (!pubkey) return res.status(400).json({ error: "MISSING_PUBKEY" });

    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [pubkey, { commitment: "confirmed" }]
    };

    const upstream = await fetch(SOLANA_UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: "SOLANA_PROXY_FAILED", details: String(e?.message || e) });
  }
});

// --- SOLANA JSON-RPC proxy ---
app.post("/api/solana", async (req, res) => {
  try {
    const upstream = await fetch(SOLANA_UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: "SOLANA_PROXY_FAILED", details: String(e?.message || e) });
  }
});

// --- CoinGecko proxy (GET) ---
app.get("/api/coingecko/*", async (req, res) => {
  try {
    const path = req.params[0] ? ("/" + req.params[0]) : "/";
    const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const upstreamUrl = COINGECKO_UPSTREAM + path + qs;

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    // небольшой cache чтобы меньше ловить лимиты
    res.setHeader("Cache-Control", "public, max-age=20");
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: "COINGECKO_PROXY_FAILED", details: String(e?.message || e) });
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, "0.0.0.0", () => {
  console.log("lockrion-proxy v2 listening on 0.0.0.0:" + port);
});