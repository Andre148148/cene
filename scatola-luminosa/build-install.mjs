import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/install.js'], bundle: true, minify: true, format: 'iife', write: false });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
writeFileSync('installazione-3d.html', readFileSync('install-template.html', 'utf8').replace('/*BUNDLE*/', () => js));
console.log('ok');
