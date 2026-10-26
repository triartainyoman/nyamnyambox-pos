/**
 * Tailwind CSS v4 is compiled through PostCSS.
 *
 * Next 16 also supports Turbopack loader rules, but `@tailwindcss/turbopack`
 * ships an `exports` map that hides `dist/index.js`, which makes Turbopack's
 * loader resolver fail in dev. The PostCSS plugin is the documented path and
 * behaves identically for both dev and production builds.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
