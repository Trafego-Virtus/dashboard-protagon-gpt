# Dashboard Protagon — GitHub e Vercel

Aplicativo React/TypeScript com o visual e os recursos do arquivo
`Dashboard-Protagon-Novo-main(1).zip`. Inclui visão geral, Geração de Demanda,
Venda Direta, Distribuição de Conteúdo, Meteórico, funis perpétuos, relatórios,
previsões, pesquisa de audiência, feedbacks de KPIs e testes.

A atualização incorpora funis do Meteórico por página, filtro de campanhas de
escala/teste, públicos, lista de leads e métricas de grupos do Sendflow.

## Supabase — leads e tráfego das praças

A integração usa o projeto **Dashboard Tráfego** (`oogehvamgxiagmfgejpu`), schema
`public`, por uma API no servidor. A migração é ativada quando
`SUPABASE_SECRET_KEY` estiver configurada. Sem essa variável, o dashboard mantém
as fontes publicadas que já funcionavam.

| Praça | View de leads | Prefixo das tabelas de tráfego |
| --- | --- | --- |
| Joinville | `leads_protagon_joinville` | `trafego_protagon_joinville_` |
| Porto Alegre | `leads_protagon_porto_alegre` | `trafego_protagon_porto_alegre_` |
| Goiânia | `leads_protagon_goiania` | `trafego_protagon_goiania_` |
| São Paulo | `leads_protagon_sao_paulo` | `trafego_protagon_sao_paulo_` |

Para cada praça, são consultados os sufixos `gd`, `vd`, `met`, `dc`,
`dc_corredor_polones` e `workshop`. A visualização Workshop permanece removida;
essa tabela mantém o histórico de tráfego usado nos cálculos existentes.

- A API aceita somente as 28 fontes dessa lista. Não consulta diretamente
  `registro_leads_dedup` nem `registros_leads_dedup`, nem permite informar tabelas
  arbitrárias. As views existentes mantêm suas definições e dependências.
- `trafego_protagon_revisao` é uma área de revisão de importação e não compõe métricas.
- A leitura é paginada, inclusive quando o limite de linhas da API for inferior
  ao tamanho solicitado. Os registros excluídos e de teste são desconsiderados.
- Os timestamps dos leads são convertidos para o dia em São Paulo. Os valores
  numéricos de investimento são preservados, assim como a reconciliação por
  contato/funil e as regras de MQL existentes.
- As views atuais não fornecem `Atribuição`/`Subfunil`. O adaptador reconhece
  sinais explícitos de funil na campanha, ação, URL, tags e tipo de ingestão;
  quando necessário, cruza campanhas com as tabelas de tráfego. Um código de
  evento sozinho não define o funil. Sem evidência, não inventa uma atribuição.
- Com Supabase ativado, falhas de leitura exibem erro. Não há troca silenciosa
  para as planilhas nem soma dos leads de duas fontes.
- **Cuiabá, Teto Invisível - Webinário/PRO-WEB, Quiz, Guardiões, ingressos,
  cadeiras e Sendflow** continuam nas fontes existentes, pois não há fontes
  correspondentes disponíveis no Supabase para migrá-los. A regra de ingressos
  e cadeiras de São Paulo/Goiânia continua preservada.

### Ativar em produção

1. No projeto Supabase **Dashboard Tráfego**, abra **Settings → API Keys** e
   obtenha uma chave **secret** do servidor (`sb_secret_...`).
2. No projeto Vercel **dashboard-protagon-gpt**, abra **Settings → Environment
   Variables**, adicione `SUPABASE_SECRET_KEY` no ambiente **Production** e faça
   **Redeploy**. Configure Preview separadamente se precisar validar nesse ambiente.
3. Confira `/api/supabase?config=1`: deve retornar `{"enabled":true}`. Depois,
   atualize o dashboard e confira uma praça e período conhecidos. Essa resposta
   indica configuração presente; a leitura de dados confirma se a chave é válida.

A chave fica somente no servidor, sem prefixo `VITE_`, e não deve ser inserida
no código ou no GitHub. A chave legada `service_role` também é aceita em
`SUPABASE_SERVICE_ROLE_KEY`. As permissões/RLS do banco não são alteradas.
Para reverter temporariamente às fontes anteriores, configure
`SUPABASE_ENABLED=false` e publique novamente.

O fluxo das quatro praças ativadas é: Supabase → `/api/supabase` → adaptação dos
campos → filtros de período → cálculos → componentes. A atualização manual e a
reconsulta a cada cinco minutos leem o estado atual do banco; a importação e
atualização das tabelas no Supabase continuam sob responsabilidade do processo
que já as alimenta.

## Fontes anteriores de leads — Google Sheets

As quatro URLs publicadas enviadas pelo usuário já estavam no ZIP. O problema
estava no identificador da aba: `gid=0` passou a ser **OFF - GERAL**.
Os novos identificadores foram conferidos no Google Sheets e na publicação web:

| Praça | Planilha | Aba | gid |
| --- | --- | --- | --- |
| Joinville | PRO-JV-035 | GERAL | 1372087036 |
| Porto Alegre | PRO-POA-037 | GERAL | 1846123823 |
| Goiânia | PRO-E038-GOI | GERAL | 1301297577 |
| São Paulo | PRO-039-SP | GERAL | 1309336900 |

