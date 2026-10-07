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
