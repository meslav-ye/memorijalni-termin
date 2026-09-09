import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // Server actioni imaju potpis koji propisuje useActionState: (stanje, formData).
      // Kad se argument ne koristi, prefiks _ je namjeran znak toga, a ne propust.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  // Use **/.next/** so worktree absolute paths are ignored (plain .next/** is not).
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generirano iz sheme baze — ne uredjuje se rucno.
    "lib/database.types.ts",
  ]),
]);

export default eslintConfig;
