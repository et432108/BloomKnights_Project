/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Three-bucket accent palette (chart/status accents kept distinct).
        debt: "#EF4444", // red — high-priority payoff
        savings: "#10B981", // green — growth
        fun: "#8B5CF6", // violet — guilt-free spending
        bills: "#6B7280", // gray — fixed obligations

        // App-wide rebrand: green Material-3 primary. `brand` used to be indigo;
        // remapping it here cascades the new green across every existing screen.
        brand: {
          DEFAULT: "#0d631b",
          dark: "#00390a",
        },

        // ---- Material-3 tokens (green scheme) for the dashboard ----
        primary: "#0d631b",
        "on-primary": "#ffffff",
        "primary-container": "#a3f69c",
        "on-primary-container": "#00210a",
        secondary: "#2a6b2c",
        "on-secondary": "#ffffff",
        "secondary-container": "#acf4a4",
        "on-secondary-container": "#307231",
        tertiary: "#1e5f51",
        outline: "#707a6c",
        "outline-variant": "#bfcaba",
        error: "#ba1a1a",
        background: "#f8f9fa",
        surface: "#f8f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#40493d",
      },
      fontFamily: {
        // Loaded on web via app/+html.tsx; falls back to system on native.
        display: ["Hanken Grotesk", "system-ui", "sans-serif"],
        headline: ["Hanken Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
