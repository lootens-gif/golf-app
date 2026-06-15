import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL") ?? "timlootens@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();
    const { event, roundCode, course, players, leaderboard } = body;

    let subject = "";
    let html = "";

    if (event === "started") {
      subject = `🏌️ Round ${roundCode} started`;
      html = `
        <h2>New round started</h2>
        <p><strong>Code:</strong> ${roundCode}</p>
        <p><strong>Course:</strong> ${course || "—"}</p>
        <p><strong>Players:</strong> ${(players || []).join(", ") || "—"}</p>
        <p><a href="https://golf-app-neon.vercel.app">Open app</a></p>
      `;
    } else if (event === "completed") {
      const lbLines = (leaderboard || [])
        .map((row, i) => `<tr><td>${i + 1}</td><td>${row.name}</td><td>${row.total >= 0 ? "+" : ""}$${row.total.toFixed(2)}</td></tr>`)
        .join("");
      subject = `✅ Round ${roundCode} complete`;
      html = `
        <h2>Round complete</h2>
        <p><strong>Code:</strong> ${roundCode}</p>
        <p><strong>Course:</strong> ${course || "—"}</p>
        <p><strong>Players:</strong> ${(players || []).join(", ") || "—"}</p>
        <h3>Results</h3>
        <table border="1" cellpadding="6" cellspacing="0">
          <tr><th>#</th><th>Player</th><th>Net $</th></tr>
          ${lbLines}
        </table>
        <p><a href="https://golf-app-neon.vercel.app">Open app</a></p>
      `;
    } else {
      return new Response(JSON.stringify({ error: "unknown event" }), { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StoppedCounting <notifications@stoppedc ounting.com>",
        to: [NOTIFY_EMAIL],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
