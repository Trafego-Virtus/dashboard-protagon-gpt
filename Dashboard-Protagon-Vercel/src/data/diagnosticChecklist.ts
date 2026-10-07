export interface DiagnosticGuideItem {
  metricId: string;
  metricName: string;
  category: 'Entrega' | 'Clique' | 'Retenção' | 'Pós-clique' | 'Qualidade';
  ruim: {
    title: string;
    investigar: string[];
    hipotesePadrao: string;
    acaoPadrao: string;
    regraLeitura?: string;
  };
  excelente: {
    title: string;
    investigar: string[];
    hipotesePadrao: string;
    acaoPadrao: string;
    regraLeitura?: string;
  };
}

export const DIAGNOSTIC_CHECKLIST_CONFIG: Record<string, DiagnosticGuideItem> = {
  'cpm': {
    metricId: 'cpm',
    metricName: 'CPM (Custo por Mil Impressões)',
    category: 'Entrega',
    ruim: {
      title: 'CPM Alto Demais — O que investigar:',
      investigar: [
        'É possível aumentar o número de cidades abrangidas?',
        'Os criativos estão falando para um público restrito demais? A comunicação pode ser ampliada?',
        'Existe alguma exclusão de público reduzindo demais o tamanho inicial da audiência?',
        'Os posicionamentos foram restringidos em excesso?',
        'Se houver margem operacional, faz sentido desacelerar o investimento para tentar reduzir o CPM e melhorar as métricas derivadas dele?'
      ],
      hipotesePadrao: 'O leilão está sobrecarregado por restrição excessiva de cidades/públicos ou saturação de frequência.',
      acaoPadrao: 'Ampliar abrangência geográfica da praça, desmarcar restrições de posicionamento e testar público Advantage+.',
      regraLeitura: 'CPM sozinho não explica performance. Sempre conecte o custo de entrega com CTR, CPC, qualidade do tráfego e estágio do funil.'
    },
    excelente: {
      title: 'CPM Baixo Demais — O que investigar:',
      investigar: [
        'A campanha está entregando principalmente em posicionamentos Advantage / Audience Network / apps?',
        'A conversão está configurada corretamente ou existe outra conversão levando a entrega para posicionamentos mais baratos?',
        'Os criativos estão excessivamente "clickbait"? A qualificação desses criativos já foi verificada?'
      ],
      hipotesePadrao: 'Entrega barata em posicionamentos de baixa qualidade ou volume atípico sem intenção real de compra.',
      acaoPadrao: 'Validar conversões no gerenciador de eventos e auditar posicionamentos (Stories/Feed vs Audience Network).',
      regraLeitura: 'CPM muito baixo pode significar entrega em redes periféricas sem engajamento qualificado.'
    }
  },
  'ctr': {
    metricId: 'ctr',
    metricName: 'CTR (%) — Atratividade do Anúncio',
    category: 'Clique',
    ruim: {
      title: 'CTR Baixo Demais — O que investigar:',
      investigar: [
        'A promessa está sendo comunicada e explicada com clareza?',
        'O criativo demora demais para deixar claro o que está sendo ofertado?',
        'Esse criativo realmente deveria ter CTR alto ou é um criativo mais fundo de funil, com tendência natural a menos cliques? Ex.: filtro de renda alta ou profissão muito específica.',
        'Como o mesmo tema poderia ser explicado de uma forma mais atraente?',
        'Existe alguma funcionalidade Advantage ligada que possa estar prejudicando a experiência?',
        'É possível mapear novas palavras-chave — como "prosperidade" e "renda" — na biblioteca para trazer referências ao estrategista?'
      ],
      hipotesePadrao: 'A promessa inicial está confusa ou o criativo demora muito para entregar o valor central, perdendo o clique.',
      acaoPadrao: 'Reformular o primeiro terço do criativo, testar headline direta com contraste e mapear novas palavras-chave na biblioteca.',
      regraLeitura: 'Avalie se o criativo é topo de funil (deve ter CTR alto) ou qualificador de renda (naturalmente menor).'
    },
    excelente: {
      title: 'CTR Alto Demais — O que investigar:',
      investigar: [
        'Assista ao criativo completo: existe alguma interpretação alternativa que esteja levando pessoas a clicar pelo motivo errado?',
        'A página está convertendo ou apenas recebendo muito tráfego?',
        'Analise imediatamente a pesquisa e a qualidade dos leads vindos desses criativos.'
      ],
      hipotesePadrao: 'Criativo com altíssima atratividade. Necessário confirmar se os cliques convertem em leads e vendas reais.',
      acaoPadrao: 'Checar connect rate e taxa de conversão da página; se qualificado, escalar orçamento horizontalmente.',
      regraLeitura: 'CTR alto só é vitória se gerar MQL e ingresso vendido; caso contrário, é clique por curiosidade ou engano.'
    }
  },
  'cpc': {
    metricId: 'cpc',
    metricName: 'CPC — Custo por Clique',
    category: 'Clique',
    ruim: {
      title: 'CPC Alto Demais — Retorne à causa:',
      investigar: [
        'Identifique se o maior impacto veio do CPM (leilão caro) ou do CTR (baixa atratividade).',
        'Se veio do CPM: revisar públicos, cidades e posicionamentos.',
        'Se veio do CTR: revisar promessa, clareza e chamada para ação (CTA).'
      ],
      hipotesePadrao: 'CPC elevado decorre de CPM alto no leilão ou CTR reprimido por falta de clareza na oferta.',
      acaoPadrao: 'Isolar a causa raiz (CPM vs CTR) e aplicar o teste correspondente de público ou novo gancho.',
      regraLeitura: 'O CPC é uma métrica derivada da relação matemática direta entre CPM e CTR.'
    },
    excelente: {
      title: 'CPC Baixo Demais — O que investigar:',
      investigar: [
        'O clique barato está vindo de posicionamentos de baixo valor (Audience Network)?',
        'Os cliques estão se transformando em pageviews (Connect Rate ≥ 70%)?',
        'O lead gerado tem a renda mínima esperada para o Protagon?'
      ],
      hipotesePadrao: 'Criativo com forte apelo visual gerando tráfego muito barato.',
      acaoPadrao: 'Acelerar veiculação e monitorar conversão pós-clique.',
      regraLeitura: 'Verifique se o volume de cliques baratos avança no funil comercial.'
    }
  },
  'hook_rate': {
    metricId: 'hook_rate',
    metricName: 'Hook Rate (3 Primeiros Segundos)',
    category: 'Retenção',
    ruim: {
      title: 'Hook Rate Baixo Demais — O que investigar:',
      investigar: [
        'O início do criativo parece apenas "mais um anúncio", sem estímulo visual disruptivo e alinhado ao público?',
        'Se o MQL ainda está dentro do esperado, dá para usar como referência hooks de criativos com bom Hook Rate e testar uma troca de abertura?',
        'Um efeito visual simples, lettering inicial, som ou zoom-in pode melhorar a retenção?',
        'A copy atrelada ao hook faz sentido para a oferta ou captação atual?'
      ],
      hipotesePadrao: 'Abertura comum ou estática sem interrupção de padrão visual faz o lead rolar o feed sem prestar atenção.',
      acaoPadrao: 'Gravar/editar 3 novos inícios de 3 segundos com lettering contrastante, zoom-in e efeito sonoro.',
      regraLeitura: 'Trocar o hook de um criativo com bom miolo é o teste mais rápido e barato para recuperar performance.'
    },
    excelente: {
      title: 'Hook Rate Alto Demais — O que investigar:',
      investigar: [
        'Estamos chamando atenção pelo fator correto?',
        'O MQL também está muito baixo neste criativo? Se sim, envolver Laio / Júlia para entender o avanço dessas pessoas no funil.',
        'Esse criativo historicamente se comporta assim? Se não, verifique o detalhamento por posicionamento para identificar entregas atípicas.',
        'Existe oportunidade de manter a força do hook e adicionar uma qualificadora? Ex.: "VÍDEO SOMENTE PARA RECÉM-CASADOS".'
      ],
      hipotesePadrao: 'O início fisga com extrema eficiência. Avaliar se o gancho qualifica ou atrai curiosos genéricos.',
      acaoPadrao: 'Manter a força do hook e testar versão com frase qualificadora antes da oferta.',
      regraLeitura: 'Atenção sem qualificação gera leads frios. Conecte o hook com a pesquisa de renda.'
    }
  },
  'hook_marcos': {
    metricId: 'hook_marcos',
    metricName: 'Hook Marcos — Progressão da Mensagem',
    category: 'Retenção',
    ruim: {
      title: 'Hook Marcos Baixo Demais — O que investigar:',
      investigar: [
        'A copy tem uma progressão lógica e coerente dentro do criativo?',
        'O hook inicial gera uma quebra de expectativa e atrai pelo motivo errado?',
        'Faz sentido reduzir a copy ou trazer uma explicação mais clara logo no início — em outras palavras, "enrolar menos"?'
      ],
      hipotesePadrao: 'Desalinhamento entre a promessa inicial do Marcos e o desenrolar da fala nos segundos seguintes.',
      acaoPadrao: 'Corte rápido no primeiro take para "enrolar menos" e ir direto ao ponto da transformação do Protagon.',
      regraLeitura: 'Hook forte + queda rápida nos marcos indica que a abertura prometeu algo que o vídeo não entregou de imediato.'
    },
    excelente: {
      title: 'Hook Marcos Excelente — O que investigar:',
      investigar: [
        'A narrativa do Marcos reteve pessoas únicas em alto nível.',
        'O criativo tem CTA clara no final para garantir que a retenção vire conversão?',
        'Vale a pena desdobrar o roteiro deste criativo em variações de cenário?'
      ],
      hipotesePadrao: 'A autoridade e clareza do Marcos neste vídeo criaram conexão imediata com o público.',
      acaoPadrao: 'Escalar orçamento deste criativo e usá-lo como base para novas gravações.',
      regraLeitura: 'Criativo com alta retenção de público único deve ser protegido e receber orçamento prioritário.'
    }
  },
  'conversao_pagina': {
    metricId: 'conversao_pagina',
    metricName: 'Pós-Clique & Conversão de Página',
    category: 'Pós-clique',
    ruim: {
      title: 'Página Convertendo Pouco — Se as outras métricas parecem boas:',
      investigar: [
        'Connect Rate abaixo de 70%? A página está carregando rápido no celular (PageSpeed / imagens WebP)?',
        'O Tag Manager e o pixel estão instalados e disparando corretamente?',
        'Isso acontece em todos os criativos ou apenas em alguns? Se for pontual, existe alinhamento entre a promessa do anúncio e a oferta da página?',
        'Todos os botões estão funcionando e levando para os destinos corretos?',
        'A página contém depoimentos, explicação clara do público-alvo e uma headline compreensível na primeira dobra?',
        'Vale investigar no Clarita se existe alguma dobra com perda muito alta de pessoas?',
        'Existem prints de WhatsApp ou elementos visuais que possam induzir a pessoa a clicar no lugar errado?'
      ],
      hipotesePadrao: 'Fricção técnica no carregamento, quebra de expectativa entre anúncio e página ou ausência de prova social na 1ª dobra.',
      acaoPadrao: 'Auditar PageSpeed mobile, garantir imagens em WebP e posicionar headline + formulário claros na 1ª dobra.',
      regraLeitura: 'Se o anúncio tem bom CTR mas a página não converte, o problema quase sempre está no pós-clique.'
    },
    excelente: {
      title: 'Página Convertendo com Alta Eficiência — O que investigar:',
      investigar: [
        'Qual elemento da página está gerando maior taxa de preenchimento?',
        'Os leads estão avançando para a equipe comercial ou checkout?',
        'Essa página pode ser replicada para as demais praças do Protagon?'
      ],
      hipotesePadrao: 'Alinhamento impecável entre a promessa do anúncio e a proposta de valor da landing page.',
      acaoPadrao: 'Padronizar esta estrutura de página para os demais funis e praças.',
      regraLeitura: 'Página validada acima de 10% de conversão deve ser a página padrão de tráfego.'
    }
  },
  'custo_mql': {
    metricId: 'custo_mql',
    metricName: 'Custo por MQL (Qualidade + Eficiência)',
    category: 'Qualidade',
    ruim: {
      title: 'Custo por MQL Alto Demais — O que investigar:',
      investigar: [
        'Se o criativo tem histórico positivo, existem argumentos para tentar melhorar CTR e Hook Rate usando as ações anteriores?',
        'Se o histórico é bom, é possível reaproveitar somente o hook ou a estrutura e regravar em outro cenário?',
        'É possível reduzir um pouco a verba para testar se o criativo volta a apresentar boas métricas?',
        'O lead está desistindo na pesquisa de qualificação ou o formulário está longo demais?'
      ],
      hipotesePadrao: 'Atrito no formulário ou perda de eficiência no topo do funil (CTR/Hook) encarecendo o lead qualificado.',
      acaoPadrao: 'Se o histórico for bom, regravar novo gancho; se o criativo for novo, reduzir verba e simplificar etapas do formulário.',
      regraLeitura: 'Custo alto não é automaticamente ruim se o lead fechar ingressos de maior ticket; avalie junto com vendas.'
    },
    excelente: {
      title: 'Custo por MQL Baixo Demais — O que investigar:',
      investigar: [
        'Avalie qual variável do processo pode estar contribuindo mais para o resultado.',
        'Se estiver baixo demais, analise imediatamente a pesquisa e a qualidade do criativo e, se necessário, solicite apoio de Laio, Júlia ou do estrategista.',
        'Se tudo estiver alinhado e a pesquisa não indicar problemas relevantes, trate o criativo como candidato à escala.'
      ],
      hipotesePadrao: 'Criativo com fit perfeito de mensagem e público, gerando MQLs qualificados a custo mínimo.',
      acaoPadrao: 'Validar renda na pesquisa e, se confirmado avanço positivo com o comercial, escalar orçamento verticalmente.',
      regraLeitura: 'Custo baixo só é comemorado após validação da pesquisa de renda e avanço no funil.'
    }
  }
};
