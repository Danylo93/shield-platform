# S.H.I.E.L.D Platform IDP - Documentacao Funcional

## 1. O que este sistema faz

O S.H.I.E.L.D Platform IDP e um portal interno para acelerar criacao e operacao de componentes de software.

Ele centraliza:

- Catalogo de templates
- Solicitacao de criacao de repositorio
- Fluxo de aprovacao DevOps
- Acompanhamento de componentes criados
- Execucao e monitoramento de pipelines
- Configuracoes de perfil e acesso

## 2. Problema que resolve

Sem a plataforma, cada squad cria repositositorios e pipelines de forma manual e inconsistente.

Com a plataforma:

- padroniza bootstrap de novos componentes;
- reduz tempo de setup tecnico;
- aplica governanca via aprovacao;
- melhora visibilidade de status e trilha operacional.

## 3. Perfis de usuario

### Developer

- Consulta templates
- Solicita criacao de componente
- Acompanha status da solicitacao
- Visualiza componentes da propria squad
- Executa pipelines dos componentes criados

### DevOps

- Tudo que developer faz
- Aprova/rejeita solicitacoes de componentes
- Dispara criacao de repositorio no Azure DevOps
- Retenta operacoes com erro
- Visualiza todos os componentes e aprovacoes

## 4. Modulos principais

## 4.1 Login e autorizacao

- Autenticacao via Supabase Auth.
- Carrega perfil (`profiles`) e papeis (`user_roles`).
- Controle de permissao por role (`dev`, `devops`).

## 4.2 Dashboard (Central de Comando)

- Exibe indicadores:
  - Repositorios
  - Templates
  - Projetos (para DevOps)
  - Deploys recentes (para DevOps)
- Lista templates em destaque.
- Atalhos para:
  - criar componente
  - acessar catalogo

## 4.3 Templates

- Lista templates disponiveis vindos do Azure DevOps.
- Filtros por linguagem (`java`, `python`, `.NET`).
- Busca por nome.
- Acao principal: "Usar template" para iniciar solicitacao.

## 4.4 Criacao de componente

Fluxo funcional:

1. Usuario escolhe um template.
2. Preenche dados do componente (nome, projeto, contexto).
3. Sistema registra solicitacao na base.
4. Solicitacao entra em status `pending`.
5. Aguarda aprovacao DevOps.

## 4.5 Aprovacoes

- DevOps visualiza fila de solicitacoes.
- Pode aprovar ou rejeitar com motivo.
- Ao aprovar:
  - sistema chama function `azure-devops` para criar repositorio.
  - status avanca por etapas (`creating` -> `created` ou `error`).
- Em erro, DevOps pode retentar.

## 4.6 Catalogo de componentes

- Lista componentes registrados no sistema.
- DevOps ve todos.
- Developer ve os proprios (e da squad quando aplicavel).
- Exibe status funcional:
  - `pending`, `approved`, `creating`, `created`, `rejected`, `error`.
- Quando criado com sucesso, mostra link do repositorio.
- Permite exclusao (com chamada para remover repo no Azure DevOps quando aplicavel).

## 4.7 Pipelines

- Usuario seleciona componente criado.
- Sistema carrega branches e pipeline associado.
- Permite executar pipeline por branch.
- Exibe historico de runs e status de execucao.
- Atualizacao periodica para acompanhamento.

## 4.8 Configuracoes

- Atualizacao de nome do perfil.
- Reset de senha.
- Visualizacao de papeis/permissoes.
- Preferencias visuais (tema).

## 5. Integracoes externas

### Supabase

- Auth (login/sessao)
- Banco (profiles, user_roles, components)
- Edge Function `azure-devops` para operacoes no Azure

### Azure DevOps

- Leitura de projetos, repositorios, templates e pipelines
- Criacao/remoção de repositorio
- Disparo e monitoramento de pipelines

### Kubernetes + ArgoCD (deploy do portal)

- Entrega da aplicacao frontend em ambiente clusterizado.
- Imagem publicada em ACR e versionada por tag.

## 6. Regras de negocio principais

- Criacao de repositorio depende de aprovacao DevOps.
- Somente DevOps pode aprovar/rejeitar/retentar aprovacoes.
- Developer opera somente no escopo permitido por perfil/squad.
- Operacoes sao refletidas em tempo real via atualizacao de dados.

## 7. Jornada resumida (E2E)

1. Developer acessa Templates.
2. Solicita novo componente.
3. DevOps aprova na tela de Aprovacoes.
4. Plataforma cria repositorio automaticamente.
5. Componente aparece no Catalogo com link do repo.
6. Developer executa pipeline na tela Pipelines.
7. Time acompanha historico de runs e status.

## 8. Limites conhecidos

- Variaveis `VITE_*` sao de build-time (nao runtime).
- Se imagem for buildada sem `VITE_SUPABASE_URL`, frontend quebra com erro `supabaseUrl is required`.
- Integracao com Azure depende de permissao correta em service connections e escopo de ACR.

## 9. Prints sugeridos para Confluence

1. Dashboard (cards e templates em destaque)
2. Tela de Templates com filtros
3. Dialogo de criacao de componente
4. Tela de Aprovacoes (acoes aprovar/rejeitar)
5. Catalogo com status e link de repo
6. Tela de Pipelines com runs recentes
7. Configuracoes de perfil/permissoes

