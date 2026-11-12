import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('template.html', 'utf8').replace('/*BUNDLE*/', () => js);
writeFileSync('scatola-luminosa.html', html);
console.log('ok', (html.length / 1024).toFixed(0) + ' KB');
