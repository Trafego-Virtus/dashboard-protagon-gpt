import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { TesteAgil, FeedbackTeste } from '../types/testes';

const LOCAL_STORAGE_KEY = 'protagon_testes_agil_v1';

const SEED_TESTES: TesteAgil[] = [
  {
    id: 'teste-protagon-001',
    nome: 'Otimização de Custo MQL - Formulário com Filtro de Renda',
    praca: 'Joinville',
    evento: 'PROTAGON',
    tipoFunil: 'geracao-demanda-form',
    kpiAlvo: 'custo_mql',
    baseline: 77.56,
    metaAlvo: 55.00,
    excelenteRef: 49.18,
    variavelUnica: 'Pergunta de renda posicionada como 1ª etapa eliminatória no formulário nativo',
    hipotese: 'Se posicionarmos a renda logo no início do formulário, esperamos reduzir o Custo por MQL qualificado de R$ 77,56 para R$ 55,00 porque filtraremos leads sem perfil antes de consumirem impressões repetidas.',
    campanhasVinculadas: [
      {
        id: 'c-01',
        nome: 'C020 - [FORMS NATIVO] [RENDA QUALIFICADA] [ISD-E019-JVL] [LEADS]',
        status: 'ATIVA',
        gasto: 489.30,
        cliques: 142,
        mqls: 9,
        ctr: 1.48,
        cpm: 41.20,
        cpc: 3.44,
        custoPorMql: 54.36
      }
    ],
    dataInicio: new Date().toISOString().split('T')[0],
    duracaoDias: 7,
    dataProximoFeedback: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'ativo',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  },
  {
    id: 'teste-protagon-002',
    nome: 'Teste de Hook Visual - Quebra de Padrão Marcos no Palco',
    praca: 'Todas as Praças',
    evento: 'PROTAGON',
    tipoFunil: 'venda-direta',
    kpiAlvo: 'hook_rate',
    baseline: 11.20,
    metaAlvo: 16.00,
    excelenteRef: 14.88,
    variavelUnica: 'Gancho visual nos primeiros 3 segundos com corte rápido do Marcos no palco e legenda amarela pulsante',
    hipotese: 'Se utilizarmos a quebra de padrão visual e auditivo no frame zero, o Hook Rate subirá de 11,2% para mais de 16%, aumentando o volume de visualizadores qualificados até a oferta final.',
    campanhasVinculadas: [
      {
        id: 'c-02',
        nome: 'C015 - [VENDA DIRETA] [HOOK MARCOS PALCO] [PROTAGON]',
        status: 'ATIVA',
        gasto: 1250.00,
        cliques: 280,
        mqls: 2,
        ctr: 0.72,
        cpm: 38.50,
        cpc: 4.46,
        custoPorMql: 625.00
      }
    ],
    dataInicio: '2026-09-10',
    duracaoDias: 7,
    dataProximoFeedback: '2026-09-17',
    status: 'concluido',
    feedback: {
      dataConclusao: '2026-09-17',
      resultado: 'positivo',
      metricaFinal: 17.40,
      variacaoPercentual: 55.3,
      aprendizado: 'A quebra de padrão nos 3 primeiros segundos gerou um aumento expressivo de retenção (+55%), mantendo o CTR acima de 0,70% e reduzindo o CPM médio para R$ 38,50.',
      decisao: 'escalar',
      observacoes: 'Replicar a mesma estrutura de primeiros 3 segundos para os novos criativos das praças de Cuiabá e Porto Alegre.',
      criativosValidados: [
        {
          id: 'cr-01',
          nome: 'AD 03 - Gancho Marcos no Palco (Frame Zero)',
          kpiValor: 17.40,
          kpiLabel: 'Hook Rate'
        },
        {
          id: 'cr-02',
          nome: 'AD 05 - Corte Dinâmico com Legenda Amarela',
          kpiValor: 16.20,
          kpiLabel: 'Hook Rate'
        }
      ]
    },
    criadoEm: '2026-09-10T10:00:00.000Z',
    atualizadoEm: '2026-09-17T18:00:00.000Z'
  }
];

function getLocalTestes(): TesteAgil[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler testes do localStorage', e);
  }
  return SEED_TESTES;
}

function saveLocalTestes(testes: TesteAgil[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(testes));
  } catch (e) {
    console.warn('Erro ao salvar testes no localStorage', e);
  }
}

export async function fetchTestesAgil(): Promise<TesteAgil[]> {
  try {
    const colRef = collection(db, 'testes_agil');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: TesteAgil[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as TesteAgil);
      });
      // Sincroniza localmente
      saveLocalTestes(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore indisponível ou permissão pendente, usando cache local:', error);
  }

  // Fallback para cache local / seeds
  const localItems = getLocalTestes();
  // Tenta persistir seeds no firestore em background
  try {
    for (const item of localItems) {
      const docRef = doc(db, 'testes_agil', item.id);
      await setDoc(docRef, item, { merge: true });
    }
  } catch (err) {
    // Silencioso se sem conexão
  }
  return localItems;
}

export async function saveTesteAgil(teste: TesteAgil): Promise<void> {
  const current = getLocalTestes();
  const index = current.findIndex(t => t.id === teste.id);
  let updated: TesteAgil[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...teste, atualizadoEm: new Date().toISOString() };
  } else {
    updated = [{ ...teste, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }, ...current];
  }
  saveLocalTestes(updated);

  try {
    const docRef = doc(db, 'testes_agil', teste.id);
    await setDoc(docRef, teste, { merge: true });
  } catch (error) {
    console.warn('Erro ao salvar no Firestore (salvo localmente):', error);
  }
}

export async function deleteTesteAgil(id: string): Promise<void> {
  const current = getLocalTestes().filter(t => t.id !== id);
  saveLocalTestes(current);

  try {
    const docRef = doc(db, 'testes_agil', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Erro ao excluir no Firestore (excluído localmente):', error);
  }
}

export async function concluirTesteAgil(id: string, feedback: FeedbackTeste): Promise<void> {
  const current = getLocalTestes();
  const target = current.find(t => t.id === id);
  if (!target) return;

  const updatedTarget: TesteAgil = {
    ...target,
    status: 'concluido',
    feedback,
    atualizadoEm: new Date().toISOString()
  };

  await saveTesteAgil(updatedTarget);
}

export async function toggleStatusTesteAgil(id: string): Promise<TesteAgil | null> {
  const current = getLocalTestes();
  const target = current.find(t => t.id === id);
  if (!target) return null;

  const newStatus = target.status === 'ativo' ? 'inativo' : 'ativo';
  const updatedTarget: TesteAgil = {
    ...target,
    status: newStatus,
    atualizadoEm: new Date().toISOString()
  };

  await saveTesteAgil(updatedTarget);
  return updatedTarget;
}

export async function reabrirTesteAgil(id: string): Promise<TesteAgil | null> {
  const current = getLocalTestes();
  const target = current.find(t => t.id === id);
  if (!target) return null;

  const updatedTarget: TesteAgil = {
    ...target,
    status: 'ativo',
    atualizadoEm: new Date().toISOString()
  };

  await saveTesteAgil(updatedTarget);
  return updatedTarget;
}
