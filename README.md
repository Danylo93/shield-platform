# S.H.I.E.L.D Platform

Internal Developer Platform para automacao de criacao de componentes, pipelines e fluxos de aprovacao.

## Tecnologias

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Execucao local

```sh
npm install
npm run dev
```

## Build e testes

```sh
npm run lint
npm run test
npm run build
```

## CI/CD

O pipeline de CI/CD esta definido em `azure-pipelines.yml`, com estagios para:

- Build e testes
- Deploy em DEV
- Deploy em STG
- Deploy em RC
- Deploy em PRD
