import baseConfig from "@soonlist/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**", "scripts/**"],
  },
  ...baseConfig,
];
