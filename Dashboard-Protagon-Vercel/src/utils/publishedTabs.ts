export interface PublishedTab { name: string; gid: string }

// Read Google's public index without executing any of its JavaScript.
export function parsePublishedTabs(html: string): PublishedTab[] {
  const tabs: PublishedTab[] = [];
  for (const block of html.matchAll(/items\.push\(\s*\{([^}]+)\}\s*\)/g)) {
    const name = /name:\s*["']((?:\\.|[^"'\\])*)["']/.exec(block[1]);
    const gid = /gid:\s*["']?(\d+)["']?/.exec(block[1]);
    if (!name || !gid) continue;
    const decoded = name[1]
      .replace(/\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (_, u, x) => String.fromCharCode(parseInt(u || x, 16)))
      .replace(/\\([\\/"'])/g, '$1');
    tabs.push({ name: decoded.trim(), gid: gid[1] });
  }
  return tabs;
}

export function resolveGeralUrl(verifiedFallback: string, tabs: PublishedTab[]): string {
  // Exact match: OFF - GERAL must never be selected or combined with GERAL.
  const geral = tabs.find(tab => tab.name.toUpperCase() === 'GERAL');
  if (geral) {
    const url = new URL(verifiedFallback);
    url.searchParams.set('gid', geral.gid);
    return url.toString();
  }
  if (tabs.length) {
    throw new Error('A aba GERAL não está publicada. Publique essa aba no Google Sheets e atualize os dados.');
  }
  // If index discovery is unavailable, use the ID verified in the source workbook.
  return verifiedFallback;
}
