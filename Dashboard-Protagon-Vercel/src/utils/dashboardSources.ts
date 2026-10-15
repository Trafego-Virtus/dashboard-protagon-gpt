// Fontes publicadas do ZIP. IDs da aba GERAL conferidos em 15/10/2026.
export type DashboardId = 'protagon-joinville' | 'protagon-cuiaba' | 'protagon-porto-alegre' | 'protagon-sao-paulo' | 'protagon-goiania';

export const DASHBOARDS: Record<DashboardId, {
  CSV_URL: string;
  INGRESSOS_CSV_URL: string;
  CADEIRAS_CSV_URL: string;
  MET_CSV_URL: string;
  VD_CSV_URL: string;
  GD_CSV_URL: string;
  GD_V2_CSV_URL?: string;
  DC_CSV_URL: string;
  DC2_CSV_URL?: string;
  GERAL_CSV_URL: string;
  SENDFLOW_TRAFEGO_CSV_URL?: string;
}> = {
  'protagon-joinville': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1444548113",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1453614050",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=863773508",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=27909521",
    GD_V2_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=736292789",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vScQyN2_CL3iVvWNhZWwQzXA3AO26lO_sMUukWBzkzri3fl13EZmpq6CHIog258XHsxQ-2yWVXod2u0/pub?output=csv&gid=1372087036"
  },
  'protagon-cuiaba': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=787330273",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=647886647",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1480696912",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=27909521",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=1851196590",
    DC2_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=2072743280",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6M0lWh-1NXzvLj48Xi6fhSU8uziGahV8OTHYtkB9dlXEYpfVbiJBTjukwema9GZksETnDm-LCnmYU/pub?output=csv&gid=0"
  },
  'protagon-porto-alegre': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=2053290773",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1444015257",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1480696912",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=27909521",
    GD_V2_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1445243482",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLmH0WYkDKSHIOz6NpGsGl7ESq3UxdS8TlntP-1lEW-UEph2S5E-ZqLPp0mUPkyiI45OUMtYtgeMU1/pub?output=csv&gid=1846123823"
  },
  'protagon-sao-paulo': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1444548113",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1453614050",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=863773508",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=27909521",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=1309336900",
    SENDFLOW_TRAFEGO_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw8tH3j_nWBaIHti2ArML1eCB-4RBm8q3nC4R5cKqG2nbJFvcXNxmK3WKUFkQydGK0U1wwFuxQ_n5K/pub?output=csv&gid=593295586"
  },
  'protagon-goiania': {
    CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1444548113",
    INGRESSOS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1453614050",
    CADEIRAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=863773508",
    MET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1934788815",
    VD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1789500228",
    GD_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=27909521",
    DC_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1851196590",
    GERAL_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1301297577",
    SENDFLOW_TRAFEGO_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwejh0r8y0vDlx0bMC0EZJJh39s0CpRWbqhVkckRGYl8VHrRlWPj-k1bGJn5ZIg7Z3sg9a0yHitogI/pub?output=csv&gid=1524417673"
  }
};

