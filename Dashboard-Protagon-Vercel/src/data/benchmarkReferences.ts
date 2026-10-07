export interface TestProposition {
  objetivo: string;
  hipotese: string;
  variaveis: string[];
  acaoTatica: string;
  sprintSugerido: string;
}

export interface BenchmarkMetric {
  id: string;
  name: string;
  unit: 'currency' | 'percent' | 'number';
  direction: 'lower_is_better' | 'higher_is_better';
  excelente: number;
  medio: number;
  ruim: number;
  available?: boolean;
  note?: string;
  testPropositions?: {
    ruim: TestProposition;
    excelente: TestProposition;
  };
}

export interface CACScenario {
  title: string;
  status: 'excelente' | 'medio' | 'ruim';
  mqlCost: number;
  conversionRate: number;
  mqlsPerSale: number;
  cac: number;
}

export interface FunnelBenchmark {
  id: 'vd' | 'gd-form' | 'gd-captura' | 'meteorico' | 'gd-inlead';
  name: string;
  shortName: string;
  metrics: BenchmarkMetric[];
  cacScenarios?: CACScenario[];
}

export const FUNNEL_BENCHMARKS: Record<string, FunnelBenchmark> = {
  'vd': {
    id: 'vd',
    name: 'Venda Direta (VD)',
    shortName: 'Venda Direta',
    metrics: [
      {
        id: 'custo_mql',
        name: 'Custo por MQL',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 613.10,
        medio: 789.94,
        ruim: 1338.20,
        testPropositions: {
          ruim: {
            objetivo: 'Redução urgente de Custo por MQL e qualificação de intenção de compra.',
            hipotese: 'Se adicionarmos um filtro prévio de ancoragem de preço e urgência antes do checkout, eliminaremos cliques desqualificados e reduziremos o Custo por MQL para menos de R$ 789,94.',
            variaveis: [
              'Headline direta com ancoragem de valor e oferta no primeiro terço do vídeo',
              'Copy com quebra explícita de objeções de preço e tempo',
              'Página de checkout com depoimentos e provas sociais no topo',
              'Exclusão de compradores recentes e públicos saturados'
            ],
            acaoTatica: 'Pausar criativos com custo > R$ 1.338 e rodar sprint A/B de nova introdução em 48h.',
            sprintSugerido: 'Sprint de 5 a 7 dias com orçamento controlado'
          },
          excelente: {
            objetivo: 'Escala de orçamento e expansão de públicos mantendo eficiência.',
            hipotese: 'A mensagem do criativo ressoou fortemente com o público de compra. Aumentando o orçamento em 20% a cada 48h e abrindo para Advantage+, manteremos o Custo por MQL ≤ R$ 613,10 com maior volume.',
            variaveis: [
              'Variação de formatos (1:1 feed vs 9:16 reels) mantendo mesmo áudio e gancho',
              'Expansão horizontal para públicos semelhantes (Lookalike 1% a 3%) e aberto com exclusões',
              'Teste de novos ângulos de introdução preservando a oferta vencedora'
            ],
            acaoTatica: 'Escalar orçamento em 15-20% e criar 2 variações derivadas do criativo vencedor.',
            sprintSugerido: 'Sprint de escala contínua com monitoramento diário'
          }
        }
      },
      {
        id: 'cpm',
        name: 'CPM',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 29.35,
        medio: 41.40,
        ruim: 53.12,
        testPropositions: {
          ruim: {
            objetivo: 'Desafogar o leilão e reduzir o custo por mil impressões.',
            hipotese: 'O público atual está saturado ou excessivamente restrito, encarecendo o leilão. Ampliando o targeting e variando o formato do anúncio, reduziremos o CPM para < R$ 41,40.',
            variaveis: [
              'Ampliação de idade e raio geográfico da praça',
              'Habilitação de posicionamentos automáticos (Advantage+ Placements)',
              'Substituição de criativos em fadiga por novas abordagens visuais'
            ],
            acaoTatica: 'Duplicar conjunto para público aberto segmentado apenas por praça e faixa etária ampla.',
            sprintSugerido: 'Sprint de 3 a 5 dias'
          },
          excelente: {
            objetivo: 'Aproveitar leilão favorável para maximizar alcance e conversões.',
            hipotese: 'O criativo possui altíssima relevância no leilão (CPM ≤ R$ 29,35). Injetar mais verba permitirá ganhar mais leilões com custo reduzido.',
            variaveis: [
              'Incremento de verba diária sem alterar configurações do conjunto',
              'Teste de entrega acelerada nos horários de maior pico de checkout'
            ],
            acaoTatica: 'Priorizar distribuição de verba neste criativo.',
            sprintSugerido: 'Escala imediata'
          }
        }
      },
      {
        id: 'cpc',
        name: 'CPC',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 4.33,
        medio: 6.86,
        ruim: 10.63,
        testPropositions: {
          ruim: {
            objetivo: 'Aumentar a taxa de clique e reduzir o custo do tráfego qualificado.',
            hipotese: 'A chamada para ação (CTA) ou proposta do anúncio não está clara, gerando cliques caros. Reforçando o benefício e o botão de ação, reduziremos o CPC para < R$ 6,86.',
            variaveis: [
              'CTA mais explícita e imperativa nos últimos 5 segundos',
              'Texto na thumbnail com gatilho de curiosidade imediata',
              'Botão "Saiba Mais" vs "Comprar Agora"'
            ],
            acaoTatica: 'Ajustar copy e CTA do anúncio mantendo o corpo do vídeo.',
            sprintSugerido: 'Sprint ágil de 3 dias'
          },
          excelente: {
            objetivo: 'Capitalizar sobre o baixo custo por clique para gerar mais volume de vendas.',
            hipotese: 'O anúncio gera altíssimo interesse de clique (CPC ≤ R$ 4,33). Testar páginas de destino personalizadas para elevar a taxa de conversão final.',
            variaveis: [
              'Página de vendas focada na dor específica levantada no anúncio',
              'Otimização de tempo de carregamento da página de checkout'
            ],
            acaoTatica: 'Aumentar orçamento do anúncio e otimizar funil pós-clique.',
            sprintSugerido: 'Sprint de 5 dias'
          }
        }
      },
      {
        id: 'ctr',
        name: 'CTR (%)',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 0.76,
        medio: 0.61,
        ruim: 0.46,
        testPropositions: {
          ruim: {
            objetivo: 'Elevar a atratividade do anúncio e interesse no clique.',
            hipotese: 'O anúncio não se destaca no feed (CTR ≤ 0,46%). Inserindo elementos visuais de contraste e quebra de padrão no primeiro segundo, o CTR superará 0,61%.',
            variaveis: [
              'Quebra de padrão visual no 1º segundo (movimento rápido, zoom, cortes)',
              'Headline destacada em caixa alta com contraste preto e amarelo',
              'Pergunta instigante logo na abertura'
            ],
            acaoTatica: 'Refazer a capa (thumbnail) e os primeiros 3 segundos do vídeo.',
            sprintSugerido: 'Sprint ágil de 3 dias'
          },
          excelente: {
            objetivo: 'Documentar padrão do criativo vencedor e replicar em novos ângulos.',
            hipotese: 'A abertura e copy do criativo geram forte tração (CTR ≥ 0,76%). Replicar a mesma estrutura em novos temas trará outros criativos de alta performance.',
            variaveis: [
              'Mesma headline aplicada a outros formatos de apresentação',
              'Variação de cenário ou avatar mantendo o gancho vencedor'
            ],
            acaoTatica: 'Produzir 3 iterações mantendo a mesma fórmula do gancho.',
            sprintSugerido: 'Sprint criativo de 7 dias'
          }
        }
      },
      {
        id: 'hook_rate',
        name: 'Hook Rate (Impr)',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 14.88,
        medio: 12.59,
        ruim: 10.59,
        testPropositions: {
          ruim: {
            objetivo: 'Reter a audiência nos 3 primeiros segundos.',
            hipotese: 'A abertura do vídeo está lenta ou genérica, perdendo pessoas antes da proposta. Testando 3 novos inícios curtos e provocativos, o Hook Rate subirá acima de 12,59%.',
            variaveis: [
              'Corte seco eliminando saudações ("Oi pessoal", "Tudo bem?")',
              'Frase de impacto direto no segundo 0:00',
              'Elemento surpresa ou quebra de expectativa nos primeiros frames'
            ],
            acaoTatica: 'Gravar/editar 3 novas introduções de 3 segundos para o mesmo conteúdo.',
            sprintSugerido: 'Sprint de gancho de 3 dias'
          },
          excelente: {
            objetivo: 'Maximizar a retenção estendendo o engajamento ao longo do vídeo.',
            hipotese: 'O início prendeu com maestria (Hook Rate ≥ 14,88%). Otimizar o miolo do vídeo (retenção de 25% a 75%) transformará esse gancho em mais vendas diretas.',
            variaveis: [
              'Dinâmica visual a cada 4 segundos (b-roll, transições, textos)',
              'Reforço da promessa antes do CTA final'
            ],
            acaoTatica: 'Manter criativo ativo e escalar gradualmente o investimento.',
            sprintSugerido: 'Escala monitorada'
          }
        }
      },
      {
        id: 'hook_marcos',
        name: 'Hook Marcos (Alc)',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 20.96,
        medio: 17.17,
        ruim: 14.44,
        testPropositions: {
          ruim: {
            objetivo: 'Recuperar retenção de pessoas únicas impactadas pelo Marcos.',
            hipotese: 'A imagem ou entonação inicial do Marcos não capturou a atenção imediata. Testando enquadramento mais próximo e fala enfática, o Hook Marcos superará 17,17%.',
            variaveis: [
              'Enquadramento close-up (plano médio para fechado) no Marcos',
              'Áudio com tom enérgico e assertivo sem introduções longas',
              'Inserção de legenda cinética colorida'
            ],
            acaoTatica: 'Re-editar os primeiros segundos com cortes dinâmicos.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Potencializar o criativo de maior autoridade e empatia.',
            hipotese: 'A conexão inicial do Marcos com a audiência está excelente (Hook Marcos ≥ 20,96%). Usar este criativo como ponta de lança em novos públicos.',
            variaveis: [
              'Veiculação em públicos de remarketing e topo de funil simultaneamente',
              'Criação de novos anúncios com a mesma ambientação e tom'
            ],
            acaoTatica: 'Direcionar fatia substancial da verba de VD para este criativo.',
            sprintSugerido: 'Escala imediata'
          }
        }
      }
    ],
    cacScenarios: [
      {
        title: 'Cenário Ruim (Checkout a 20%)',
        status: 'ruim',
        mqlCost: 1338.20,
        conversionRate: 20,
        mqlsPerSale: 5.0,
        cac: 6691.00
      },
      {
        title: 'Cenário Médio (Checkout a 30%)',
        status: 'medio',
        mqlCost: 789.94,
        conversionRate: 30,
        mqlsPerSale: 3.33,
        cac: 2633.13
      },
      {
        title: 'Cenário Bom / Excelente (Checkout a 40%)',
        status: 'excelente',
        mqlCost: 613.10,
        conversionRate: 40,
        mqlsPerSale: 2.5,
        cac: 1532.75
      }
    ]
  },
  'gd-form': {
    id: 'gd-form',
    name: 'Geração de Demanda (Formulário)',
    shortName: 'GD Formulário',
    metrics: [
      {
        id: 'custo_mql',
        name: 'Custo por MQL',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 49.18,
        medio: 65.89,
        ruim: 98.50,
        testPropositions: {
          ruim: {
            objetivo: 'Equilibrar volume e qualificação no formulário nativo.',
            hipotese: 'O custo por MQL está alto (≥ R$ 98,50) devido a atrito excessivo nas perguntas ou copy fraca. Simplificando a introdução do formulário e reposicionando a pergunta de renda, o Custo por MQL cairá para < R$ 65,89.',
            variaveis: [
              'Reposicionamento da pergunta de qualificação (renda/faturamento) para etapa intermediária',
              'Tela de apresentação mais envolvente no formulário',
              'Alinhamento exato entre a promessa do criativo e as perguntas do formulário'
            ],
            acaoTatica: 'Subir formulário nativo otimizado em teste A/B com o atual.',
            sprintSugerido: 'Sprint de 5 dias'
          },
          excelente: {
            objetivo: 'Escalar captação de leads qualificados mantendo o CAC no piso histórico.',
            hipotese: 'O criativo e o formulário estão altamente sincronizados (Custo por MQL ≤ R$ 49,18). Escalar o orçamento diário em 25% a cada 3 dias trará maior volume de vendas para a praça.',
            variaveis: [
              'Aumento progressivo de orçamento nos melhores conjuntos',
              'Replicação do anúncio para outras cidades da praça'
            ],
            acaoTatica: 'Escala vertical e horizontal de orçamento.',
            sprintSugerido: 'Escala imediata'
          }
        }
      },
      {
        id: 'cpm',
        name: 'CPM',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 35.78,
        medio: 42.47,
        ruim: 52.80,
        testPropositions: {
          ruim: {
            objetivo: 'Reduzir custo por mil impressões no formulário nativo.',
            hipotese: 'A sobreposição de públicos locais elevou o leilão. Abrindo o público para Advantage+ e testando criativos em carrossel e estático, o CPM cairá para ≤ R$ 42,47.',
            variaveis: [
              'Público Advantage+ com direcionamento detalhado desativado',
              'Variação entre formatos de vídeo e imagem estática'
            ],
            acaoTatica: 'Criar conjunto de público amplo segmentado apenas por raio geográfico.',
            sprintSugerido: 'Sprint de 4 dias'
          },
          excelente: {
            objetivo: 'Aproveitar eficiência de entrega para maximizar volume de preenchimentos.',
            hipotese: 'Excelente entrega do Meta (CPM ≤ R$ 35,78). Acelerar o investimento para capturar leads antes do aumento de concorrência.',
            variaveis: ['Aumento de orçamento e expansão de posicionamentos'],
            acaoTatica: 'Escala imediata de verba.',
            sprintSugerido: 'Escala'
          }
        }
      },
      {
        id: 'cpc',
        name: 'CPC',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 5.02,
        medio: 6.31,
        ruim: 8.16,
        testPropositions: {
          ruim: {
            objetivo: 'Diminuir custo de clique de abertura do formulário.',
            hipotese: 'O anúncio gera pouca urgência de clique. Testando novo botão e texto de chamada claro ("Cadastre-se para garantir vaga gratuita"), o CPC baixará de R$ 8,16 para < R$ 6,31.',
            variaveis: [
              'Chamada imperativa nos últimos 5 segundos',
              'Copy mais curta destacando o benefício imediato da inscrição'
            ],
            acaoTatica: 'Editar os últimos 5 segundos do anúncio.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Acelerar conversão mantendo o tráfego ultra-eficiente.',
            hipotese: 'CPC abaixo de R$ 5,02. Manter criativo ativo e focar na taxa de preenchimento do formulário nativo.',
            variaveis: ['Formulário com preenchimento automático das informações de perfil'],
            acaoTatica: 'Manter criativo com escala de verba.',
            sprintSugerido: 'Sustentação de escala'
          }
        }
      },
      {
        id: 'ctr',
        name: 'CTR (%)',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 0.82,
        medio: 0.65,
        ruim: 0.54,
        testPropositions: {
          ruim: {
            objetivo: 'Aumentar a taxa de clique para o formulário nativo.',
            hipotese: 'O visual do anúncio não se diferencia no feed (CTR ≤ 0,54%). Testando um novo gancho nos primeiros 3 segundos com legenda amarela e corte dinâmico, o CTR superará 0,65%.',
            variaveis: [
              'Legenda dinâmica amarela e preta',
              'Imagem de capa com contraste e pergunta provocativa'
            ],
            acaoTatica: 'Iterar a capa e o primeiro take do criativo.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Replicar a fórmula vencedora de CTR em novos criativos.',
            hipotese: 'CTR elevado (≥ 0,82%). Criar variações mantendo a mesma promessa para evitar saturação precoce.',
            variaveis: ['Gravação de 2 novos vídeos usando o mesmo roteiro estrutural'],
            acaoTatica: 'Produzir variações com o mesmo gancho.',
            sprintSugerido: 'Sprint criativo de 7 dias'
          }
        }
      },
      {
        id: 'hook_rate',
        name: 'Hook Rate',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 24.33,
        medio: 20.38,
        ruim: 17.15,
        testPropositions: {
          ruim: {
            objetivo: 'Aumentar a retenção inicial nos vídeos de GD Formulário.',
            hipotese: 'O início do vídeo está lento (Hook Rate ≤ 17,15%). Removendo introduções genéricas e abrindo com fala provocativa, o Hook Rate subirá para > 20,38%.',
            variaveis: [
              'Abertura direta na dor do público-alvo',
              'Eliminação de pausas ou respiros no início do áudio'
            ],
            acaoTatica: 'Re-editar os primeiros 3 segundos eliminando introdução.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Manter a alta atratividade e conduzir o lead para o formulário.',
            hipotese: 'Retenção excepcional nos 3 primeiros segundos (≥ 24,33%). Garantir que o restante do vídeo direcione com força para a inscrição.',
            variaveis: ['Ajuste da transição entre gancho e CTA'],
            acaoTatica: 'Manter criativo e aumentar verba.',
            sprintSugerido: 'Escala imediata'
          }
        }
      },
      {
        id: 'hook_marcos',
        name: 'Hook Marcos',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 26.99,
        medio: 22.58,
        ruim: 19.22,
        testPropositions: {
          ruim: {
            objetivo: 'Aumentar retenção por alcance único no vídeo do Marcos.',
            hipotese: 'O enquadramento ou frase inicial não parou o feed. Testando formato em primeira pessoa com fala olho no olho, o Hook Marcos superará 22,58%.',
            variaveis: ['Gravação selfie vertical em plano fechado'],
            acaoTatica: 'Substituir os primeiros 3 segundos.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Maximizar volume em torno do criativo mais retentivo.',
            hipotese: 'Hook Marcos ≥ 26,99%. Este anúncio gera altíssima conexão com a audiência e deve ser o principal captador de leads da praça.',
            variaveis: ['Aumento agressivo de orçamento'],
            acaoTatica: 'Elevar para topo de prioridade orçamentária.',
            sprintSugerido: 'Escala imediata'
          }
        }
      }
    ],
    cacScenarios: [
      {
        title: 'Cenário Ruim (Comercial a 2%)',
        status: 'ruim',
        mqlCost: 98.50,
        conversionRate: 2,
        mqlsPerSale: 50,
        cac: 5206.00
      },
      {
        title: 'Cenário Médio (Comercial a 3%)',
        status: 'medio',
        mqlCost: 65.89,
        conversionRate: 3,
        mqlsPerSale: 33.3,
        cac: 2211.00
      },
      {
        title: 'Cenário Excelente (Comercial a 4%)',
        status: 'excelente',
        mqlCost: 49.18,
        conversionRate: 4,
        mqlsPerSale: 25,
        cac: 1236.50
      }
    ]
  },
  'gd-captura': {
    id: 'gd-captura',
    name: 'Geração de Demanda (Página de Captura)',
    shortName: 'GD Captura',
    metrics: [
      {
        id: 'custo_mql',
        name: 'Custo por MQL',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 148.93,
        medio: 225.78,
        ruim: 328.71,
        testPropositions: {
          ruim: {
            objetivo: 'Otimizar conversão do tráfego na página de captura.',
            hipotese: 'A página de captura está com alta rejeição ou desalinhada com os anúncios. Testando formulário na dobra superior (hero section) e headline idêntica ao anúncio, o Custo por MQL cairá para < R$ 225,78.',
            variaveis: [
              'Formulário na primeira dobra da página (sem necessidade de scroll)',
              'Redução de campos no formulário (apenas Nome, WhatsApp e Email)',
              'Prova social com fotos de eventos presenciais do Protagon'
            ],
            acaoTatica: 'Teste A/B de página de captura (Landing Page Hero Form vs Tradicional).',
            sprintSugerido: 'Sprint de 7 dias'
          },
          excelente: {
            objetivo: 'Ampliar escala de tráfego com Custo MQL no topo de performance.',
            hipotese: 'Criativos e página com fit perfeito (Custo por MQL ≤ R$ 148,93). Escalar orçamento diário e testar novos criativos com a mesma narrativa.',
            variaveis: ['Aumento de verba nos criativos de maior conversão de página'],
            acaoTatica: 'Escala progressiva de orçamento.',
            sprintSugerido: 'Escala contínua'
          }
        }
      },
      {
        id: 'conversao_pagina',
        name: 'Conversão da Página (com leads)',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 10.00,
        medio: 6.25,
        ruim: 4.42,
        testPropositions: {
          ruim: {
            objetivo: 'Aumentar taxa de conversão de visitantes em leads.',
            hipotese: 'A taxa de conversão está crítica (≤ 4,42%). Simplificando o layout mobile e reduzindo o tempo de carregamento da página, a conversão subirá acima de 6,25%.',
            variaveis: [
              'Otimização de velocidade de carregamento (imagens WebP, remoção de scripts pesados)',
              'Botão de ação fixo no rodapé para navegação mobile'
            ],
            acaoTatica: 'Deploy de versão leve e limpa da Landing Page.',
            sprintSugerido: 'Sprint de 5 dias'
          },
          excelente: {
            objetivo: 'Manter a página de alta conversão como padrão institucional.',
            hipotese: 'Taxa de conversão superior a 10%. Injetar tráfego qualificado de maior volume.',
            variaveis: ['Direcionar todo o tráfego desta praça para a página vencedora'],
            acaoTatica: 'Consolidar tráfego na página vencedora.',
            sprintSugerido: 'Escala'
          }
        }
      },
      {
        id: 'cpm',
        name: 'CPM',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 34.03,
        medio: 41.73,
        ruim: 54.94,
        testPropositions: {
          ruim: {
            objetivo: 'Reduzir custo de alcance no tráfego direcionado à Landing Page.',
            hipotese: 'Público saturado ou segmentação muito estreita. Abrindo o público para Advantage+ e renovando ganchos, o CPM recuará para < R$ 41,73.',
            variaveis: ['Público aberto com segmentação geográfica ampla'],
            acaoTatica: 'Duplicar conjunto com segmentação ampla.',
            sprintSugerido: 'Sprint de 4 dias'
          },
          excelente: {
            objetivo: 'Aproveitar leilão barato para inundar a página de captura.',
            hipotese: 'CPM ≤ R$ 34,03. Manter conjuntos rodando com verba reforçada.',
            variaveis: ['Aumento de orçamento'],
            acaoTatica: 'Escala imediata.',
            sprintSugerido: 'Escala'
          }
        }
      },
      {
        id: 'cpc',
        name: 'CPC',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 4.83,
        medio: 6.58,
        ruim: 8.55,
        testPropositions: {
          ruim: {
            objetivo: 'Reduzir o custo por visitante enviado à página.',
            hipotese: 'O anúncio não instiga o clique (CPC ≥ R$ 8,55). Inserindo texto imperativo e benefício claro na thumbnail, o CPC baixará para < R$ 6,58.',
            variaveis: ['Thumbnail com promessa clara do Protagon e botão simulado'],
            acaoTatica: 'Ajustar criativos ativos com nova capa.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Manter fluxo abundante de cliques baratos.',
            hipotese: 'CPC ≤ R$ 4,83. Otimizar a velocidade de carregamento para garantir que 100% dos cliques virem pageviews.',
            variaveis: ['Monitoramento de taxa de perda entre clique no link e pageview'],
            acaoTatica: 'Manter criativo ativo.',
            sprintSugerido: 'Escala'
          }
        }
      },
      {
        id: 'ctr',
        name: 'CTR (%)',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 0.82,
        medio: 0.61,
        ruim: 0.50,
        testPropositions: {
          ruim: {
            objetivo: 'Aumentar a taxa de clique nos anúncios direcionados à página.',
            hipotese: 'CTR insatisfatório (≤ 0,50%). Quebrando o padrão visual inicial e usando legendas coloridas, o CTR subirá para > 0,61%.',
            variaveis: ['Gancho visual disruptivo no 1º segundo'],
            acaoTatica: 'Substituir os primeiros 3 segundos.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Replicar estrutura de alto CTR em novos roteiros.',
            hipotese: 'CTR ≥ 0,82%. Replicar a mesma narrativa para novos criativos.',
            variaveis: ['Novas gravações seguindo o mesmo padrão de abertura'],
            acaoTatica: 'Produzir iterações do criativo.',
            sprintSugerido: 'Sprint criativo'
          }
        }
      },
      {
        id: 'hook_rate',
        name: 'Hook Rate',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 17.76,
        medio: 15.72,
        ruim: 13.16,
        testPropositions: {
          ruim: {
            objetivo: 'Elevar retenção nos 3 primeiros segundos.',
            hipotese: 'Abertura fria faz o usuário continuar o scroll. Introduzindo pergunta de impacto nos primeiros frames, o Hook Rate subirá acima de 15,72%.',
            variaveis: ['Frase de impacto inicial com pergunta provocativa'],
            acaoTatica: 'Substituir o primeiro take do criativo.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Escalar criativo retentivo.',
            hipotese: 'Hook Rate ≥ 17,76%. O anúncio prende a atenção com maestria.',
            variaveis: ['Aumento de orçamento'],
            acaoTatica: 'Escala vertical.',
            sprintSugerido: 'Escala imediata'
          }
        }
      },
      {
        id: 'hook_marcos',
        name: 'Hook Marcos',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 21.78,
        medio: 19.22,
        ruim: 16.13,
        testPropositions: {
          ruim: {
            objetivo: 'Melhorar a retenção individual pelo criativo do Marcos.',
            hipotese: 'Abertura perde pessoas nos primeiros segundos. Ajustando enquadramento e corte inicial, o Hook Marcos subirá para > 19,22%.',
            variaveis: ['Corte dinâmico inicial e enquadramento próximo'],
            acaoTatica: 'Re-editar início do vídeo.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Potencializar criativo principal do Marcos.',
            hipotese: 'Hook Marcos ≥ 21,78%. Audiência engajada desde o primeiro instante.',
            variaveis: ['Ampliação de orçamento para este criativo'],
            acaoTatica: 'Priorizar na distribuição de verba.',
            sprintSugerido: 'Escala imediata'
          }
        }
      }
    ],
    cacScenarios: [
      {
        title: 'Cenário Ruim (Comercial a 2%)',
        status: 'ruim',
        mqlCost: 328.71,
        conversionRate: 2,
        mqlsPerSale: 50,
        cac: 16435.50
      },
      {
        title: 'Cenário Médio (Comercial a 3%)',
        status: 'medio',
        mqlCost: 225.78,
        conversionRate: 3,
        mqlsPerSale: 33.3,
        cac: 7526.00
      },
      {
        title: 'Cenário Excelente (Comercial a 4%)',
        status: 'excelente',
        mqlCost: 148.93,
        conversionRate: 4,
        mqlsPerSale: 25,
        cac: 3723.25
      }
    ]
  },
  'meteorico': {
    id: 'meteorico',
    name: 'Meteórico',
    shortName: 'Meteórico',
    metrics: [
      {
        id: 'custo_mql',
        name: 'Custo por MQL',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 0,
        medio: 0,
        ruim: 0,
        available: false,
        note: 'Base de dados retroativa com problema'
      },
      {
        id: 'conversao_pagina',
        name: 'Conversão da Página',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 0,
        medio: 0,
        ruim: 0,
        available: false,
        note: 'Base de dados retroativa com problema'
      },
      {
        id: 'cpm',
        name: 'CPM',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 29.53,
        medio: 35.80,
        ruim: 44.59,
        testPropositions: {
          ruim: {
            objetivo: 'Reduzir custo por mil impressões nas campanhas de grupo VIP.',
            hipotese: 'Público saturado ou sobrecarregado com anúncios da ação relâmpago. Abrindo segmentação e variando os criativos de convite, o CPM cairá para < R$ 35,80.',
            variaveis: ['Segmentação de engajamento amplo nos últimos 90 dias'],
            acaoTatica: 'Ampliar público do conjunto.',
            sprintSugerido: 'Sprint de 3 dias'
          },
          excelente: {
            objetivo: 'Acelerar preenchimento dos grupos de WhatsApp com CPM baixo.',
            hipotese: 'CPM ≤ R$ 29,53. Leilão favorável para encher grupos rapidamente.',
            variaveis: ['Aumento imediato de orçamento'],
            acaoTatica: 'Acelerar veiculação para lotar grupos.',
            sprintSugerido: 'Escala imediata'
          }
        }
      },
      {
        id: 'cpc',
        name: 'CPC',
        unit: 'currency',
        direction: 'lower_is_better',
        excelente: 5.29,
        medio: 6.49,
        ruim: 8.25,
        testPropositions: {
          ruim: {
            objetivo: 'Reduzir custo do clique para entrada no WhatsApp.',
            hipotese: 'A chamada para entrar no grupo não está persuasiva (CPC ≥ R$ 8,25). Adicionando ícone oficial do WhatsApp e texto de urgência ("Condição secreta revelada no grupo"), o CPC cairá para < R$ 6,49.',
            variaveis: [
              'Design com elementos visuais verdes do WhatsApp',
              'Copy enfatizando urgência e vagas limitadas no grupo'
            ],
            acaoTatica: 'Subir criativos com foco visual explícito no WhatsApp.',
            sprintSugerido: 'Sprint de 2 dias'
          },
          excelente: {
            objetivo: 'Manter fluxo intenso de novos membros no grupo.',
            hipotese: 'CPC ≤ R$ 5,29. O interesse na ação meteórica está altíssimo.',
            variaveis: ['Aumento de orçamento'],
            acaoTatica: 'Escalar investimento.',
            sprintSugerido: 'Escala'
          }
        }
      },
      {
        id: 'ctr',
        name: 'CTR (%)',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 0.68,
        medio: 0.55,
        ruim: 0.44,
        testPropositions: {
          ruim: {
            objetivo: 'Aumentar taxa de clique para o grupo VIP.',
            hipotese: 'O anúncio parece propaganda comum e não convite VIP (CTR ≤ 0,44%). Usando imagem tipo print de notificação do WhatsApp, o CTR superará 0,55%.',
            variaveis: ['Visual estilo print de WhatsApp com aviso de nova mensagem'],
            acaoTatica: 'Testar criativo estilo print/notificação.',
            sprintSugerido: 'Sprint de 2 dias'
          },
          excelente: {
            objetivo: 'Replicar criativo de alto CTR em outros formatos.',
            hipotese: 'CTR ≥ 0,68%. Replicar o formato em stories e reels.',
            variaveis: ['Adaptação para formato vertical 9:16'],
            acaoTatica: 'Desdobrar formatos.',
            sprintSugerido: 'Sprint de 2 dias'
          }
        }
      },
      {
        id: 'hook_rate',
        name: 'Hook Rate',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 17.84,
        medio: 14.28,
        ruim: 11.84,
        testPropositions: {
          ruim: {
            objetivo: 'Reter audiência para ouvir o convite do grupo VIP.',
            hipotese: 'Abertura fria (Hook Rate ≤ 11,84%). Usando som de notificação e frase convocatória imediata, o Hook Rate subirá para > 14,28%.',
            variaveis: ['Efeito sonoro de mensagem de WhatsApp no segundo 0'],
            acaoTatica: 'Inserir efeito sonoro e texto animado na abertura.',
            sprintSugerido: 'Sprint de 2 dias'
          },
          excelente: {
            objetivo: 'Escalar convite de alta retenção.',
            hipotese: 'Hook Rate ≥ 17,84%. Criativo prende a atenção de forma impecável.',
            variaveis: ['Aumento de verba'],
            acaoTatica: 'Escala imediata.',
            sprintSugerido: 'Escala'
          }
        }
      },
      {
        id: 'hook_marcos',
        name: 'Hook Marcos',
        unit: 'percent',
        direction: 'higher_is_better',
        excelente: 20.80,
        medio: 17.09,
        ruim: 14.14,
        testPropositions: {
          ruim: {
            objetivo: 'Recuperar retenção inicial do Marcos no convite do Meteórico.',
            hipotese: 'Abertura pouco urgente. Marcos gravando selfie informal chamando diretamente para o grupo elevará o Hook Marcos acima de 17,09%.',
            variaveis: ['Gravação selfie vertical descontraída com chamada direta'],
            acaoTatica: 'Gravar novo take de abertura.',
            sprintSugerido: 'Sprint de 2 dias'
          },
          excelente: {
            objetivo: 'Maximizar o poder de atração do Marcos para o Meteórico.',
            hipotese: 'Hook Marcos ≥ 20,80%. Criativo com altíssima autoridade e apelo.',
            variaveis: ['Alocação preferencial de verba'],
            acaoTatica: 'Tornar anúncio principal da campanha.',
            sprintSugerido: 'Escala imediata'
          }
        }
      }
    ]
  },
  'gd-inlead': {
    id: 'gd-inlead',
    name: 'Geração de Demanda (Inlead)',
    shortName: 'GD Inlead',
    metrics: []
  }
};

