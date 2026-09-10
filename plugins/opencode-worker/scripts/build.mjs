import { build } from 'esbuild';
await build({
  entryPoints: ['src/mcp.ts', 'src/runner.ts', 'src/guard.ts'], outdir: 'dist', outExtension: { '.js': '.mjs' },
  bundle: true, platform: 'node', mainFields: ['module', 'main'], target: 'node22', format: 'esm', sourcemap: false,
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});
