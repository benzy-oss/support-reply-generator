import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral dark surfaces
        ink: "#0b0c0f",
        panel: "#14161b",
        "panel-2": "#191c22",
        line: "#272a31",
        "line-soft": "#1f2228",
        // Text
        fg: "#e8e9ec",
        muted: "#9094a0",
        faint: "#6a6e79",
        // Gold accent
        gold: {
          DEFAULT: "#c9a24b",
          soft: "#d9b863",
          dim: "#8c7434",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
