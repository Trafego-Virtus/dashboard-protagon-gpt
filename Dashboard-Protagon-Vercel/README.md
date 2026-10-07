# Dashboard Protagon — GitHub e Vercel

Pacote pronto para publicar na Vercel a partir do GitHub. Inclui as correções
de leads/MQLs das praças e da subseção de criativos do Meteórico de Goiânia.

## Publicar

1. Descompacte `Dashboard-Protagon-Vercel.zip`.
2. Envie os arquivos descompactados para o repositório GitHub. `package.json`,
   `vercel.json`, `index.html`, `bun.lock`, `api/` e `src/` devem ficar na raiz
   do repositório. Envie também `server/`, `scripts/`, `public/` e os demais
   arquivos deste pacote. Não envie apenas o ZIP para o GitHub.
3. Na Vercel, escolha **Add New → Project** e importe esse repositório.
4. Mantenha **Root Directory: `./`**. As demais configurações já estão em
   `vercel.json`:

| Configuração | Valor |
| --- | --- |
| Framework Preset | Vite |
| Install Command | `bun install --frozen-lockfile` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 22.x |

5. Clique em **Deploy**.
6. Abra o endereço gerado pela Vercel. Use **Atualizar Dados** e selecione o
   período desejado para conferir as planilhas.

Se estiver substituindo um projeto existente, mantenha estes arquivos de
configuração e selecione como raiz a pasta que contém `package.json`.
Para enviar pelo navegador do GitHub, use **Add file → Upload files** e arraste
os arquivos e pastas descompactados. Inclua o `bun.lock`, que fixa as dependências.

## Fontes e configurações

- As mesmas planilhas publicadas do Google Sheets já estão configuradas.
- A configuração existente do Firebase foi mantida. Para continuar usando o
  mesmo banco, não é necessário preencher variáveis de ambiente.
- Para usar outro Firebase, configure na Vercel as variáveis `VITE_FIREBASE_*`
  listadas em `.env.example` e faça um novo deploy.
- Alterações nas telas de Testes continuam usando o Firebase compartilhado do
  projeto original; a configuração de acesso desse banco não foi modificada.

## Ajustes para este deploy

- Build estático do React/Vite, sem adaptador da hospedagem anterior.
- `/api/csv` é uma função Node.js da Vercel. As rotas do aplicativo não capturam
  as chamadas da API nem os arquivos de `assets`.
- As respostas CSV usam compressão gzip sem perda. Isso reduz o volume das
  planilhas grandes antes de a função enviar a resposta.
- A API tem até três tentativas, limite de tempo por consulta, respostas sem
  cache HTTP e erro 502 quando o Google não responde.
- O endpoint aceita somente as planilhas publicadas configuradas no aplicativo.
  A lista é regenerada pelo build se as fontes em `src/` forem atualizadas.
- As correções de contagem e a atualização a cada cinco minutos foram mantidas.
- Meteórico → Criativos abre em **Todos**, incluindo campanhas pausadas.
- `node_modules`, arquivos de build, dados CSV locais e arquivos da hospedagem
  anterior não precisam ser enviados: a Vercel instala e compila o projeto.

## Executar no computador

Use Node.js 22 e Bun para instalar as versões do lockfile:

```sh
bun install --frozen-lockfile
npm run dev
```

Abra `http://localhost:3000`. O servidor local usa a mesma função CSV do deploy.

```sh
npm run lint
npm test
npm run build
npm run preview
```

`preview` serve o build e a rota CSV. Na Vercel, a pasta `dist` e a função em
`api/` são publicadas pela plataforma; não é necessário iniciar `server.ts`.

## Validação deste pacote

Instalação com lockfile, verificação TypeScript, build de produção e testes das
contagens, filtros de criativos, compressão e tratamento de falhas da API.
O deploy na conta Vercel será realizado ao importar o seu repositório.

Documentação utilizada:
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/project-configuration/vercel-json
