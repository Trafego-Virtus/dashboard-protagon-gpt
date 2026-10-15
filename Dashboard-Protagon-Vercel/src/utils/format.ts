export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value || value === '-') return 0;
  // Remove "R$", dots, and replace comma with dot
  const cleanString = value.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value || value === '-') return 0;
  const parsed = parseFloat(value.toString().replace(/\./g, '').replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim().split(/\s+/)[0].split(',')[0];
  let parts = cleanStr.split('/');
  if (parts.length !== 3) {
    parts = cleanStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      // YYYY-MM-DD format
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return null;
}

export function isRendaAcima5k(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const str = String(raw).trim().toLowerCase();
  if (!str) return false;
  if (str.includes('não possuo') || str.includes('nao possuo') || str.includes('sem renda')) return false;

  // Brackets explicitly <= 5.000
  if (str.includes('2.501') && str.includes('5.000')) return false;
  if (str.includes('1.501') && str.includes('2.500')) return false;
  if (str.includes('até') || str.includes('ate')) {
    if (str.includes('1.500') || str.includes('2.500') || str.includes('5.000')) return false;
  }

  // Brackets explicitly > 5.000
  if (
    str.includes('5.001') ||
    str.includes('7.501') ||
    str.includes('10.001') ||
    str.includes('20.001') ||
    str.includes('30.001') ||
    str.includes('40.001') ||
    str.includes('50.001')
  ) {
    return true;
  }

  if (str.includes('acima')) {
    if (str.includes('1.500') || str.includes('2.500')) return false;
    return true;
  }

  // Numerical fallback parsing
  const nums = str.match(/\d[\d\.]*/g) || [];
  const parsedNums = nums.map(n => parseFloat(n.replace(/\./g, ''))).filter(n => !isNaN(n));
  if (parsedNums.length > 0) {
    const min = parsedNums[0];
    const max = parsedNums[parsedNums.length - 1];
    if (min > 5000) return true;
    if (max <= 5000) return false;
  }

  return false;
}
