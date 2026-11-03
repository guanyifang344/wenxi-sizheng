import {mkdir, copyFile, rm} from 'node:fs/promises';
await rm('dist', {recursive: true, force: true});
await mkdir('dist/data', {recursive: true});
for (const file of ['index.html', 'styles.css', 'app.js', 'engine.js', 'data/questions.json', 'data/python.json', 'python-app.js', 'python-engine.js']) await copyFile(file, `dist/${file}`);
await copyFile('.nojekyll', 'dist/.nojekyll');
console.log('Static site ready in dist/');
