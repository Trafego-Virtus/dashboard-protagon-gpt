# Recuperação autorizada — 20/10/2026

Projeto `oogehvamgxiagmfgejpu`, repositório `Trafego-Virtus/dashboard-protagon-gpt`.
Este registro complementa a auditoria das 13h34–13h40 de Brasília; os estados
anteriores nela descritos não representam a configuração após esta recuperação.

## Escopo confirmado

O usuário autorizou as correções e forneceu os dois workflows ativos, mas não
autorizou acesso ao PostgreSQL interno. Nenhuma consulta foi feita nessa origem.
O backup de importação foi preservado. Não foram alterados os importadores do n8n,
as views de classificação, a tabela de leads excluída do escopo ou suas permissões.

A pausa dos quatro jobs havia sido feita neste chat para conter as consultas
recorrentes durante os timeouts. Os horários de 30 minutos já estavam configurados
quando foram pausados. A recuperação manteve os jobs inativos até validar as
quatro praças, sem confundir job ativo com execução bem-sucedida.

## Automações ativas recebidas

- `[ON] [RETRO] Leads Postgres → Supabase | Somente novos`: intervalo real de
  **30 minutos**, apesar do nome antigo do nó dizer 15. Consulta faixas de IDs
  ausentes, lê até 1000 registros da origem por execução, valida o lote e insere
  com `on_conflict=id` e `resolution=ignore-duplicates`. Pode recuperar inclusões
  ausentes que ainda existam na origem; não atualiza IDs existentes nem propaga
  suas exclusões posteriores. Não é uma garantia de reconstrução do backup.
- `Protagon | Trafego Sheets → Supabase | Novos + hoje e ontem`: agendamento por
  hora, lotes de 500, validação e fila de revisão. A função vigente
  `n8n_importar_trafego_novos` insere chaves novas, atualiza registros existentes
  somente de hoje/ontem no fuso de São Paulo e apenas quando os campos diferem.
  Correções históricas fora dessa janela e exclusões não são propagadas pelo fluxo.

Os arquivos foram inspecionados sem publicar credenciais ou registros pessoais.
A consulta interna, execução e recomposição do PostgreSQL oficial não foram testadas.

## Alterações aplicadas

- `20261020171745_verify_dashboard_snapshot_reuse`: testes em objetos temporários
  e dados fictícios, sem criar tabelas persistentes de teste.
- `20261020171839_dashboard_snapshot_page_reuse_30min`: implementação em
  `supabase/operations/recover_snapshot_refresh.sql`.
- Manifestos pequenos passam a referenciar páginas imutáveis existentes. A comparação
  exata dos 27 campos evita regravar páginas iguais. Inclusões com IDs antigos,
  alterações, exclusões e movimentações já refletidas nas views continuam detectadas.
- Publicação atômica de versão, contagem e horário. Uma falha não renova a validade.
  As respostas mantêm o contrato anterior, incluindo versão fixada em todas as páginas.
- Validade de 45 minutos para iniciar uma carga; até 60 para páginas fixadas.
  A versão substituída expira em 15 minutos. A limpeza elimina páginas apenas
  quando nenhum manifesto as referencia.
- Bloqueio global impede preparações simultâneas. O cron define limite explícito
  de 90 segundos, sem ampliar timeouts de outros usuários ou processos.
- Índice da referência de payload auxilia as consultas e a limpeza. Nenhum índice
  foi criado na tabela de origem excluída do escopo.
- Texto do dashboard passa a informar a preparação a cada 30 minutos.

A melhoria reduz regravações, mas não elimina a leitura/classificação completa da
origem. Não foi adotado incremental por data/ID sem cobertura comprovada de edições
ou exclusões. Não foi executado `VACUUM FULL`, reinício do banco ou exclusão do backup.

## Medições na recuperação manual

Atualizações sequenciais, entre 14h19 e 14h21 de Brasília. Contagens representam
registros das views antes da normalização/deduplicação do dashboard.

