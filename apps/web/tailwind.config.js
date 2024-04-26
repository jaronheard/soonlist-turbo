/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1.25rem)",
        sm: "calc(var(--radius) - 1.5rem)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
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
        'hyphens-none': 'none',
        'hyphens-manual': 'manual',
        'hyphens-auto': 'auto',
      }
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
