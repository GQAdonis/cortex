import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/index.js',
  sourcemap: true,
  minify: false,
  // Don't bundle these - they have native dependencies or are too large
  external: ['@xenova/transformers'],
});

console.log('Build complete: dist/index.js');