| Praça | Registros | Páginas | Reutilizadas | Novas | Preparação |
| --- | ---: | ---: | ---: | ---: | ---: |
| Porto Alegre | 11790 | 12 | 11 | 1 | 29,01 s |
| Goiânia | 5319 | 6 | 5 | 1 | 21,25 s |
| São Paulo | 6014 | 7 | 5 | 2 | 20,06 s |
| Joinville | 24478 | 25 | 24 | 1 | 20,45 s |

45 de 50 páginas foram reutilizadas. O conteúdo armazenado das páginas atuais
somou 9.116.573 bytes; os cinco payloads novos, 834.119 bytes. Esses tamanhos não
medem WAL, leituras, índices, swap ou o consumo total de I/O. O banco `postgres`
continuava com cerca de 508,3 MB logo após a recuperação. Remover gerações de cache
não garante redução física imediata do tamanho do banco.

## Verificação

Passaram os 36 testes do aplicativo, TypeScript e build. Os testes SQL verificaram
igualdade dos 27 campos, nulos, ordem, contagem, paginação, reaproveitamento integral,
edição de uma página, inclusão, ID antigo, exclusão lógica/física, movimentação de
praça, falha de fonte, versões simultâneas, expiração, limpeza com páginas compartilhadas
e praça vazia. Foram executados no PostgreSQL, usando apenas fixtures temporárias.

As permissões foram conferidas: `anon`/`authenticated` não leem os manifestos;
`service_role` somente lê, não grava nem dispara a preparação. O Advisor de segurança
retornou apenas avisos informativos de RLS sem políticas, intencionais nas tabelas
acessadas exclusivamente pelo servidor. Não foram criadas políticas públicas para
silenciar esses avisos ([referência do Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).

## Retomada e leitura em produção

Após as quatro preparações e a leitura pela API de produção, os quatro jobs
foram reativados e conferidos com `active=true`. A operação correspondente está
em `supabase/operations/resume_snapshot_refresh.sql`.

| Praça | Agendamento | Estado após retomada |
| --- | --- | --- |
| Joinville | `0,30 * * * *` | Ativo |
| Porto Alegre | `5,35 * * * *` | Ativo |
| Goiânia | `10,40 * * * *` | Ativo |
| São Paulo | `15,45 * * * *` | Ativo |

O carregador real do aplicativo leu todas as páginas de leads, tráfego e fontes
complementares e executou os cálculos de métricas, sem erro nas quatro praças.
Tempos totais nessa amostra: São Paulo 21 s, Joinville 35 s, Porto Alegre 25 s e
Goiânia 18 s. Foram recebidas exatamente 6014, 24478, 11790 e 5319 linhas dos
snapshots, respectivamente. A normalização/deduplicação posterior permaneceu igual.
Esses tempos incluem outras fontes e não representam uma comparação controlada
com a versão anterior nem uma promessa de desempenho futuro.

O primeiro disparo automático também foi observado: Joinville iniciou às
14h30min00s e terminou com `succeeded` às 14h30min24s. Manteve 24478 registros,
reutilizou as 25 páginas e não gravou nenhum payload novo. A verificação bem-sucedida
renovou o horário do snapshot sem duplicar o conteúdo. O ciclo automático completo
das quatro praças ainda não foi observado; os resultados posteriores ficam em
`cron.job_run_details`.

## Publicação

O commit `11884dc5db2e0469abaa40dc9252dde97116e2a1` foi integrado à `main`
e o PR #1 foi marcado como integrado. A Vercel concluiu a publicação às 14h26
(17h26 UTC). O HTML de produção e o bundle atualizado responderam com HTTP 200;
o texto de 30 minutos foi confirmado no bundle. A API de Porto Alegre também
respondeu HTTP 200 após a publicação, com 11790 registros e página de 1000.

## Pendências externas

A causa original da criação do backup permanece uma hipótese de preservação para
retorno após a importação. Não foram encontradas dependências do dashboard nem
referências catalogadas externas à própria tabela. Sem reconciliar sua recomposição
pela fonte oficial, não foi comprovada a condição exigida para removê-lo. Essa
validação pode ser feita pelo responsável interno, sem conceder acesso ao agente.

A redução do espaço ocupado e a recuperação sustentada de memória/I/O devem ser
acompanhadas separadamente. As verificações atuais não comprovam a recuperação do
Disk IO Budget nem eliminam a limitação de espaço do plano Free.
