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

## 🔜 Próximos passos sugeridos

- [ ] Verificar deploy no GitHub Pages e Vercel após push
- [ ] Limpar cache do navegador e testar cardápio completo (imagens, menus, carrinho)
- [ ] Adicionar animações e melhorias visuais no cardápio
- [ ] Implementar sistema de pedidos / WhatsApp integration
- [ ] Adicionar painel admin para editar o `menu.json` via interface
- [ ] PWA: melhorar offline experience com SW atualizado
- [ ] Testes em dispositivos móveis (Android/iOS)
