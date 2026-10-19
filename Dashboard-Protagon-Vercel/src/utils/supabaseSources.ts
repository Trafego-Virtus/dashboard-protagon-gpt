// Fixed allowlist. Never accept an arbitrary schema/table from a request.
export const SUPABASE_CITIES = {
  'protagon-joinville': 'joinville',
  'protagon-porto-alegre': 'porto_alegre',
  'protagon-goiania': 'goiania',
  'protagon-sao-paulo': 'sao_paulo',
} as const;
export const SUPABASE_DATASETS = ['geral', 'met', 'vd', 'gd', 'dc', 'dcCorredor', 'workshop'] as const;
export type SupabaseDataset = typeof SUPABASE_DATASETS[number];
export type SupabaseCity = keyof typeof SUPABASE_CITIES;
export const SUPABASE_PAGE_SIZE = 500;

export function hasSupabaseSource(city: string): city is SupabaseCity {
  return Object.hasOwn(SUPABASE_CITIES, city);
}

export function supabaseTable(city: string, dataset: string): string | null {
  if (!hasSupabaseSource(city) || !SUPABASE_DATASETS.includes(dataset as SupabaseDataset)) return null;
  const suffix = SUPABASE_CITIES[city];
  return dataset === 'geral' ? `leads_protagon_${suffix}`
    : `trafego_protagon_${suffix}_${dataset === 'dcCorredor' ? 'dc_corredor_polones' : dataset}`;
}
