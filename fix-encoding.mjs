import { readFileSync, writeFileSync } from 'fs';

const path = 'C:/Users/TECNOLOGIA/portal-ti/frontend/src/pages/NotebooksPage.tsx';
let c = readFileSync(path, 'utf8');

// The file was saved with mojibake: UTF-8 bytes read as Latin-1 then re-encoded as UTF-8
// Strategy: decode the mojibake by re-encoding each code point back to the original bytes
function fixMojibake(str) {
  return str.split('').map(ch => {
    const code = ch.charCodeAt(0);
    if (code > 127 && code < 256) {
      return Buffer.from([code]).toString('latin1');
    }
    return ch;
  }).join('');
}

// Actually, let's do direct string replacements for known broken sequences
const fixes = [
  ['DisponÃ­vel', 'Disponível'],
  ['ManutenÃ§Ã£o', 'Manutenção'],
  [' Â· ', ' · '],
  ['Â·', '·'],
  ['ðŸ'»', '💻'],
  ['ðŸ"¦', '📦'],
  ['ðŸ"§', '🔧'],
  ['ðŸ—\u2019', '🗑️'],
  ['ðŸ"‹', '📋'],
  ['âœ…', '✅'],
  ['âœ"', '✓'],
  ['â–²', '▲'],
  ['â–¼', '▼'],
  ['â€"', '—'],
  ['CÃ³digo', 'Código'],
  ['ResponsÃ¡vel', 'Responsável'],
  ['CondiÃ§Ã£o', 'Condição'],
  ['AÃ§Ãµes', 'Ações'],
  ['responsÃ¡vel', 'responsável'],
  ['cÃ³digo', 'código'],
  ['disponÃ­vel', 'disponível'],
  ['manutenÃ§Ã£o', 'manutenção'],
  ['ðŸ"', '🔍'],
  ['âœ•', '✕'],
  ['ðŸ"¤', '📤'],
  ['ðŸ"„', '🔄'],
  ['ðŸ"¥', '📥'],
  ['ðŸ"Š', '📊'],
  ['âž•', '➕'],
  ['ðŸ"­', '📭'],
];

let changed = 0;
for (const [from, to] of fixes) {
  if (c.includes(from)) {
    c = c.split(from).join(to);
    changed++;
    console.log(`Fixed: "${from}" → "${to}"`);
  }
}

writeFileSync(path, c, 'utf8');
console.log(`\nDone. Fixed ${changed} patterns.`);
