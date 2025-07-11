import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/cli.js',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'sqlite3',
    'canvas',
    'react-devtools-core',
    'fsevents'
  ],
  minify: false,
  sourcemap: false,
});

console.log('✅ Build complete!');