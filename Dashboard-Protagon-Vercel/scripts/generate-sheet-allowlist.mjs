import fs from 'node:fs';
import path from 'node:path';
const ids = new Set();
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.[jt]sx?$/.test(entry.name)) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/([^/"'\s]+)/g)) ids.add(match[1]);
    }
  }
}
scan('src');
if (!ids.size) throw new Error('Nenhuma planilha publicada foi encontrada.');
fs.mkdirSync('server', { recursive: true });
fs.writeFileSync('server/published-sheets.ts', '// Gerado a partir das fontes do aplicativo pelo comando build.\nexport const publishedSheetIds = ' + JSON.stringify([...ids].sort(), null, 2) + ' as const;\n');
console.log(`Fontes autorizadas: ${ids.size} planilhas.`);
