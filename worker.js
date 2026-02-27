export default {
    async fetch(request, env) {
      const url = new URL(request.url);
  
      // ====== CONFIG ======
      // Put your Solana RPC upstream here (best: Helius/QuickNode). You can also keep a public upstream.
      // Example (Helius): https://mainnet.helius-rpc.com/?api-key=XXXX
      const SOLANA_UPSTREAM = env.SOLANA_UPSTREAM || "https://api.metaplex.solana.com";
  
      // CoinGecko upstream
      const COINGECKO_UPSTREAM = "https://api.coingecko.com/api/v3";
  
      // Allow only your site (tighten if needed)
      const ALLOW_ORIGIN = env.ALLOW_ORIGIN || "*";
  
      // ====== CORS helpers ======
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": ALLOW_ORIGIN,
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          },
        });
      }
  
      const corsHeaders = {
        "Access-Control-Allow-Origin": ALLOW_ORIGIN,
        "Vary": "Origin",
      };
  
      // ====== SOLANA JSON-RPC PROXY ======
      if (url.pathname === "/api/solana") {
        if (request.method !== "POST") {
          return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }
  
        const body = await request.text();
  
        const upstreamResp = await fetch(SOLANA_UPSTREAM, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
  
        const txt = await upstreamResp.text();
        return new Response(txt, {
          status: upstreamResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
  
      // ====== COINGECKO PROXY (GET) ======
      if (url.pathname.startsWith("/api/coingecko/")) {
        if (request.method !== "GET") {
          return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        }
  
        const path = url.pathname.replace("/api/coingecko", "");
        const upstreamUrl = COINGECKO_UPSTREAM + path + (url.search || "");
  
        const upstreamResp = await fetch(upstreamUrl, {
          method: "GET",
          headers: { "Accept": "application/json" },
        });
  
        // Optional caching
        // (Cloudflare will cache if you return Cache-Control and you enable cache rules)
        const txt = await upstreamResp.text();
  
        return new Response(txt, {
          status: upstreamResp.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=20", // small cache to reduce rate limits
          },
        });
      }
  
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
  };