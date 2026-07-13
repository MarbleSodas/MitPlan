// Bundle a XIVMitPlan edge function that depends on the monorepo
// TypeScript packages into a single self-contained `bundle.ts`.
//
// Supabase's own bundler (esbuild under the CLI) cannot resolve the
// `.js`-extension relative imports used inside the packages (NodeNext
// style) nor follow pnpm workspace `exports` for bare `@xivmitplan/*`
// specifiers. This script does both, producing one file per function
// that the CLI can deploy via `--entrypoint bundle.ts`.
//
// Usage: node apps/edge/build-ingest.mjs <functionName>

import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

const root = path.resolve(process.cwd());
const fnName = process.argv[2];
if (!fnName) {
  console.error("usage: node build-ingest.mjs <functionName>");
  process.exit(1);
}

const pkgRoots = {
  domain: "packages/domain",
  persistence: "packages/persistence",
  shared: "packages/shared",
  validation: "packages/validation",
};

function resolveXivmitplan(spec) {
  const rest = spec.slice("@xivmitplan/".length);
  const firstSlash = rest.indexOf("/");
  const pkg = firstSlash === -1 ? rest : rest.slice(0, firstSlash);
  const sub = firstSlash === -1 ? "" : rest.slice(firstSlash + 1);
  const pkgDir = path.resolve(root, pkgRoots[pkg]);
  const pj = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
  const exports = pj.exports || {};
  const key = sub ? "./" + sub : ".";
  let target = exports[key];
  if (!target) {
    // Fallback: mirror the export layout under ./src.
    target = sub ? "./src/" + sub : "./src/index.ts";
  }
  let abs = path.resolve(pkgDir, target.replace(/^\.\//, ""));
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    abs = path.join(abs, "index.ts");
  }
  return abs;
}

const plugin = {
  name: "xivmitplan-resolver",
  setup(build) {
    build.onResolve({ filter: /^@xivmitplan\// }, (args) => ({
      path: resolveXivmitplan(args.path),
    }));
    build.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({
      path: "https://esm.sh/@supabase/supabase-js@2.46.0",
      external: true,
    }));
    build.onResolve({ filter: /^zod$/ }, () => ({
      path: "https://esm.sh/zod@3.23.0",
      external: true,
    }));
  },
};

const entry = path.resolve(root, "apps/edge/functions", fnName, "index.ts");
const outfile = path.resolve(root, "apps/edge/functions", fnName, "bundle.ts");

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "esnext",
  logLevel: "info",
  plugins: [plugin],
  outfile,
});

console.log(`bundled ${fnName} -> ${outfile}`);
