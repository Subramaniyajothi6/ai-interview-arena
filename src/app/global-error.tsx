"use client";

// Last-resort error page when the root layout itself fails. It renders its own
// document, so it uses plain inline styles instead of the app stylesheet.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#F7F6F3",
          color: "#1C1B22",
        }}
      >
        <title>Something went wrong · AI Interview Arena</title>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
            <p style={{ color: "#5F5C68" }}>Please try again in a moment.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                background: "#6D28D9",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                height: 44,
                padding: "0 20px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
