// Light / dark theme choice, kept in this browser. Without a saved choice the
// theme follows the device setting (prefers-color-scheme in globals.css).
export const THEME_KEY = "aia-theme";

// Runs before the page paints (root layout): applies the saved choice so the
// page never flashes the wrong theme.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
