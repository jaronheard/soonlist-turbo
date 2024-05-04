import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

import base from "./base";

export default {
  content: base.content,
  presets: [base],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1.25rem)",
        sm: "calc(var(--radius) - 1.5rem)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      // special additions
      transitionProperty: {
        width: "width",
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)"],
        heading: ["var(--font-kalam)"],
      },
      letterSpacing: {
        tight: "-0.09rem",
        tighterish: "-0.18rem",
      },
      lineHeight: {
        7.5: "1.875rem",
      },
      spacing: {
        "2.5xl": "44.125rem",
        "7xl": "87.5rem",
      },
      fontSize: {
        "2.5xl": "1.75rem",
      },
      hyphens: {
        "hyphens-none": "none",
        "hyphens-manual": "manual",
        "hyphens-auto": "auto",
      },
    },
  },
  plugins: [animate, typography],
} satisfies Config;
