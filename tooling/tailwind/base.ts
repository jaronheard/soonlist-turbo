import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gray: {
          100: "rgb(var(--neutral-3) / <alpha-value>)",
          200: "rgb(var(--neutral-3) / <alpha-value>)",
          300: "rgb(var(--neutral-3) / <alpha-value>)",
          400: "rgb(var(--neutral-2) / <alpha-value>)",
          500: "rgb(var(--neutral-2) / <alpha-value>)",
          600: "rgb(var(--neutral-1) / <alpha-value>)",
          700: "rgb(var(--neutral-1) / <alpha-value>)",
          800: "rgb(var(--neutral-1) / <alpha-value>)",
          900: "rgb(var(--neutral-0) / <alpha-value>)",
        },
        black: "rgb(var(--neutral-0) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          yellow: "rgb(var(--accent-1) / <alpha-value>)",
          orange: "rgb(var(--accent-2) / <alpha-value>)",
          blue: "rgb(var(--accent-3) / <alpha-value>)",
          green: "rgb(var(--accent-4) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        neutral: {
          1: "rgb(var(--neutral-1) / <alpha-value>)",
          2: "rgb(var(--neutral-2) / <alpha-value>)",
          3: "rgb(var(--neutral-3) / <alpha-value>)",
          4: "rgb(var(--neutral-4) / <alpha-value>)",
        },
        interactive: {
          1: "rgb(var(--interactive-1) / <alpha-value>)",
          2: "rgb(var(--interactive-2) / <alpha-value>)",
          3: "rgb(var(--interactive-3) / <alpha-value>)",
        },
      },
    },
  },
} satisfies Config;
