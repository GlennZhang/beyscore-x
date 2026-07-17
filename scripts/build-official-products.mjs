import fs from 'node:fs';
import path from 'node:path';

const htmlPath = process.argv[2] || '/tmp/beyblade-lineup.html';
const outputPath = process.argv[3] || 'src/data/raw/official-products.json';
const html = fs.readFileSync(htmlPath, 'utf8');

const clean = (value = '') => value
  .replace(/<[^>]+>/g, ' ')
  .replace(/&yen;/g, '¥')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const products = [];
for (const match of html.matchAll(/<li class="mix ([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)) {
  const [, classes, body] = match;
  const image = body.match(/src="_image\/([^\"]+_list\.png)"/)?.[1];
  const title = body.match(/<b>([\s\S]*?)<span>([\s\S]*?)<\/span><\/b>/);
  if (!image || !title) continue;

  const detailPath = body.match(/<a href="([^"]+\.html)"/)?.[1] || '';
  const category = clean(body.match(/<p class="category"><span>([\s\S]*?)<\/span>/)?.[1]);
  const info = [...body.matchAll(/<i(?: class="red")?>([\s\S]*?)<\/i>/g)].map((item) => clean(item[1]));

  products.push({
    id: `official-${image.replace(/_list\.png$/, '')}`,
    code: clean(title[1]),
    nameJa: clean(title[2]),
    category,
    price: info.find((item) => item.includes('¥')) || '',
    releaseDate: info.find((item) => item.includes('発売'))?.replace('発売', '') || '',
    line: classes.includes('seriescx') || classes.split(/\s+/).includes('cx')
      ? 'CX'
      : classes.includes('seriesux') || classes.split(/\s+/).includes('ux')
        ? 'UX'
        : 'BX',
    image: `/assets/products/${image}`,
    sourceUrl: detailPath
      ? `https://beyblade.takaratomy.co.jp/beyblade-x/lineup/${detailPath}`
      : 'https://beyblade.takaratomy.co.jp/beyblade-x/lineup/',
  });
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Wrote ${products.length} official products to ${outputPath}`);
