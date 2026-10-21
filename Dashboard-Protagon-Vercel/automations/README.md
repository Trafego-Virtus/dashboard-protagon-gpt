# Tráfego para Supabase — envio sequencial

`protagon-trafego-sequencial.json` foi preparado a partir da automação enviada em 20/10. **Ainda não está ativo no n8n.**

1. Importe o JSON no n8n. Ele começa inativo.
2. No nó **Ler abas do Google Sheets**, selecione a mesma credencial Google Sheets do fluxo atual. Em **Inserir e atualizar recentes**, selecione a mesma credencial Supabase. Nenhuma chave está incluída neste arquivo.
3. Desative a automação de tráfego anterior e aguarde qualquer execução em andamento terminar. Mantenha a automação de leads como está.
4. Execute **Testar agora** no novo fluxo. Confirme o término de todos os lotes e o **Resumo da sincronizacao**, sem nós em erro. Em caso de falha, não ative ambos os fluxos; revise a mensagem. Os lotes mantêm a mesma importação idempotente.
5. Ative somente o novo fluxo para manter a execução horária.

O `Loop Over Items` envia um lote por vez: saída **loop** → HTTP → pausa de 1 segundo → retorno ao loop. A saída **done** segue para o resumo. O intervalo do próprio nó HTTP foi removido porque ele apenas espaçava o início das chamadas; não esperava cada resposta.

Permanecem iguais: fontes, classificação, quarentena, tamanho dos lotes, inclusão de novos registros, atualização de hoje/ontem e resumo. Nenhuma regra de dados ou credencial é alterada. A espera limita a concorrência dentro de uma execução; não inicie execuções manuais sobrepostas à execução agendada.
