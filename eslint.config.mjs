import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".next.bak.*/**",
    "node_modules/**",
    ".node_modules.bak.*/**",
    "dist/**",
    "build/**",
    "*.bak.*",
  ]),
]);

export default eslintConfig;
