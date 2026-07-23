import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // V12-02: backend/ is a PHP project (linted via `php -l`/
    // `composer lint`, not ESLint) -- backend/api/vendor/ in particular
    // ships bundled third-party JS assets (PHPUnit's HTML coverage report
    // templates) that were never meant to be policed by this project's
    // JS/TS lint rules.
    "backend/**",
  ]),
];

export default eslintConfig;
