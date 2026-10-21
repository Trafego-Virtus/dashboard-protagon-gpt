# Falhas intermitentes — 21/10/2026

## Evidências antes da correção

Projeto `oogehvamgxiagmfgejpu`, repositório em `9a6ca4e`.
Captura do usuário: Joinville, erro genérico ao carregar leads.

- Logs PostgreSQL entre 12:00 e 12:10 UTC: timeouts `57014` na leitura de snapshots, nas leituras de tráfego, na preparação de Porto Alegre e em dezenas de chamadas `n8n_importar_trafego_novos`.
- Nas 18 horas anteriores a 12:16 UTC: Porto Alegre teve 13 falhas e 23 sucessos; Goiânia, 5 falhas e 31 sucessos; Joinville e São Paulo, 36 sucessos cada. As falhas se concentram em `:05`/`:10`, sobrepondo a importação horária.
- Vários timeouts da importação ocorreram enquanto ela aguardava o advisory lock da mesma tabela. Outros ocorreram no UPDATE/INSERT. A saturação afeta também consultas do Table Editor.
- A automação anexada inicia um lote de 500 registros a cada 250 ms. No código oficial do HTTP Request V3 do n8n, esse intervalo espaça o início das requisições; as respostas são aguardadas conjuntamente depois. Portanto, `batchSize=1` nesse nó não limita a uma requisição em andamento.
- O dashboard consultava novamente todas as páginas a cada atualização e acesso. O limite de três requisições era apenas por navegador. Não havia reaproveitamento de respostas no servidor.
- As tabelas de tráfego têm PK `(Data, ID CAMPANHA, ID CONJUNTO, ID ANÚNCIO)`, mas a API ordenava por metadados de origem sem índice correspondente. O plano da nova leitura de Joinville/MET usou essa PK, sem sort, com 1.000 registros em aproximadamente 144 ms na amostra.
- Banco `postgres` com aproximadamente 306,8 MB; o backup removido em 20/10 não foi recriado. A amostra de conexões não tinha bloqueios. Não foi medida a memória, swap ou I/O atuais; não atribuir os números históricos de 20/10 ao estado de hoje.

As evidências apontam para concorrência e carga no banco, agravadas por consultas repetidas. Não foi encontrado fallback de leads/tráfego para Sheets quando o Supabase falha. As planilhas de ingressos, cadeiras, Sendflow e funis perpétuos continuam intencionais.

## Correções

- API: cache privado em memória por instância, limitado a 32 MiB de JSON; 30 s para a página inicial, até 5 min para páginas de uma versão imutável e 60 s para tráfego. Requisições idênticas simultâneas compartilham uma consulta. Erros não são armazenados. Continua `Cache-Control: no-store`, sem cache público/CDN nem persistência de leads no navegador.
- Cache de versões respeita a idade da fonte e o prazo de retirada informado pelo RPC. O cache não renova `sourceUpdatedAt`.
- Navegador: verifica a versão atual na primeira página e reaproveita o conjunto completo quando ela não mudou. Uma atualização de Joinville com a mesma versão passa de 25 consultas de leads para uma; versões novas continuam sendo lidas integralmente. Solicitações simultâneas da mesma praça compartilham o carregamento em andamento.
- Tráfego: ordenação pela chave primária existente, única e determinística, sem criar índices ou ocupar mais espaço.
- Vercel: região `gru1`, junto ao banco em São Paulo, em vez do `iad1` observado na resposta anterior.
- Diagnóstico: erros têm identificador e logs com praça, conjunto, status/código e duração, sem registros, corpos do Supabase ou credenciais.
- RPC de leitura: mantém a última versão completa disponível para novos carregamentos por até 90 minutos; aviso amarelo no dashboard depois de 45 minutos com o horário real da fonte. Páginas já iniciadas têm limite de 105 minutos e continuam sujeitas à retirada 15 minutos após substituição. Esses limites não alteram a frequência de atualização e não transformam uma preparação fracassada em sucesso.

Nenhuma alteração nos dados de origem, nas quatro views, na rotina de classificação, na função de importação de tráfego ou no Postgres interno. A reconstrução dos snapshots ainda consulta integralmente as views; não foi implementada atualização incremental sem um contrato confiável de alterações/exclusões.

Uma tentativa de avaliar uma otimização a partir da definição da view foi rejeitada pela revisão automática por executar diretamente a tabela excluída `registros_leads_dedup`. Não foi executada nem contornada. A leitura autorizada da view continua disponível; otimizações que exijam acessar a tabela-base dependem de autorização específica.

## Automação: pronta, ainda não ativada

Arquivo: `automations/protagon-trafego-sequencial.json`.
Mantém os mesmos códigos de preparação, destinos, lotes, resumo e agendamento horário. Acrescenta um `Loop Over Items` de um item, ligado ao HTTP e a uma pausa de um segundo antes de continuar. Assim, o próximo lote só começa após a resposta do anterior. Exportado inativo, sem credenciais nem dados fixados.

Não há conexão com o n8n nesta sessão. A automação ativa não foi modificada; a carga horária pode continuar até sua substituição. Não é possível garantir a eliminação dos erros enquanto esse fator persistir. Ver `automations/README.md`.

## Verificação

41 testes TypeScript/React aprovados; typecheck e build aprovados. Testes PostgreSQL com tabelas temporárias sintéticas cobrem preservação dos 27 campos, versões completas, atualização/remoção/mudança de praça, rollback, reutilização de páginas, expiração e aviso de atraso. Esses testes não acessam dados reais de leads.

Operação aplicada: `allow_complete_snapshot_during_short_refresh_delay` por `apply_migration`, após `verify_snapshot_delay_with_temporary_fixtures`. O RPC foi consultado nas quatro praças e retornou páginas de 1.000 linhas, totais e timestamps válidos. Os jobs continuam ativos com `0,30`, `5,35`, `10,40`, `15,45` por hora.

As primeiras tentativas de aplicar os testes falharam no conector com `Invalid or expired requestState`, sem alteração registrada. Após a execução efetiva, um teste precisou reconhecer o novo metadado mutável `versionExpiresAt`; a comparação integral do conteúdo e dos demais metadados foi preservada, e a suíte passou.

O conector Vercel recusou acesso administrativo por falta de escopo da equipe. A verificação de publicação utiliza o status do commit no GitHub e requisições à produção, além da tela no navegador.

Referências: [HTTP Request V3](https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts), [região das funções Vercel](https://vercel.com/docs/functions/configuring-functions/region).
