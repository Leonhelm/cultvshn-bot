import { build } from "esbuild";

const shared = {
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outdir: "dist",
  packages: "external",
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ["src/app/entrypoints/poll.ts"],
    outExtension: { ".js": ".mjs" },
  }),
  build({
    ...shared,
    entryPoints: ["src/app/entrypoints/cron.ts"],
    outExtension: { ".js": ".mjs" },
  }),
]);

console.log("Build complete");
