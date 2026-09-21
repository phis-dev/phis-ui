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
      /*
       * An underscore says the name is there for its shape, not its value: a parameter kept so a stub
       * matches the signature it stands in for, a field named only to be left out of the rest. The
       * code writes both already; typescript-eslint defaults `ignoreRestSiblings` to false and leaves
       * the ignore patterns empty, so without this it warns about the convention it is being told.
       */
      "@typescript-eslint/no-unused-vars": ["warn", {
        ignoreRestSiblings: true,
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  {
    /*
     * phis-ui ships the App Router files the Site mounts, and they do not sit under `app/`, which is
     * where eslint-config-next turns this rule off. `<head>` is how a Root Layout says it; `next/head`
     * is the Pages Router's answer and cannot be used here at all.
     */
    files: ["next/**/*.tsx"],
    rules: {
      "@next/next/no-head-element": "off",
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
