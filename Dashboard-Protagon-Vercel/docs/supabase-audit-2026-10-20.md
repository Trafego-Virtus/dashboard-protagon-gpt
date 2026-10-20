# Auditoria do Supabase — 20/10/2026

**Registro histórico anterior às correções.** O estado posterior, as automações
ativas e as mudanças autorizadas estão no [registro da recuperação](supabase-recovery-2026-10-20.md).

Projeto: `oogehvamgxiagmfgejpu` — Dashboard Tráfego / Time de Tráfego.
Verificações entre 13h34 e 13h40 de Brasília. Esta revisão não executou DDL,
exclusões, atualizações de dados, reinicialização nem ativação de jobs.

## Responsabilidade e estado atual

A pausa dos quatro jobs de preparação foi realizada neste chat em 20/10,
após a autorização do usuário para pausar temporariamente e recuperar o banco.
Foi confirmada às 11h52 e novamente às 13h34. O objetivo era suspender as
consultas completas recorrentes enquanto o banco apresentava timeouts.
Não houve reativação. A limpeza diária dos logs continua ativa.

| Praça | Agendamento preservado | Estado |
| --- | --- | --- |
| Joinville | `0,30 * * * *` | Inativo |
| Porto Alegre | `5,35 * * * *` | Inativo |
| Goiânia | `10,40 * * * *` | Inativo |
| São Paulo | `15,45 * * * *` | Inativo |

Esses horários já estavam configurados quando a pausa foi executada neste chat.
O intervalo de 30 minutos reduz os disparos previstos de 48 para 8 por hora;
não quantifica a redução do consumo total do projeto.

As versões atuais dos leads continuam datadas de 19/10, entre 20h46 e 20h50
de Brasília. Os últimos resultados dos jobs foram `job startup timeout` para
Joinville, Porto Alegre e São Paulo, e `statement timeout` para Goiânia.
As consultas leves desta auditoria responderam, mas isso não comprova que
o orçamento de I/O, a memória ou uma carga completa já se recuperaram.

## Espaço e backup

Plano Free confirmado pela integração. Valores em MB decimais, obtidos por
funções de tamanho do PostgreSQL; incluem os componentes próprios de cada relação.

| Medida | Bytes | MB aproximados |
| --- | ---: | ---: |
| Todos os bancos do projeto | 522590929 | 522,6 |
| Banco `postgres` | 507475635 | 507,5 |
| `public.registros_leads_dedup` | 216997888 | 217,0 |
| `import_leads_20261019.registros_leads_backup_20261019` | 192512000 | 192,5 |
| `public.dashboard_protagon_snapshot_pages` | 42450944 | 42,5 |

O backup representa aproximadamente 36,8% do total. Sua remoção, se liberada
após a validação, levaria a estimativa para 330,1 MB. Essa conta não promete
recuperação imediata do orçamento de I/O nem atualização imediata do painel Usage.

Fatos confirmados sobre dependências:

- O catálogo `pg_depend` mostra apenas o tipo composto e a tabela TOAST internos.
- Não foram encontradas referências literais ao backup/schema em views,
  funções ou comandos do cron, nem inclusão em publicações.
- As quatro views de praça dependem da tabela atual em `public`, não do backup.
- O código do dashboard e suas migrações não utilizam nem criam esse backup.
- Não foram lidos os registros da tabela principal excluída do escopo; a análise
  de suas colunas, índices e dependências usou somente os catálogos do banco.

O histórico de renomear/mover a tabela foi fornecido pelo usuário. A hipótese
de preservação para retorno após uma importação é coerente, mas a finalidade
original e o responsável não foram comprovados nesta auditoria. As consultas
dirigidas aos logs não trouxeram eventos que permitissem estabelecer isso.
Não há justificativa funcional encontrada para o dashboard manter esse backup
permanentemente. Ausência de dependências catalogadas não exclui consumidores
externos, SQL dinâmico ou necessidade de recuperação de dados não reconciliados.

## Reconstrução: caminho identificado, comprovação pendente

Foi lida a versão atual do arquivo `Leads_Postgres_Supabase_Corrigido.json`,
workflow `Leads Postgres → Supabase | Somente novos v2`. É um arquivo de
configuração, não a confirmação do workflow publicado ou das execuções no n8n.
Seu campo `active` é falso no arquivo exportado; isso não determina o estado real.

O fluxo consulta `dados_personalizados.registros_leads` no PostgreSQL interno,
busca faixas de IDs ausentes no Supabase e envia até 1000 registros por execução.
Usa `on_conflict=id` e `resolution=ignore-duplicates`, com até três tentativas.
A função `public.n8n_leads_faixas_ausentes` existe no banco e considera lacunas
e IDs além dos já presentes. Sua definição foi inspecionada, sem executá-la.

Consequências:

- Inclusões que falharam podem ser buscadas novamente se esse fluxo estiver
  realmente ativo e os registros ainda existirem na origem.
- IDs existentes não são corrigidos pelo fluxo, mesmo se renda, UTMs, praça
  ou outros atributos mudarem no PostgreSQL interno.
- Exclusões posteriores, inclusive alterações de `deleted` em IDs existentes,
  não são propagadas por esse desenho.
- Existem `inserido_em` e `bq_sincronizado_em`, mas não foi demonstrado que
  algum campo seja um marcador completo de todas as alterações/exclusões.
- Não houve acesso direto à origem para testar uma reconstrução e reconciliar
  o conjunto de IDs e os campos necessários. Portanto, não se confirmou ainda
  a condição exigida pelo usuário para excluir o backup.

