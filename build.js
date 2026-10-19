/* Assembles the site into public/:
   src/shell.html + faces + engine + ui -> public/index.html (the game page)
   src/photos.css -> the company photos are written to public/img/ and the CSS points at them
   plus the stats shell, privacy and method pages, the share image, fonts and robots.txt. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const src = (f) => path.join(__dirname, 'src', f);
const out = (f) => path.join(__dirname, 'public', f);
const read = (f) => fs.readFileSync(src(f), 'utf8');
fs.mkdirSync(out('img'), { recursive: true });
fs.mkdirSync(out('fonts'), { recursive: true });

/* move every embedded photo out of the CSS so the page itself stays small and only the photo in use is downloaded */
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
function externalize(css) {
  return css.replace(/\.(ph-[a-z]+)\{--photo:url\(data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)\)/g, (m, cls, mime, b64) => {
    const buf = Buffer.from(b64, 'base64');
    const name = cls + '-' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8) + '.' + EXT[mime];
    fs.writeFileSync(out('img/' + name), buf);
    return '.' + cls + '{--photo:url(/img/' + name + ')';
  });
}

let html = read('shell.html');
const parts = [['/*PHOTOS*/', externalize(read('photos.css'))], ['/*FACES*/', read('faces.css')], ['/*ENGINE*/', read('engine.js')], ['/*UI*/', read('ui.js')]];
for (const [token, text] of parts) {
  if (!html.includes(token)) throw new Error('Missing ' + token + ' in shell.html');
  html = html.split(token).join(text);
}
fs.writeFileSync(out('index.html'), html);
for (const f of ['stats.html', 'og.png', 'privacy.html', 'method.html', 'robots.txt']) {
  if (fs.existsSync(src(f))) fs.copyFileSync(src(f), out(f));
}
for (const f of fs.existsSync(src('fonts')) ? fs.readdirSync(src('fonts')) : []) fs.copyFileSync(src('fonts/' + f), out('fonts/' + f));
console.log('Built public/index.html', (html.length / 1024).toFixed(0) + ' KB;', fs.readdirSync(out('img')).length + ' photos in public/img');
