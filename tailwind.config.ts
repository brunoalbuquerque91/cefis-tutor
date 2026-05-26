import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CEFIS brand palette. The canonical brand color from
        // page.4385667a.css is #14809e (used as .btn-next background,
        // icon color, link color). Other shades are derived to match
        // common Tailwind shade slots so indigo-* → brand-* swaps cleanly.
        brand: {
          50: "#f4fafb",   // very subtle teal tint (was indigo-50)
          100: "#e1f0f3",  // light teal background (was indigo-100)
          200: "#b8dde4",
          300: "#7fc1cd",
          400: "#3ea1b5",
          500: "#1d809e",  // alt teal seen on homepage inline styles
          600: "#14809e",  // PRIMARY — canonical CEFIS brand color
          700: "#0e6b85",  // hover / darker (hand-derived)
          800: "#0a5469",
          900: "#243c45",  // dark teal section bg (from page.css)
          950: "#2c4953",  // darker section bg (from page.css)
        },
      },
    },
  },
  plugins: [],
};
export default config;
