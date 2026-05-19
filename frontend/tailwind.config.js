/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        // Bazne veličine + "large" varijanta za korisnike s oštećenim vidom
        "a11y-base": ["1rem", { lineHeight: "1.6" }],
        "a11y-lg": ["1.375rem", { lineHeight: "1.6" }],
      },
    },
  },
  plugins: [],
};
