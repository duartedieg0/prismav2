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
          container: "hsl(var(--primary-container))",
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
        "surface-container-low": "hsl(var(--surface-container-low))",
        "surface-container": "hsl(var(--surface-container))",
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
          fixed: "hsl(var(--tertiary-fixed))",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      fontSize: {
        "display-xl": ["48px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
        "display-lg": ["42px", { lineHeight: "48px", letterSpacing: "-0.02em" }],
        "display-md": ["36px", { lineHeight: "44px", letterSpacing: "-0.015em" }],
        heading: ["28px", { lineHeight: "36px", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "24px", letterSpacing: "0em" }],
        small: ["14px", { lineHeight: "20px", letterSpacing: "0em" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "0.02em" }],
      },
      fontFamily: {
        // Inter para corpo de texto (padrão do sistema)
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Plus Jakarta Sans para headlines / display
        display: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        // JetBrains Mono para metadata e IDs
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        sm: "0px 2px 4px rgba(0, 0, 0, 0.06)",
        md: "0px 4px 12px rgba(0, 0, 0, 0.08)",
        lg: "0px 12px 40px rgba(28, 25, 23, 0.06)",
        glass: "0 12px 40px rgba(28, 25, 23, 0.06)",
      },
    },
  },
  plugins: [animatePlugin],
} satisfies Config

export default config
