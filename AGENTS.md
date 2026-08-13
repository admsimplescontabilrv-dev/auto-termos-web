# Regras do Projeto

## GitHub Actions & Sincronização (.github/workflows/)
- **NUNCA** crie, edite, sobrescreva ou apague arquivos dentro de `.github/workflows/` (especialmente o arquivo `.github/workflows/sync.yml`).
- Esses arquivos controlam automações de espelhamento do repositório gerenciadas externamente.
- Ignore completamente essa pasta em qualquer alteração ou commit. Se houver qualquer dúvida ou necessidade de modificação nessa pasta, avise o usuário e aguarde instruções manuais.
