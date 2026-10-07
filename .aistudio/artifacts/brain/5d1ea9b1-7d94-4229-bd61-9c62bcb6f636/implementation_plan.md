# Correção do Carregamento e Desbloqueio da Visualização no Preview

Correção definitiva para o travamento de carregamento e tela em branco no preview do AI Studio, ajustando as políticas de cabeçalhos de iframe e implementando timeout de segurança na inicialização do Firebase Auth.

---

> [!IMPORTANT]
> **Decisões e Diagnóstico Confirmado**:
> - O servidor de desenvolvimento (Node.js/Express + Vite) está ativo na porta 3000, porém o preview do AI Studio roda em um **iframe cross-origin**.
> - O middleware `helmet` em `server.ts` estava enviando o cabeçalho `Cross-Origin-Opener-Policy: same-origin` (COOP), o que instrui o navegador a isolar a janela e impedir a renderização correta dentro de iframes externos.
> - O ciclo de `initAuth` em `src/auth.ts` dependia unicamente da resposta assíncrona do `onAuthStateChanged`. Se o IndexedDB ou os cookies de terceiros fossem particionados pelo navegador dentro do iframe, o estado `isCheckingAuth: true` ficava preso indefinidamente.

---

### 1. Visão Geral e Causa Raiz

- **O que aconteceu**: O preview exibia tela preta/vazia devido a uma combinação de cabeçalhos de segurança restritivos (COOP no Helmet) e a ausência de um mecanismo de fail-safe/timeout no carregamento inicial de credenciais do Firebase Auth no navegador.
- **Resultado Esperado**: O app carregará instantaneamente. Caso a autenticação persistida demore mais de 2 segundos para responder dentro do iframe, o sistema libera a interface imediatamente para a tela de login ("Acesso Restrito") com total interatividade.

---

### 2. Experiência do Usuário (UX)

- **Fluxo de Carregamento**:
  1. Ao abrir o preview, o sistema exibe indicador visual sutil caso necessário.
  2. Em no máximo 2 segundos, se o usuário já possuir sessão ativa no Firebase, o Dashboard é exibido de imediato.
  3. Caso a sessão não seja recuperada ou haja bloqueio de cookies no iframe, a tela de autenticação ("Acesso Restrito") é renderizada normalmente para login por senha em um único clique.
- **Feedback Visual**: Fim do estado de tela congelada ("Carregando..." permanente ou tela preta sem resposta).

---

### 3. Decisões Técnicas e Arquitetura

```
┌────────────────────────────────────────────────────────┐
│             Navegador / AI Studio Preview              │
│                (Iframe Cross-Origin)                   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP Request
                           ▼
┌────────────────────────────────────────────────────────┐
│                   server.ts (Express)                  │
│  - Helmet: crossOriginOpenerPolicy: false              │
│  - Helmet: originAgentCluster: false                   │
│  - Vite Middlewares (SPA)                              │
└──────────────────────────┬─────────────────────────────┘
                           │ Transmite HTML/JS
                           ▼
┌────────────────────────────────────────────────────────┐
│                   src/auth.ts & App.tsx                │
│  - initAuth com Timeout Fail-Safe (2.5s)               │
│  - Captura de erro em onAuthStateChanged               │
│  - Transição garantida: isAuthenticated || Login Form  │
└────────────────────────────────────────────────────────┘
```

#### Alterações Planejadas:
1. **Ajuste no Helmet (`server.ts`)**:
   - Adicionar `crossOriginOpenerPolicy: false` e `originAgentCluster: false` às opções do `helmet()`.
   - Garantir que as diretivas de iframe do AI Studio e do proxy do Cloud Run não sejam bloqueadas.
   - **Preservar intacta** toda a esteira de fallback dos modelos Gemini (regra inegociável).

2. **Blindagem de Inicialização do Auth (`src/auth.ts` e `src/App.tsx`)**:
   - Adicionar timer de resguardo (2.5s) na função `initAuth`: caso o Firebase Auth demore ou sofra restrição de cookies no iframe, libera o estado de `isCheckingAuth` chamando o fallback de desautenticado.
   - Adicionar callback de tratamento de erro no `onAuthStateChanged` e blocos `try/catch` para evitar Promises não tratadas.

3. **Verificação**:
   - Validação da compilação com `compile_applet`.
   - Teste de resposta HTTP com `curl` nas rotas do servidor e assets do Vite.

---

### 4. Critérios de Aceite e Verificação

- [ ] Cabeçalho `Cross-Origin-Opener-Policy` removido/desativado para permitir funcionamento fluido em iframe.
- [ ] `initAuth` possui fail-safe e não permite travamento indefinido na tela "Carregando...".
- [ ] O app compila perfeitamente sem erros de TypeScript (`tsc --noEmit`).
- [ ] Ao recarregar a visualização no preview (botão ⟳), a tela do sistema é exibida normalmente.
