import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

/**
 * Stellar Classifier — paleta NASA en light mode.
 * Azul meatball (#0B3D91) como acento primario.
 * Rojo worm (#FC3D21) para crítico/danger.
 * Grayscale neutral para superficies.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: colors.neutral,
        // NASA brand
        nasa: {
          blue: "#0B3D91",
          "blue-light": "#1f5fc7",
          "blue-bg": "#eef3fc",
          red: "#FC3D21",
          "red-light": "#ff6b54",
          "red-bg": "#feeeea",
        },
        // Clases astronómicas (compatibles con paleta NASA)
        galaxy: {
          DEFAULT: "#0B3D91",
          light: "#3e6fc4",
          bg: "#eef3fc",
        },
        star: {
          DEFAULT: "#D97706",
          light: "#f59e0b",
          bg: "#fef3c7",
        },
        qso: {
          DEFAULT: "#7B2D8E",
          light: "#a855f7",
          bg: "#f3e8ff",
        },
        // Signals
        success: "#00833D",
        warning: "#D97706",
        danger: "#FC3D21",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        "tight-ish": "-0.011em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 0 rgba(15, 23, 42, 0.02)",
        elev: "0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04)",
        "elev-lg": "0 8px 24px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 250ms ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