FUNNEL_BENCHMARKS['gd-inlead'].metrics = FUNNEL_BENCHMARKS['gd-form'].metrics;
FUNNEL_BENCHMARKS['gd-inlead'].cacScenarios = FUNNEL_BENCHMARKS['gd-form'].cacScenarios;

export type MetricClassification = 'excelente' | 'medio' | 'ruim' | 'nd';

export function classifyMetric(
  metric: BenchmarkMetric,
  value: number | null | undefined
): {
  status: MetricClassification;
  label: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
} {
  if (value === null || value === undefined || isNaN(value) || value <= 0) {
    if (metric.available === false) {
      return {
        status: 'nd',
        label: 'N/D',
        color: 'text-zinc-500',
        badgeBg: 'bg-zinc-800/40',
        badgeBorder: 'border-zinc-700/50',
        badgeText: 'text-zinc-400'
      };
    }
    return {
      status: 'nd',
      label: 'Sem Dados',
      color: 'text-zinc-500',
      badgeBg: 'bg-zinc-800/40',
      badgeBorder: 'border-zinc-700/50',
      badgeText: 'text-zinc-400'
    };
  }

  if (metric.available === false) {
    return {
      status: 'nd',
      label: 'N/D',
      color: 'text-zinc-500',
      badgeBg: 'bg-zinc-800/40',
      badgeBorder: 'border-zinc-700/50',
      badgeText: 'text-zinc-400'
    };
  }

  if (metric.direction === 'lower_is_better') {
    if (value <= metric.excelente) {
      return {
        status: 'excelente',
        label: 'Excelente (Meta Ideal)',
        color: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10',
        badgeBorder: 'border-emerald-500/30',
        badgeText: 'text-emerald-400'
      };
    }
    if (value >= metric.ruim) {
      return {
        status: 'ruim',
        label: 'Ruim (Alerta Crítico)',
        color: 'text-rose-400',
        badgeBg: 'bg-rose-500/10',
        badgeBorder: 'border-rose-500/30',
        badgeText: 'text-rose-400'
      };
    }
    return {
      status: 'medio',
      label: 'Médio (Ponto de Equilíbrio)',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-400'
    };
  } else {
    // Higher is better
    if (value >= metric.excelente) {
      return {
        status: 'excelente',
        label: 'Excelente (Meta Ideal)',
        color: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10',
        badgeBorder: 'border-emerald-500/30',
        badgeText: 'text-emerald-400'
      };
    }
    if (value <= metric.ruim) {
      return {
        status: 'ruim',
        label: 'Ruim (Alerta Crítico)',
        color: 'text-rose-400',
        badgeBg: 'bg-rose-500/10',
        badgeBorder: 'border-rose-500/30',
        badgeText: 'text-rose-400'
      };
    }
    return {
      status: 'medio',
      label: 'Médio (Ponto de Equilíbrio)',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-400'
    };
  }
}
