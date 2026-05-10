import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: { boundaries },
    settings: {
      // TypeScript resolver so boundaries can follow @/ aliases and .ts extensions
      "import/resolver": {
        typescript: { alwaysTryTypes: true },
        node: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
      },
      // FOLDER mode (default) appends /**/* automatically — patterns are directory paths only
      "boundaries/elements": [
        { type: "pages",        pattern: "src/app" },
        { type: "components",   pattern: "src/components" },
        { type: "view-models",  pattern: "src/core/view-models" },
        { type: "models",       pattern: "src/core/models" },
        { type: "repositories", pattern: "src/core/repositories" },
        { type: "services",     pattern: "src/core/services" },
        { type: "providers",    pattern: "src/core/providers" },
        { type: "mappers",      pattern: "src/core/mappers" },
        { type: "types",        pattern: "src/core/types" },
        { type: "lib",          pattern: "src/lib" },
      ],
      "boundaries/ignore": ["**/*.test.*", "**/*.spec.*", "**/tests/**"],
    },
    rules: {
      // Enforces MVVM + Clean Architecture layers:
      // pages/components → view-models → models → repositories
      "boundaries/dependencies": ["error", {
        default: "disallow",
        message: "Violación MVVM: '${file.type}' no puede importar de '${dependency.type}'. Flujo: pages/components → view-models → models → repositories.",
        rules: [
          // pages can use components, view-models, providers, types, lib
          {
            from: { type: "pages" },
            allow: { to: { type: ["components", "view-models", "providers", "types", "lib"] } },
          },
          // components can use view-models, providers, types, lib
          {
            from: { type: "components" },
            allow: { to: { type: ["view-models", "providers", "types", "lib"] } },
          },
          // view-models can use models, types, lib
          {
            from: { type: "view-models" },
            allow: { to: { type: ["models", "types", "lib"] } },
          },
          // models can use repositories, mappers, types, lib
          {
            from: { type: "models" },
            allow: { to: { type: ["repositories", "mappers", "types", "lib"] } },
          },
          // repositories can use services, mappers, types, lib
          {
            from: { type: "repositories" },
            allow: { to: { type: ["services", "mappers", "types", "lib"] } },
          },
          // services implement repository interfaces and use mappers (infrastructure layer)
          {
            from: { type: "services" },
            allow: { to: { type: ["repositories", "mappers", "types", "lib"] } },
          },
          // providers are the composition root — can use any layer
          {
            from: { type: "providers" },
            allow: { to: { type: ["pages", "components", "view-models", "models", "repositories", "services", "mappers", "types", "lib"] } },
          },
          // mappers can use types, lib
          {
            from: { type: "mappers" },
            allow: { to: { type: ["types", "lib"] } },
          },
          // types is the base layer — can only import from lib
          {
            from: { type: "types" },
            allow: { to: { type: ["lib"] } },
          },
          // lib is a utility layer — can only import from types
          {
            from: { type: "lib" },
            allow: { to: { type: ["types"] } },
          },
        ],
      }],
    },
  },
]);

export default eslintConfig;
