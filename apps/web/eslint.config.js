import baseConfig, { restrictEnvAccess } from "@soonlist/eslint-config/base";
import nextjsConfig from "@soonlist/eslint-config/nextjs";
import reactConfig from "@soonlist/eslint-config/react";

export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  {
    ignores: [".next/**"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
