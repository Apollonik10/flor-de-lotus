# 🌸 Flor de Lótus — Roadmap & Changelog

## ✅ Sessão 1 — 22/06/2025 (Correções de Deploy)

### Problemas identificados
- **GitHub Pages**: imagens não carregavam (placeholders) — caminhos absolutos quebrados no subdiretório `/flor-de-lotus/`
- **Vercel**: JavaScript não renderizava nada (cardápio, menus, carrinho) — caminhos de fetch incorretos

### Causa raiz
O site usa a estrutura `/apps/cardapio/` com imports relativos. No GitHub Pages, a URL base inclui o nome do repositório (`/flor-de-lotus/`), quebrando qualquer caminho que comece com `/` (raiz absoluta). A Vercel por sua vez exigia trailing slash na rota de diretório para resolver módulos ES corretamente.

### Correções aplicadas

| Arquivo | O que foi corrigido |
|---------|---------------------|
| `public/index.html` | Caminhos de assets e redirecionamento dinâmico com `basePath` |
| `public/apps/cardapio/index.html` | Script de trailing slash adicionado |
| `public/apps/cardapio/js/api.js` | `basePath` dinâmico para fetch do `menu.json` e caminhos de imagem |
| `public/apps/cardapio/js/render.js` | Renderização de imagens com `basePath` correto e fallback |
| `public/apps/cardapio/js/sw.js` | Registro do Service Worker com `basePath` |
| `public/service-worker.js` | Bump para versão `v20` + atualização de `PRECACHE_PATHS` |

### Infraestrutura
- Chave SSH `ed25519` gerada no Termux
- Remote trocado de HTTPS → SSH (`git@github.com:Apollonik10/flor-de-lotus.git`)
- Commit `9e3bcd0` criado e enviado via `git push origin main`

---

## ✅ Sessão 2 — 23/06/2026 (Correções de Renderização na Vercel)

### Problemas identificados e corrigidos

| Arquivo | Problema | Correção |
|---------|----------|----------|
| `vercel.json` | `outputDirectory` e `framework` ausentes — Vercel não sabia servir a pasta `public/` | Adicionado `"outputDirectory": "public"` e `"framework": null` |
| `public/apps/cardapio/js/render.js` | `...` literal no template HTML da função `renderCard` (linha 177) — aparecia como texto no DOM e quebrava todos os cards | Removido o `...` indevido |
| `public/apps/cardapio/js/services/menuService.js` | Re-exportava `fetchMenuFallback` que é uma função **privada** em `api.js` — causava erro de módulo ES e bloqueava toda a inicialização do app | Removida a re-exportação inválida |

### Causa raiz da tela em branco
O app foi hospedado como **"Other"** na Vercel **sem** definir `outputDirectory`, portanto a Vercel tentava servir a raiz do repo (onde só existem `backend/`, `supabase/`, `vercel.json` etc.) em vez de `public/`. Combinado com o erro de módulo ES em `menuService.js`, o JavaScript nem chegava a inicializar.

### Segurança
- `.env` confirmado como **não rastreado** pelo git (já estava no `.gitignore`)
- Tokens de Vercel, GitHub, OpenAI, Gemini, Grok, DeepSeek e Supabase nunca foram commitados ✓

### Infraestrutura
- Commit `06694cc` criado via `git pull --rebase` + `git push origin main`

---

## 🔜 Próximos passos sugeridos

- [ ] Verificar deploy na Vercel após push (deve renderizar cardápio completo agora)
- [ ] Limpar cache do Service Worker no navegador para forçar o novo SW
- [ ] Adicionar animações e melhorias visuais no cardápio
- [ ] Implementar sistema de pedidos / WhatsApp integration
- [ ] Adicionar painel admin para editar o `menu.json` via interface
- [ ] PWA: melhorar offline experience com SW atualizado
- [ ] Testes em dispositivos móveis (Android/iOS)
- [ ] **Fase 5:** Pagamentos PIX (Efí Bank)
- [ ] **Fase 6:** Notificações Push & Cupons de Desconto
