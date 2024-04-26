import baseConfig, { restrictEnvAccess } from "@soonlist/eslint-config/base";
import nextjsConfig from "@soonlist/eslint-config/nextjs";
import reactConfig from "@soonlist/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];