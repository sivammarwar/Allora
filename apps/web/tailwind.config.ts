import type { Config } from "tailwindcss";

/**
 * Allora design system — Tailwind v3 config.
 * Palette, typography and spacing match the platform spec exactly.
 * Colors are exposed as CSS variables (in globals.css) so shadcn/ui
 * components can theme via `hsl(var(--...))` if desired, but raw hex
 * values are also available directly under `colors.brand.*`.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        brand: {
          bg: "#FFF0F3",
          surface: "#FFF8F9",
          primary: "#C0626A",
          secondary: "#8B4A4A",
          text: "#2E1A1A",
          textMuted: "#7A5050",
          border: "#E8C9CC",
          success: "#6AAF7A",
          warning: "#D4904A",
          error: "#C0404A",
        },
        // shadcn-compatible aliases (driven by CSS vars in globals.css)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
      boxShadow: {
        soft: "0 2px 16px rgba(139,74,74,0.08)",
        "soft-lg": "0 8px 32px rgba(139,74,74,0.12)",
        focus: "0 0 0 3px rgba(192, 98, 106, 0.25)",
      },
      backgroundImage: {
        "brand-mesh":
          "radial-gradient(at 12% 8%, rgba(192,98,106,0.18) 0px, transparent 55%), radial-gradient(at 88% 14%, rgba(139,74,74,0.12) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(232,201,204,0.45) 0px, transparent 60%)",
        "brand-hero":
          "linear-gradient(135deg, #FFF0F3 0%, #FFE4E9 50%, #F8D5D9 100%)",
      },
      keyframes: {
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-slide-up": "fade-slide-up 250ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
      },
      spacing: {
        // 8px grid helpers (Tailwind already covers these, but explicit aliases)
        "1.5": "0.375rem",
        "18": "4.5rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
