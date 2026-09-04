import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        clinic: {
          50: "#f0f9f6",
          100: "#d9f0e7",
          500: "#0f9d76",
          600: "#0c8362",
          700: "#0a6a50",
          900: "#073d2f"
        }
      }
    }
  },
  plugins: []
};

export default config;
