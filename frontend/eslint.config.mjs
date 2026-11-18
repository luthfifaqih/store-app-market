import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,mjs,jsx,ts,tsx}"],
    ignores: ["lib/alert/**"],
    rules: {
      "no-restricted-imports": ["error", {patterns: [{group:["sweetalert2","sweetalert2/*","sweetalert2-react-content"],message:"Gunakan pustaka @/lib/alert."}]}],
      "no-restricted-globals": ["error", "alert", "confirm", "prompt"],
      "no-restricted-syntax": ["error", {selector:"MemberExpression[object.name=/^(window|globalThis)$/][property.name=/^(alert|confirm|prompt)$/]",message:"Gunakan pustaka @/lib/alert."}],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