- `src/utils/dashboardSources.ts` centraliza as URLs para os dois leitores do app.
- `dataFetching.ts` consulta o índice publicado e seleciona a aba de nome exato
  **GERAL**. A aba OFF - GERAL nunca é combinada com ela.
- Se o índice estiver indisponível, usa o ID conferido acima. Se o índice estiver
  legível e GERAL não estiver publicada, exibe um erro explicativo.
- A leitura usa nomes de cabeçalhos; `Atribuição` e `Subfunil` podem estar em
  posições diferentes da planilha antiga. As novas colunas AF/AG são reconhecidas.
- Os leads vêm da GERAL, sem acrescentar as exportações auxiliares antigas de
  formulário nativo. A reconciliação de duplicados por contato e funil foi mantida.
- A atribuição explícita da GERAL tem prioridade. Um código de evento isolado
  (PRO-E038-GOI/PRO-E039-SP) não transforma um lead de GD em Meteórico.
- Conforme o ZIP, no Meteórico a qualificação considera renda acima de R$ 5.000
  ou `clint=SIM`; nos demais funis a regra existente de `clint=SIM` foi preservada.
- A regra do ZIP que zera ingressos/cadeiras de São Paulo e Goiânia foi mantida.
- As demais fontes das praças do ZIP, incluindo Cuiabá, foram mantidas.

Quando Supabase não está ativado, o fluxo é: Google Sheets publicado → `/api/csv` → leitura dos cabeçalhos e
normalização → filtros de período → cálculos → componentes do dashboard.
O Firebase continua atendendo às configurações e aos testes do aplicativo.

## Teto Invisível - Webinário — PRO-WEB

A tela **Funis Perpétuos → Teto Invisível - Webinário** usa a
[PRO-WEB publicada](https://docs.google.com/spreadsheets/d/e/2PACX-1vQjF-PCNOqWQZe3Ufy8xE0nhWslTONvTtDlK3DPjQVzeXRqxgrjQkEQst5N-tb7yxCQ0Xq1ieeOHhTn/pubhtml),
sem agregar os leads ou anúncios das planilhas das praças.

| Dados | Aba PRO-WEB | gid verificado |
| --- | --- | --- |
| Leads e pesquisa de audiência | GERAL | 0 |
| Investimento, criativos e páginas | MetaAds_Dados_Performance_webinario | 680936326 |
| Cruzamento de inscritos no quiz | INSCRITOS QUIZ | 1711648297 |

- `webinarioData.ts` descobre os IDs pelo nome das abas e usa os IDs conferidos
  caso o índice publicado esteja indisponível. GERAL é selecionada por nome exato.
- A nova GERAL usa `id_pessoa`; UUID não é obrigatório. A reconciliação por
  e-mail/telefone foi mantida; registros excluídos (`deleted=1`) e testes são ignorados.
- Como `praca` e `Atribuição` estão vazias na fonte atual, a praça é identificada
  pela campanha/conjunto do lead ou por uma campanha de anúncios com praça única.
  Campanhas ambíguas ficam em Geral; leads sem campanha ficam em Orgânico.
  Uma atribuição explícita na planilha tem prioridade quando preenchida.
- A regra existente de MQL por faixa de renda foi preservada. INSCRITOS QUIZ
  apenas cruza e-mails com os leads da GERAL; não acrescenta leads ao total.
- A PRO-WEB não publica ingressos. As vendas continuam vindo apenas das abas de
  ingressos de Joinville, Cuiabá e Porto Alegre, filtradas pela atribuição Webinário.
  A regra existente de São Paulo/Goiânia permanece. Nenhuma GERAL das praças é
  consultada pela tela de Teto Invisível - Webinário.
- Falhas de leitura exibem uma mensagem e opção de tentar novamente.
  O botão de atualização consulta os dados publicados sem cache local.

## Publicar na Vercel

O aplicativo permanece na subpasta existente do repositório. Ao importar
`Trafego-Virtus/dashboard-protagon-gpt`, use:

| Configuração | Valor |
| --- | --- |
| Root Directory | `Dashboard-Protagon-Vercel` |
| Framework | Vite |
| Install Command | `bun install --frozen-lockfile` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 22.x |

A API em `api/csv.ts` aceita somente as planilhas publicadas configuradas no app,
comprime os CSVs e sinaliza falhas em vez de retornar silenciosamente zero.
As configurações existentes de Firebase e Vercel foram preservadas.
Não é necessária chave Gemini para ler as planilhas.

## Executar e validar

```sh
cd Dashboard-Protagon-Vercel
bun install --frozen-lockfile
npm run dev
```

Para usar Supabase localmente, copie `.env.example` para `.env` nessa pasta e
configure a chave do servidor antes de executar `npm run dev`.

Abra `http://localhost:3000`. Para validar e executar o build:

```sh
npm run lint
npm test
npm run build
npm run preview
```

O dashboard permite atualização manual e reconsulta a cada cinco minutos enquanto
está visível. A publicação do Google Sheets também pode ter atraso próprio.
Os testes cobrem seleção da GERAL, exclusão da aba antiga, cabeçalhos, contagens,
atribuição, filtros de criativos, cache, paginação Supabase, seleção de fontes,
datas, valores numéricos e falhas das APIs. Usam dados sintéticos;
as bases de leads e os arquivos temporários do ZIP não fazem parte do código.
