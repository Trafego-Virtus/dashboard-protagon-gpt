import { FunilKpiConfig, FunilType, KpiKey } from '../types/testes';

export const KPIS_PROTAGON_CONFIG: Record<FunilType, FunilKpiConfig> = {
  'geracao-demanda-form': {
    id: 'geracao-demanda-form',
    nome: 'Geração de Demanda (Formulário)',
    baseVideos: 273,
    descricao: 'Anúncios direcionados ao Formulário Nativo do Meta. Cálculo por percentil (P25 Ruim, P50 Médio, P75 Excelente) sobre vídeos com gasto acima da média.',
    kpis: {
      custo_mql: {
        label: 'Custo por MQL',
        ruim: 98.50,
        medio: 65.89,
        excelente: 49.18,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      cpm: {
        label: 'CPM',
        ruim: 52.80,
        medio: 42.47,
        excelente: 35.78,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      cpc: {
        label: 'CPC',
        ruim: 8.16,
        medio: 6.31,
        excelente: 5.02,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      ctr: {
        label: 'CTR (%)',
        ruim: 0.54,
        medio: 0.65,
        excelente: 0.82,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_rate: {
        label: 'Hook Rate (Geral)',
        ruim: 17.15,
        medio: 20.38,
        excelente: 24.33,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_marcos: {
        label: 'Hook Marcos',
        ruim: 19.22,
        medio: 22.58,
        excelente: 26.99,
        unit: 'percent',
        direction: 'higher_is_better'
      }
    },
    cacEstimado: {
      cenarioRuim: { taxa: '2%', cac: 5206.00, mqlsPorVenda: 50 },
      cenarioMedio: { taxa: '3%', cac: 2211.00, mqlsPorVenda: 33.3 },
      cenarioExcelente: { taxa: '4%', cac: 1236.50, mqlsPorVenda: 25 }
    },
    variaveisRecomendadas: {
      custo_mql: [
        'Filtro de qualificação no formulário nativo',
        'Pergunta de renda/faturamento posicionada no início',
        'Copy de quebra de objeção antes do clique',
        'Segmentação de público mais restrita/qualificada',
        'Headline com promessa mais específica e direcionada'
      ],
      cpm: [
        'Expansão do público para Advantage+ / Aberto',
        'Troca de criativos para combater saturação',
        'Ajuste de posicionamentos manuais vs automáticos',
        'Aumento do tempo de estabilização do orçamento'
      ],
      cpc: [
        'Chamada para Ação (CTA) clara nos últimos 5s',
        'Texto na imagem/thumbnail com maior curiosidade',
        'Redução do texto longo nos criativos para mobile'
      ],
      ctr: [
        'Primeiro frame do vídeo com quebra de padrão visual',
        'Headline em destaque nos primeiros 3 segundos',
        'Elemento de curiosidade ou contraste cromático forte'
      ],
      hook_rate: [
        'Gancho visual nos primeiros 3 segundos (gesto/objeto)',
        'Pergunta provocativa no primeiro segundo do áudio',
        'Legenda animada colorida destacando a dor inicial'
      ],
      hook_marcos: [
        'Roteiro focado no storytelling de autoridade do Marcos',
        'Corte rápido do primeiro take para manter atenção',
        'Gancho com frase de impacto direto sobre transformação'
      ]
    }
  },

  'venda-direta': {
    id: 'venda-direta',
    nome: 'Venda Direta (VD)',
    baseVideos: 69,
    descricao: 'Campanhas diretas para checkout ou página de vendas sem etapa de agendamento comercial.',
    kpis: {
      custo_mql: {
        label: 'Custo por MQL / Compra',
        ruim: 1338.20,
        medio: 789.94,
        excelente: 613.10,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      cpm: {
        label: 'CPM',
        ruim: 53.12,
        medio: 41.40,
        excelente: 29.35,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      cpc: {
        label: 'CPC',
        ruim: 10.63,
        medio: 6.86,
        excelente: 4.33,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      ctr: {
        label: 'CTR (%)',
        ruim: 0.46,
        medio: 0.61,
        excelente: 0.76,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_rate: {
        label: 'Hook Rate (Geral)',
        ruim: 10.59,
        medio: 12.59,
        excelente: 14.88,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_marcos: {
        label: 'Hook Marcos',
        ruim: 14.44,
        medio: 17.17,
        excelente: 20.96,
        unit: 'percent',
        direction: 'higher_is_better'
      }
    },
    cacEstimado: {
      cenarioRuim: { taxa: '20% Checkout', cac: 6691.00, mqlsPorVenda: 5.0 },
      cenarioMedio: { taxa: '30% Checkout', cac: 2633.13, mqlsPorVenda: 3.33 },
      cenarioExcelente: { taxa: '40% Checkout', cac: 1532.75, mqlsPorVenda: 2.5 }
    },
    variaveisRecomendadas: {
      custo_mql: [
        'Ancoragem de preço e oferta especial no anúncio',
        'Garantia incondicional destacada na comunicação',
        'Públicos mornos e remarketing com cupom limitado',
        'Vídeo focado no formato problema x solução imediata'
      ],
      cpm: [
        'Veiculação em públicos Lookalike 1% e 2%',
        'Ajuste para posicionamentos automáticos recomendados',
        'Rotatividade de 3 variações de criativo simultâneas'
      ],
      cpc: [
        'CTA direta "Garanta seu ingresso agora"',
        'Copy focada na data limite ou virada de lote',
        'Eliminação de links ou distrações secundárias'
      ],
      ctr: [
        'Thumbnail com Marcos no palco em alta energia',
        'Contraste forte de cores e texto de ação legível'
      ],
      hook_rate: [
        'Gancho com frase de impacto sobre o evento presencial',
        'Vídeo com cortes rápidos e trilha dinâmica nos 3s'
      ],
      hook_marcos: [
        'Depoimento rápido de aluno nos primeiros 3 segundos',
        'Apresentação direta do Marcos convocando para o presencial'
      ]
    }
  },

  'geracao-demanda-captura': {
    id: 'geracao-demanda-captura',
    nome: 'Geração de Demanda (Página de Captura)',
    baseVideos: 94,
    descricao: 'Campanhas direcionadas a Landing Page externa de captura e qualificação de leads.',
    kpis: {
      custo_mql: {
        label: 'Custo por MQL',
        ruim: 328.71,
        medio: 225.78,
        excelente: 148.93,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      conversao_pagina: {
        label: 'Conversão da Página (%)',
        ruim: 4.42,
        medio: 6.25,
        excelente: 10.00,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      cpm: {
        label: 'CPM',
        ruim: 54.94,
        medio: 41.73,
        excelente: 34.03,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      cpc: {
        label: 'CPC',
        ruim: 8.55,
        medio: 6.58,
        excelente: 4.83,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      ctr: {
        label: 'CTR (%)',
        ruim: 0.50,
        medio: 0.61,
        excelente: 0.82,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_rate: {
        label: 'Hook Rate (Geral)',
        ruim: 13.16,
        medio: 15.72,
        excelente: 17.76,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_marcos: {
        label: 'Hook Marcos',
        ruim: 16.13,
        medio: 19.22,
        excelente: 21.78,
        unit: 'percent',
        direction: 'higher_is_better'
      }
    },
    cacEstimado: {
      cenarioRuim: { taxa: '2% Comercial', cac: 16435.50, mqlsPorVenda: 50 },
      cenarioMedio: { taxa: '3% Comercial', cac: 7526.00, mqlsPorVenda: 33.3 },
      cenarioExcelente: { taxa: '4% Comercial', cac: 3723.25, mqlsPorVenda: 25 }
    },
    variaveisRecomendadas: {
      conversao_pagina: [
        'Redução dos campos do formulário para nome e whatsapp',
        'Headline com conexão exata ao criativo que originou o clique',
        'Inserção de vídeo institucional rápido acima da dobra',
        'Otimização de tempo de carregamento no celular (< 2s)'
      ],
      custo_mql: [
        'Formulário em 2 etapas com qualificação prévia',
        'Alinhamento total entre a promessa do anúncio e a LP',
        'Filtragem explícita de faturamento na chamada do anúncio'
      ],
      cpm: [
        'Ampliação do raio de geolocalização da praça',
        'Substituição de criativos saturados com mais de 7 dias'
      ],
      cpc: [
        'Melhoria do texto do anúncio para aumentar relevância',
        'Ajuste do botão de ação (CTA) para "Quero Participar"'
      ],
      ctr: [
        'Variação do frame inicial com expressão facial marcante',
        'Contraste com fundo escuro e legenda amarela'
      ],
      hook_rate: [
        'Início com som de sirene, sino ou pergunta sem introdução',
        'Corte imediato de introduções lentas'
      ],
      hook_marcos: [
        'Apresentação direta de caso real de transformação',
        'Pergunta de dor específica para o público-alvo'
      ]
    }
  },

  'meteorico': {
    id: 'meteorico',
    nome: 'Meteórico',
    baseVideos: 99,
    descricao: 'Campanhas de grupos VIP do WhatsApp para lançamento ou ação relâmpago de vendas.',
    kpis: {
      custo_mql: {
        label: 'Custo por Lead no Grupo',
        ruim: 85.00,
        medio: 58.00,
        excelente: 42.00,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      conversao_pagina: {
        label: 'Entrada no Grupo (%)',
        ruim: 12.00,
        medio: 18.50,
        excelente: 25.00,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      cpm: {
        label: 'CPM',
        ruim: 44.59,
        medio: 35.80,
        excelente: 29.53,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      cpc: {
        label: 'CPC',
        ruim: 8.25,
        medio: 6.49,
        excelente: 5.29,
        unit: 'currency',
        direction: 'lower_is_better'
      },
      ctr: {
        label: 'CTR (%)',
        ruim: 0.44,
        medio: 0.55,
        excelente: 0.68,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_rate: {
        label: 'Hook Rate (Geral)',
        ruim: 11.84,
        medio: 14.28,
        excelente: 17.84,
        unit: 'percent',
        direction: 'higher_is_better'
      },
      hook_marcos: {
        label: 'Hook Marcos',
        ruim: 14.14,
        medio: 17.09,
        excelente: 20.80,
        unit: 'percent',
        direction: 'higher_is_better'
      }
    },
    cacEstimado: undefined,
    variaveisRecomendadas: {
      custo_mql: [
        'Chamada clara para entrar no grupo silencioso do WhatsApp',
        'Sensação de urgência com vaga limitada e data limite',
        'Copy focada na condição secreta que só haverá no grupo'
      ],
      cpm: [
        'Segmentação ampla com foco em engajamento dos últimos 90 dias',
        'Veiculação mista feed e stories'
      ],
      cpc: [
        'Botão direto com logotipo e cor verde do WhatsApp',
        'Texto com chamada para ação explícita "Acessar Grupo VIP"'
      ],
      ctr: [
        'Imagem do print da notificação do WhatsApp no anúncio',
        'Visual limpo com headline chamativa'
      ],
      hook_rate: [
        'Alerta de áudio "Mensagem no WhatsApp para você"',
        'Frase inicial convocando para a oportunidade única'
      ],
      hook_marcos: [
        'Marcos gravando na vertical em formato selfie convidando pro grupo',
        'Voz e entonação dinâmica sem formalismo'
      ]
    }
  }
};

export const METODOLOGIA_TESTES = {
  maturacao: 'Dia em que a métrica-alvo entra numa margem de segurança de estabilidade (15% de variação). No Protagon, a estabilização estatística do MQL costuma ocorrer entre o 3º e o 7º dia de veiculação ininterrupta.',
  cicloVida: 'Média de dias que criativos validados permanecem rodando antes de saturarem e necessitarem de nova iteração.',
  sprintsRecomendados: [
    { dias: 3, label: '3 dias', descricao: 'Sprint Ágil Curto: Ideal para CTR, Hook Rate e detecção precoce de criativos com CPC/CPM fora da curva.' },
    { dias: 7, label: '7 dias', descricao: 'Sprint Padrão (Recomendado): Estabilização estatística da métrica-alvo com ciclo completo de dias da semana.' },
    { dias: 14, label: '14 dias', descricao: 'Sprint Estendido: Recomendado para Custo por MQL e ciclos de vendas com volume menor ou públicos mais restritos.' }
  ]
};
