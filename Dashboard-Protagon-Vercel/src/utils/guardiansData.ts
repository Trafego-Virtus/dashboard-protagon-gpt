import Papa from 'papaparse';

const BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS633xawej_g4NqY1lvC6RwrM3y717c5nk1Znqm1iE0mBYsHiICWAC4s1DORbgj5YCFZvOaHEVTdKud/pub';

export interface GuardiansRawData {
  base_lovable: any[];
  meta_ads_dados: any[];
  meta_ads_dados_v2: any[];
}

export const fetchGuardiansData = async (): Promise<GuardiansRawData> => {
  const fetchCSV = async (gid: string) => {
    try {
      const response = await fetch(`/api/csv?url=${encodeURIComponent(`${BASE_URL}?output=csv&gid=${gid}`)}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch GID ${gid} with status ${response.status} ${response.statusText}`);
      }
      const csvText = await response.text();
      return new Promise<any[]>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err: any) => reject(err),
        });
      });
    } catch (e: any) {
      console.error(`Error in fetchCSV for gid ${gid}:`, e);
      throw e;
    }
  };

  try {
    // Fetch sequentially to prevent Google Sheets 429 Too Many Requests rate limiting
    const [base_lovable, meta_ads_dados, meta_ads_dados_v2] = await Promise.all([
      fetchCSV('2115178316'),
      fetchCSV('1289271915'),
      fetchCSV('1206128987')
    ]);

    return {
      base_lovable,
      meta_ads_dados,
      meta_ads_dados_v2
    };
  } catch (err) {
    console.error("Error fetching Guardians data:", err);
    throw err; // Re-throw to see the full error in the UI or let it bubble
  }
};
