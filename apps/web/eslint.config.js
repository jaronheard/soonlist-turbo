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
  // ...restrictEnvAccess,
  // https://github.com/t3-oss/create-t3-turbo/issues/984#issuecomment-2049759032
  {
    ignores: [".next/**"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
