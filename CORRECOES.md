# 🛠️ Correções de Deployment — Flor de Lótus

Este documento detalha as correções aplicadas para estabilizar o funcionamento do cardápio digital após a migração para a Vercel.

## 🔴 Problemas Diagnosticados
1.  **Tela Branca (CSS/JS não carregando):** Causado por redirecionamentos automáticos da Vercel (308) e caminhos relativos incorretos.
2.  **Menu não renderiza:** Inconsistência entre os IDs das categorias no Supabase (UUIDs) e os IDs esperados pelo frontend (Slugs), resultando em filtragem vazia.
3.  **Status da Loja Incorreto:** O servidor Vercel opera em UTC, causando fechamento precoce ou tardio do cardápio devido à diferença de fuso horário.

## ✅ Soluções Aplicadas

### 1. Estabilização do Vercel (`vercel.json`)
- Configurado `trailingSlash: true` para garantir que as rotas de diretórios (como `/apps/cardapio/`) resolvam corretamente os arquivos relativos.
- Adicionados headers de controle de cache para o Service Worker.

### 2. Priorização do Menu JSON (`api.js`)
- Alterada a função `fetchMenu` para tentar carregar o arquivo local `/assets/menu.json` como fonte primária.
- Isso garante que o cardápio apareça imediatamente com os dados validados, enquanto o banco de dados Supabase é saneado.

### 3. Ajuste de Timezone (`api.js`)
- A função `checkStoreStatus` agora realiza o cálculo de horário baseado no fuso **GMT-3** (Cajazeiras/PB), independentemente do fuso horário do servidor ou dispositivo.

### 4. Bumper de Versão do Service Worker (`service-worker.js`)
- Versão incrementada para **v12**. Isso força o navegador do cliente a descartar o cache antigo e baixar a lógica corrigida no próximo acesso.

## 🧪 Plano de Testes
Para validar se as correções surtiram efeito, siga estes passos:

1.  **Limpeza de Cache:** No navegador do celular, limpe os dados de navegação (Imagens e arquivos em cache).
2.  **Acesso Direto:** Acesse `https://flor-de-lotus-psi.vercel.app/apps/cardapio/`.
3.  **Verificação de Renderização:**
    *   O fundo deve estar escuro (Glassmorphism).
    *   Os cards de produtos devem aparecer.
    *   O botão de carrinho deve refletir o estado do menu.
4.  **Verificação de Horário:** Se estiver entre 17:30 e 22:00, a loja deve aparecer como aberta.

---
**Status:** Implementado e pronto para push.
