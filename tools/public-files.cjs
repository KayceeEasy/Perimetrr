const fs = require('node:fs');
const path = require('node:path');
const rootFiles = ['index.html', '404.html', 'style.css', 'polish.css', 'script.js', 'common.js', 'qr.js', 'version.js', 'manifest.json', 'sw.js', 'robots.txt', 'sitemap.xml', '_headers', '_redirects'];
const directories = ['command-center', 'onboard', 'hybrid', 'watch-tower', 'enterprise', 'image'];
function publicFiles(root) {
  const result = rootFiles.filter(file => fs.existsSync(path.join(root, file)));
  const visit = relative => {
    if (!fs.existsSync(path.join(root, relative))) return;
    for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = `${relative}/${item.name}`;
      if (item.isDirectory()) visit(file);
      else if (/\.(html|css|js|svg|png|ico|webp|jpg|jpeg|woff2)$/.test(item.name)) result.push(file);
    }
  };
  directories.forEach(visit);
  return result;
}
module.exports = { publicFiles };
