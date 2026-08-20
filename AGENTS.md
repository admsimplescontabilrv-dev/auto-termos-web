# Regras do Projeto

## GitHub Actions & Sincronização (.github/workflows/)
- **NUNCA** crie, edite, sobrescreva ou apague arquivos dentro de `.github/workflows/` (especialmente o arquivo `.github/workflows/sync.yml`).
- Esses arquivos controlam automações de espelhamento do repositório gerenciadas externamente.
- Ignore completamente essa pasta em qualquer alteração ou commit. Se houver qualquer dúvida ou necessidade de modificação nessa pasta, avise o usuário e aguarde instruções manuais.

## Modelos de IA e Integrações
- **NUNCA** modifique a esteira de fallback dos modelos de IA (`modelsToTry` array em `server.ts`) a menos que expressamente solicitado pelo usuário.
- O código atual utiliza uma esteira com os modelos `['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-flash-latest']` para mitigar indisponibilidades (falha 503). Mantenha este padrão para todas as integrações com a API do Gemini.
