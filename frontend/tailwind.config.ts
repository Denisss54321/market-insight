import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1220",
        surface: "#151F30",
        "surface-hover": "#1C2940",
        primary: "#4F8CFF",
        success: "#00C27A",
        danger: "#FF5B6E",
        warning: "#F6B73C",
        muted: "#8A9AB5",
      },
      borderColor: {
        subtle: "rgba(255,255,255,0.05)",
      },
      borderRadius: {
        card: "18px",
      },
      boxShadow: {
        card: "0 12px 40px -20px rgba(0,0,0,0.9)",
        glow: "0 0 0 1px rgba(79,140,255,0.25), 0 12px 40px -18px rgba(79,140,255,0.5)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
