import reactCompilerPlugin from "eslint-plugin-react-compiler";

import baseConfig from "@soonlist/eslint-config/base";
import reactConfig from "@soonlist/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  ...baseConfig,
  ...reactConfig,
  {
    plugins: {
      "react-compiler": reactCompilerPlugin,
    },
    rules: {
      "react-compiler/react-compiler": "error",
    },
  },
];