Antes de remover o backup: verificar o fluxo realmente ativo e sua consulta,
testar leitura/recomposição a partir da origem oficial, conferir a regra de
deduplicação e reconciliar IDs/campos/regras de exclusão. Contagens iguais,
sozinhas, não demonstram equivalência. Confirmar também com os consumidores
externos conhecidos que não usam a tabela antiga. Não criar outra cópia completa
dentro do Supabase para substituir esta. Uma eventual remoção deve ser restrita
ao objeto confirmado, sem `CASCADE`.

## Custo dos snapshots

A função atual lê todos os leads de uma praça, classifica os registros pela
view, ordena, serializa os 27 campos usados no dashboard, cria todas as páginas
JSON de uma nova versão e elimina versões antigas. Não verifica se o conteúdo
mudou antes de regravá-lo.

O `EXPLAIN`, sem `ANALYZE`, da consulta de Joinville apresentou varredura
sequencial paralela da origem, com normalização e expressões de campanha/praça
nos filtros. É evidência do plano escolhido, não uma nova medição de duração
ou de bytes realmente lidos. A única indexação encontrada na tabela de origem
foi a chave primária por `id`. A leitura das páginas já possui chave adequada
por `(city, version, page)`.

Existem 184 páginas e três ou quatro versões por praça. As versões atuais
somam 49 páginas, com aproximadamente 8,8 MB de conteúdo armazenado. Todas
as versões somam aproximadamente 31,3 MB de conteúdo, dentro dos 42,5 MB
físicos da relação. Os números não permitem atribuir toda a pressão de I/O
aos snapshots; importação, swap e manutenção também podem contribuir.

## Revisão da proposta de correção

O PR #1 continua rascunho. A proposta de validade 45/60 minutos, bloqueio global
e timeout de 90 segundos NÃO foi aplicada. A revisão automática exigiu
autorização específica. As funções em produção ainda têm limites de 10/15
minutos e bloqueio apenas por praça.

Ampliar a validade é necessário para compatibilizar leituras com o intervalo
de 30 minutos, mas a proposta anterior não evita a reconstrução nem a regravação
completas. Não deve ser apresentada como solução definitiva de I/O.

Próximo desenho a validar:

1. Preservar 30 minutos por praça e cinco minutos entre inícios. Usar uma única
   preparação por vez e limite de execução no comando do cron.
2. Separar horário de verificação da fonte de versão do conteúdo. Uma verificação
   concluída sem mudanças pode renovar a validade sem duplicar todos os dados.
   Uma consulta com erro nunca deve renovar essa validade.
3. Comparar conteúdo de maneira determinística antes de gravar. Reutilizar
   páginas inalteradas e publicar atomicamente o conjunto completo. Não usar
   somente quantidade ou maior ID como detector: isso perde alterações e trocas
   de registros. A comparação de conteúdo ainda lê/processa a origem; reduz
   gravações, não elimina por si só a varredura.
4. Reter a versão anterior somente pela janela necessária às leituras em curso.
   Contar a expiração a partir da substituição da versão, não da criação de um
   conteúdo que pode ter permanecido igual por dias. Nunca editar páginas já
   entregues a uma carga que fixou sua versão.
5. Para eliminar leituras completas, integrar um marcador confiável de mudanças
   por lote/praça, confirmado após a transação de importação, com alterações e
   exclusões incluídas. Mudança de praça precisa invalidar a antiga e a nova.
   Só adotar incremental após esse contrato estar comprovado; o fluxo de IDs
   ausentes atual não o oferece.
6. Avaliar índice de expressão/coluna normalizada de produto e classificação
   de praça com plano e seletividade reais. Um índice em `id` não resolve esses
   filtros. Não criar índices indiscriminadamente: ocupam espaço e encarecem
   importações. A tabela de origem permanece fora do escopo de alterações
   autorizado anteriormente; nenhum índice foi criado nela.

Validar, antes de reativar, equivalência dos 27 campos usados, atribuição de
praça/funil, deduplicação, datas de São Paulo, MQL, inclusão, atualização,
exclusão, movimentação entre praças, falha de importação, publicação atômica e
paginação durante uma substituição. Medir duração e gravações de uma praça
por vez, sem teste de carga durante pressão de I/O.

## Mudanças deste chat

- 19/10: leitura Supabase por fontes autorizadas, paginação e limites por ID;
  depois snapshots e quatro jobs originalmente de cinco minutos.
- 20/10: melhorias publicadas no aplicativo para limitar concorrência, repetir
  falhas transitórias uma vez e preservar métricas já carregadas com aviso.
- 20/10: pausa autorizada dos quatro jobs, preservando os horários de 30 minutos
  encontrados. Nenhuma pausa de importadores do n8n foi realizada por este chat.
- PR #1: proposta ainda não aplicada; esta auditoria documenta suas limitações.
- Esta revisão: apenas leituras de diagnóstico e documentação do PR. Nenhuma
  exclusão, alteração de fonte, reativação ou reinicialização.

Referências: [PR #1](https://github.com/Trafego-Virtus/dashboard-protagon-gpt/pull/1),
[Supabase: High Disk I/O](https://supabase.com/docs/guides/troubleshooting/exhaust-disk-io),
[PostgreSQL: EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html),
[PostgreSQL: índices de expressão](https://www.postgresql.org/docs/current/indexes-expressional.html).
