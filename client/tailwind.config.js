/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        setu: {
          teal: "#0f766e",
          amber: "#b45309",
        },
      },
    },
  },
  plugins: [],
};
