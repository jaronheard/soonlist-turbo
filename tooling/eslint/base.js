/// <reference types="./types.d.ts" />

import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

/**
 * All packages that leverage t3-env should use this rule
 */
export const restrictEnvAccess = tseslint.config({
  files: ["**/*.js", "**/*.ts", "**/*.tsx"],
  rules: {
    "no-restricted-properties": [
      "error",
      {
        object: "process",
        property: "env",
        message:
          "Use `import { env } from '~/env'` instead to ensure validated types.",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        name: "process",
        importNames: ["env"],
        message:
          "Use `import { env } from '~/env'` instead to ensure validated types.",
      },
    ],
  },
});

export default tseslint.config(
  {
    // Globally ignored files
    ignores: ["**/*.config.js"],
  },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    plugins: {
      import: importPlugin,
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-misused-promises": [
        2,
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": [
        // "error",
        "warn",
        {
          allowConstantLoopConditions: true,
        },
      ],
      // "@typescript-eslint/no-non-null-assertion": "error",
      "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
      // my preference
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // migration
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/consistent-type-assertions": [
        "warn",
        {
          assertionStyle: "never",
        },
      ],
      "no-warning-comments": [
        "error",
        { terms: ["XXX"], location: "anywhere" },
      ],
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: { parserOptions: { project: true } },
  },
);
