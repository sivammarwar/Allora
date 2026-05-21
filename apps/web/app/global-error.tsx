"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", textAlign: "center", padding: "1rem" }}>
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Critical error</h1>
          <p style={{ color: "#666", marginBottom: "2rem" }}>A critical error occurred. Please refresh the page.</p>
          <button
            onClick={reset}
            style={{ padding: "0.625rem 1.5rem", borderRadius: "9999px", background: "#e63946", color: "white", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
