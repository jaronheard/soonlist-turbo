import baseConfig from "@soonlist/eslint-config/base";
import reactConfig from "@soonlist/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [],
  },
  ...baseConfig,
  ...reactConfig,
];
