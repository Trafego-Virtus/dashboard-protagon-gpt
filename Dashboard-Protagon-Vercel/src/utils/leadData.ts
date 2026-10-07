// The consolidated sheet is authoritative. Native-form exports supplement it;
// they must never replace an entire date range or bypass deduplication.
type Lead = Record<string, any>;

const value = (row: Lead, keys: string[]) => {
  for (const key of keys) {
    const text = String(row[key] ?? '').trim();
    if (text) return text;
  }
  return '';
};

export function normalizeLead(row: Lead): Lead {
  const result = {
    ...row,
    email: value(row, ['email', 'email_normalizado', 'E-mail', 'Email']),
    numero: value(row, ['numero', 'numero_normalizado', 'phone_number', 'Telefone', 'telefone', 'Celular', 'celular', 'WhatsApp', 'whatsapp']),
    clint: value(row, ['clint', 'Clint']).toUpperCase(),
    'Atribuição': value(row, ['Atribuição', 'atribuição', 'atribuicao']),
    Subfunil: value(row, ['Subfunil', 'subfunil', 'Tipo de Funil']),
  };
  // Some Cuiabá rows have an explicit demand subfunnel but no attribution.
  if (!result['Atribuição'] && /formul[aá]rio nativo|inlead|captura.*comercial/i.test(result.Subfunil)) {
    result['Atribuição'] = 'Geração de Demanda';
  }
  return result;
}

export function normalizeNativeForm(row: Lead): Lead {
  const keys = Object.keys(row);
  const findAnswer = (pattern: RegExp) => value(row, keys.filter(key => pattern.test(key)));
  const rawDate = value(row, ['created_time', 'data_hora', 'Data']);
  let date = rawDate;
  // Timestamp exports are interpreted in the dashboard's Brazilian business day,
  // independently of the viewer's computer timezone. Date-only exports stay intact.
  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawDate) && Number.isFinite(Date.parse(rawDate))) {
    date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(rawDate));
  } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    date = rawDate.slice(0, 10).split('-').reverse().join('/');
  }
  return normalizeLead({
    ...row,
    data_hora: date,
    nome: value(row, ['nome', 'full_name', 'Nome']),
    renda: findAnswer(/faturamento|renda/i),
    atuacao: findAnswer(/ocupação|atua/i),
    utm_campaign: value(row, ['campaign_name', 'utm_campaign']),
    utm_term: value(row, ['adset_name', 'utm_term']),
    utm_content: value(row, ['ad_name', 'utm_content']),
    'Atribuição': 'Geração de Demanda',
    Subfunil: 'Formulário Nativo',
    _isNewFormNativo: true,
    // Preserve the original qualification rule for these prequalified INT tabs.
    // When a matching consolidated record exists, its actual clint value wins.
    clint: 'SIM',
  });
}

export function deduplicateLeads(rows: Lead[]): Lead[] {
  // A contact may convert in multiple funnels. One registration must not erase
  // another funnel's lead just because it contains more answered fields.
  const funnel = (row: Lead) => String(row['Atribuição'] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const cells = (row: Lead) => Object.values(row).filter(v => v != null && String(v).trim() !== '').length;
  const prefer = (existing: Lead, candidate: Lead) => {
    if (!!existing._isNewFormNativo !== !!candidate._isNewFormNativo) {
      return existing._isNewFormNativo ? candidate : existing;
    }
    return cells(candidate) > cells(existing) ? candidate : existing;
  };
  const byId = new Map<string, Lead>();
  rows.forEach((input, index) => {
    const row = normalizeLead(input);
    const uuid = value(row, ['uuid', 'uidd']).toLowerCase();
    const sourceId = value(row, ['id']);
    const identity = uuid ? `uuid:${uuid}` : sourceId
      ? `${row._isNewFormNativo ? 'native' : 'general'}:${sourceId}` : `row:${index}`;
    const key = `${funnel(row)}|${identity}`;
    byId.set(key, byId.has(key) ? prefer(byId.get(key)!, row) : row);
  });
  const byContact = new Map<string, Lead>();
  let anonymous = 0;
  for (const row of byId.values()) {
    const email = row.email.toLowerCase();
    const phone = row.numero.replace(/\D/g, '');
    const identity = email ? `email:${email}` : phone ? `phone:${phone}` : `anonymous:${anonymous++}`;
    const key = `${funnel(row)}|${identity}`;
    byContact.set(key, byContact.has(key) ? prefer(byContact.get(key)!, row) : row);
  }
  return [...byContact.values()];
}
