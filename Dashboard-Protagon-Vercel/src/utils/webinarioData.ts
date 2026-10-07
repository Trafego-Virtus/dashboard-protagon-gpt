import Papa from 'papaparse';

export interface WebinarioRawData {
  geral: any[];
  captura: any[];
  ingressos: any[];
}

export async function fetchWebinarioData(): Promise<WebinarioRawData> {
  const fetchCsv = async (url: string) => {
    const response = await fetch(`/api/csv?url=${encodeURIComponent(url)}`);
    const text = await response.text();
    return Papa.parse(text, { header: true }).data;
  };

  const [geral, captura, ing1, ing2, ing3] = await Promise.all([
    fetchCsv("https://docs.google.com/spreadsheets/d/e/2PACX-1vQjF-PCNOqWQZe3Ufy8xE0nhWslTONvTtDlK3DPjQVzeXRqxgrjQkEQst5N-tb7yxCQ0Xq1ieeOHhTn/pub?output=csv&gid=0"),
    fetchCsv("https://docs.google.com/spreadsheets/d/e/2PACX-1vQjF-PCNOqWQZe3Ufy8xE0nhWslTONvTtDlK3DPjQVzeXRqxgrjQkEQst5N-tb7yxCQ0Xq1ieeOHhTn/pub?output=csv&gid=680936326"),
    fetchCsv("https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1453614050"),
    fetchCsv("https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=647886647"),
    fetchCsv("https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1444015257")
  ]);

  const ingressos = [...ing1, ...ing2, ...ing3];

  return { geral, captura, ingressos };
}
