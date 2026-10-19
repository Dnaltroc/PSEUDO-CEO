/* Assembles the single-file game: src/shell.html + photos + engine + ui -> public/index.html */
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
let html = read('shell.html');
for (const [token, file] of [['/*PHOTOS*/', 'photos.css'], ['/*FACES*/', 'faces.css'], ['/*ENGINE*/', 'engine.js'], ['/*UI*/', 'ui.js']]) {
  if (!html.includes(token)) throw new Error('Missing ' + token + ' in shell.html');
  html = html.split(token).join(read(file));
}
fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
const stats = path.join(__dirname, 'src', 'stats.html');
if (fs.existsSync(stats)) fs.copyFileSync(stats, path.join(__dirname, 'public', 'stats.html'));
for (const f of ['og.png', 'privacy.html']) {
  const src = path.join(__dirname, 'src', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(__dirname, 'public', f));
}
console.log('Built public/index.html', (html.length / 1024).toFixed(0) + ' KB');
