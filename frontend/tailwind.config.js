/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#003c90",
        "on-primary": "#ffffff",
        "primary-container": "#0f52ba",
        "on-primary-container": "#bcceff",
        "primary-fixed": "#d9e2ff",
        "primary-fixed-dim": "#b0c6ff",
        "on-primary-fixed": "#001945",
        "on-primary-fixed-variant": "#00419c",
        "inverse-primary": "#b0c6ff",

        "secondary": "#505f76",
        "on-secondary": "#ffffff",
        "secondary-container": "#d0e1fb",
        "on-secondary-container": "#54647a",
        "secondary-fixed": "#d3e4fe",
        "secondary-fixed-dim": "#b7c8e1",
        "on-secondary-fixed": "#0b1c30",
        "on-secondary-fixed-variant": "#38485d",

        "tertiary": "#3d4143",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#55585a",
        "on-tertiary-container": "#ccced0",
        "tertiary-fixed": "#e0e3e5",
        "tertiary-fixed-dim": "#c4c7c9",
        "on-tertiary-fixed": "#191c1e",
        "on-tertiary-fixed-variant": "#444749",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        "background": "#f9f9ff",
        "on-background": "#111c2d",

        "surface": "#f9f9ff",
        "on-surface": "#111c2d",
        "surface-variant": "#d8e3fb",
        "on-surface-variant": "#434653",
        "surface-dim": "#cfdaf2",
        "surface-bright": "#f9f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f0f3ff",
        "surface-container": "#e7eeff",
        "surface-container-high": "#dee8ff",
        "surface-container-highest": "#d8e3fb",
        "surface-tint": "#1d59c1",

        "outline": "#737784",
        "outline-variant": "#c3c6d5",
        "inverse-surface": "#263143",
        "inverse-on-surface": "#ecf1ff"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "unit": "4px",
        "gutter": "24px",
        "margin-desktop": "32px",
        "margin-mobile": "16px",
        "container-max": "1440px"
      },
      fontFamily: {
        "headline-lg": ["Manrope", "sans-serif"],
        "headline-lg-mobile": ["Manrope", "sans-serif"],
        "display-lg": ["Manrope", "sans-serif"],
        "title-md": ["Manrope", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-sm": ["JetBrains Mono", "monospace"],
        "data-display": ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "title-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "500" }],
        "data-display": ["18px", { lineHeight: "24px", fontWeight: "600" }]
      }
    },
  },
  plugins: [],
}
