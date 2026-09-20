// lint-staged passes absolute paths of staged files matching each glob.
// Each app's eslint.config.mjs is flat-config and resolved relative to the
// process cwd, so we run eslint through `pnpm --filter <app> exec` (which
// sets cwd to that workspace) rather than a bare root-level `eslint`.
const quote = (file) => `"${file}"`;

module.exports = {
  'apps/frontend/**/*.{js,jsx,ts,tsx}': (files) =>
    `pnpm --filter frontend exec eslint --fix ${files.map(quote).join(' ')}`,
  'apps/backend/**/*.ts': (files) =>
    `pnpm --filter backend exec eslint --fix ${files.map(quote).join(' ')}`,
};
