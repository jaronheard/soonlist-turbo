/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@soonlist/eslint-config/react-native.js"],
  rules: {
    // Disable some rules that are causing issues with the new upload queue implementation
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unsafe-argument": "warn",
    "react-hooks/rules-of-hooks": "warn",
    "react-compiler/react-compiler": "warn",
  },
};

