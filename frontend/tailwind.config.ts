import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        ring: "var(--ring)",
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        momentum: {
          orbit: "var(--momentum-orbit)",
          fly: "var(--momentum-fly)",
          run: "var(--momentum-run)",
          walk: "var(--momentum-walk)",
          watch: "var(--momentum-watch)",
          crawl: "var(--momentum-crawl)",
          drag: "var(--momentum-drag)",
          sink: "var(--momentum-sink)",
          buried: "var(--momentum-buried)",
        },
        status: {
          active: "var(--status-active)",
          watch: "var(--status-watch)",
          drifting: "var(--status-drifting)",
          dropped: "var(--status-dropped)",
          morphed: "var(--status-morphed)",
        },
        exit: {
          silent: "var(--exit-silent)",
          morphed: "var(--exit-morphed)",
          phased: "var(--exit-phased)",
          transparent: "var(--exit-transparent)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        serif: ["var(--font-lora)", "serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
