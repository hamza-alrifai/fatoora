import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const entryPoints = [
  resolve(projectRoot, 'electron/main.ts'),
  resolve(projectRoot, 'electron/preload.ts'),
];

await build({
  entryPoints,
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: resolve(projectRoot, 'dist-electron'),
  format: 'cjs',
  sourcemap: true,
  external: [
    'electron',
    'better-sqlite3',
  ],
  define: {
    'import.meta.url': 'undefined',
  },
  logLevel: 'info',
});
