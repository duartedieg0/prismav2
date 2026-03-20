import type { Config } from "tailwindcss"
import animatePlugin from "tailwindcss-animate"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      fontSize: {
        "display-xl": ["48px", { lineHeight: "64px", letterSpacing: "-0.02em" }],
        "display-lg": ["42px", { lineHeight: "56px", letterSpacing: "-0.02em" }],
        "display-md": ["36px", { lineHeight: "48px", letterSpacing: "-0.015em" }],
        heading: ["28px", { lineHeight: "40px", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "24px", letterSpacing: "0em" }],
        small: ["14px", { lineHeight: "20px", letterSpacing: "0em" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "0.02em" }],
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        sm: "0px 2px 4px rgba(0, 0, 0, 0.08)",
        md: "0px 4px 12px rgba(0, 0, 0, 0.12)",
        lg: "0px 12px 24px rgba(0, 0, 0, 0.16)",
      },
    },
  },
  plugins: [animatePlugin],
} satisfies Config

export default config
