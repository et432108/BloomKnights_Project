/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Three-bucket brand palette
        debt: "#EF4444", // red — high-priority payoff
        savings: "#10B981", // green — growth
        fun: "#8B5CF6", // violet — guilt-free spending
        bills: "#6B7280", // gray — fixed obligations
        brand: {
          DEFAULT: "#4F46E5",
          dark: "#3730A3",
        },
      },
    },
  },
  plugins: [],
};
