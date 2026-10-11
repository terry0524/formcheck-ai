"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#11110f", color: "white", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 440 }}>
            <p style={{ color: "#dfff00", fontSize: 12, fontWeight: 800, letterSpacing: "0.15em" }}>FORMCHECK RECOVERY</p>
            <h1 style={{ margin: "18px 0 0", fontSize: 48, lineHeight: 0.9, textTransform: "uppercase" }}>Unable to open this screen</h1>
            <p style={{ margin: "22px 0 0", color: "#b8b8b0", fontSize: 14, lineHeight: 1.6 }}>Try loading FormCheck again. Your camera feed is not uploaded or stored.</p>
            <button type="button" onClick={reset} style={{ minHeight: 48, marginTop: 28, border: 0, padding: "0 24px", background: "#dfff00", color: "#11110f", fontWeight: 900, textTransform: "uppercase", cursor: "pointer" }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
