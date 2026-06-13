# Workflow Full Stack SOLID — Flor de Lótus (alinhado ao Vercel)

> Adaptação do `workflow-fullstack-solid.md` original para a realidade do
> projeto: app estático (HTML/CSS/JS sem bundler), Supabase como backend,
> deploy via Vercel a partir da raiz do repositório, desenvolvimento
> 100% mobile (Termux + Acode). Este documento assume que a migração descrita
> em `01-migracao-vercel.md` já foi concluída.

---

## 1. Visão geral da arquitetura (atualizada)

```
Frontend (HTML/CSS/JS, ES Modules via CDN)
  ↓
Services (apps/cardapio/js/services/*)
  ↓
Supabase (Postgres + Realtime + RLS + Auth)
  ↓
Edge Functions (Deno, supabase/functions/*) — quando precisar de service_role
  ↓
Vercel (build estático, deploy automático via git push)
  ↓
CDN da Vercel (cache automático de assets estáticos)
```

Diferenças em relação ao documento original:

- **Não há CI/CD separado** — a Vercel já é o CI/CD: cada `git push` gera um
  deploy (Preview para branches, Production para a branch principal).
- **Não há servidor Node em produção** — `server.js` só serve para testes
  locais opcionais.
- **Cache/CDN é automático** — a Vercel já serve estáticos via CDN; o
  Service Worker continua existindo para o modo offline do PWA, não para
  performance de entrega (isso a CDN já resolve).
- **Monitoramento** — usar o painel de **Logs** da Vercel (Runtime/Build
  Logs) e os **Logs** do Supabase (Database/Auth/Realtime), já que não há
  Sentry configurado.

---

## 2. Estrutura de diretórios (alvo, migração incremental)

```
/
├── index.html                 # landing — redirect para /apps/cardapio/
├── vercel.json                 # headers de Service Worker
├── service-worker.js           # SW raiz (escopo /)
├── server.js                   # apenas para testes locais (opcional)
│
├── apps/
│   ├── cardapio/
│   │   ├── index.html
│   │   ├── register.html
│   │   ├── app.js               # bootstrap (Composition Root)
│   │   ├── manifest.json
│   │   ├── styles.css
│   │   └── js/
│   │       ├── state.js          # estado global + DOM refs
│   │       ├── render.js         # UI: renderização de listas/cards
│   │       ├── modal.js           # UI: modal de item
│   │       ├── events.js          # bind de eventos globais
│   │       ├── cart.js            # carrinho + drawer (UI)
│   │       ├── payment-ui.js      # NOVO — seletor de pagamento (extraído do cart.js)
│   │       ├── favorites.js
│   │       ├── loyalty.js
│   │       ├── profile.js
│   │       ├── order-tracking.js
│   │       ├── toast.js
│   │       ├── utils.js
│   │       ├── sw.js
│   │       ├── install.js
│   │       ├── db.js              # mantém-se como cliente Supabase singleton
│   │       └── services/          # NOVO — camada de serviços (SRP)
│   │           ├── orderService.js
│   │           ├── profileService.js
│   │           ├── loyaltyService.js
│   │           ├── menuService.js
│   │           └── errorHandler.js
│   │
│   └── admin/
│       ├── index.html
│       ├── admin-sw.js
│       └── admin-manifest.json
│
├── public/
│   ├── menu.json
│   └── assets/images/
│
└── supabase/
    ├── functions/
    │   ├── pix-create/
    │   └── pix-webhook/
    └── migrations/
```

A coluna `services/` é **aditiva** — arquivos novos que re-exportam funções
de `db.js`. Nada existente precisa ser removido no curto prazo (ver seção 5).

---

## 3. SOLID aplicado neste projeto — exemplos concretos

### S — Single Responsibility

| Antes | Depois |
|---|---|
| `cart.js` faz: carrinho + drawer + seletor de pagamento + envio WhatsApp + tracking | `cart.js` (carrinho + envio) / `payment-ui.js` (seletor de pagamento) |
| `db.js` mistura cliente Supabase + device ID + 4 domínios (profile, order, loyalty) | `db.js` continua sendo o cliente singleton; `services/*Service.js` expõem por domínio |

### O — Open/Closed

`menuService.js` pode ganhar uma nova fonte de dados (ex: cache local mais
agressivo) sem alterar `render.js` — a interface (`fetchMenu()`) permanece
igual, só a implementação interna muda.

### L — Liskov

Não há herança de classes neste projeto (ES Modules funcionais), então este
princípio se aplica principalmente a **funções com mesma assinatura**: se
`fetchMenuFallback()` algum dia for substituída por outra estratégia de
fallback, ela deve continuar retornando o mesmo formato (`state.menu`
populado), sem exigir mudanças em `render.js`.

### I — Interface Segregation

`render.js` não deveria precisar importar `db.js` inteiro só para chamar
`getSupabase()` — hoje ele não faz isso (correto). Ao extrair `services/`,
cada módulo de UI importa **apenas** a função do service que usa, não o
service inteiro como objeto.

### D — Dependency Inversion

`order-tracking.js` depende de `getSupabase()` diretamente. Isso é aceitável
no estágio atual (projeto pequeno, sem testes automatizados), mas o caminho
de evolução é `order-tracking.js` depender de `services/orderService.js`
(abstração), que por sua vez encapsula o Supabase.

---

## 4. Fluxos principais (atualizados, sem prefixo de path)

### Cliente — Pedido
```
/apps/cardapio/ (index.html)
  ↓
app.js (init)
  ↓
services/menuService.js → fetchMenu()
  ↓
Supabase: categories + products
  ↓
render.js → renderContent()
  ↓
cart.js → addToCart() / sendOrderWhatsApp()
  ↓
services/orderService.js → saveOrder()
  ↓
Supabase: orders (insert, RLS anon)
  ↓
order-tracking.js → Realtime + polling
```

### Admin — Atualização de status
```
/apps/admin/ (index.html, PIN → Supabase Auth)
  ↓
Supabase: orders (select, realtime subscribe)
  ↓
updateStatus(id, novoStatus)
  ↓
Supabase: orders (update, RLS authenticated)
  ↓
Realtime → cliente recebe via order-tracking.js
```

### Deploy
```
git add . && git commit -m "..." && git push origin <branch>
  ↓
Vercel detecta push
  ↓
branch != produção → Preview Deployment (URL própria)
branch == produção → Production Deployment (vercel.app)
```

---

## 5. Plano de migração incremental do código (pós-deploy)

Esta seção é a continuação do plano de refatoração já discutido, agora
**sem risco de conflito com a migração de hosting** (que é só sobre paths).

### Fase A — services/ via re-export (risco zero)

```javascript
// apps/cardapio/js/services/orderService.js
export { saveOrder } from '../db.js';

// apps/cardapio/js/services/profileService.js
export { syncProfile, getDeviceId } from '../db.js';

// apps/cardapio/js/services/loyaltyService.js
export { syncLoyalty, fetchLoyalty } from '../db.js';

// apps/cardapio/js/services/menuService.js
export { fetchMenu, fetchMenuFallback, checkStoreStatus, subscribeToRealtimeUpdates } from '../api.js';
```

**Teste:** nenhum import existente muda. Rodar o app normalmente — nada deve
quebrar, pois `db.js`/`api.js` continuam intocados.

### Fase B — Extrair `payment-ui.js` de `cart.js`

Mover `_renderPaymentSelector`, `window._selectPayment`,
`_handlePixSelection` para `apps/cardapio/js/payment-ui.js`, exportando:

```javascript
export function renderPaymentSelector(summaryEl) { /* ... */ }
export function getSelectedPayment() { /* retorna window._FL_PAYMENT */ }
```

`cart.js` importa e chama `renderPaymentSelector(summaryEl)` dentro de
`renderCartDrawer()`.

**Teste:** fluxo completo — adicionar item, abrir carrinho, escolher Pix,
ver área de QR mock aparecer, enviar pedido via WhatsApp, confirmar que
`payment_method` é salvo no Supabase (`saveOrder`).

### Fase C — Padronizar `errorHandler.js`

```javascript
// apps/cardapio/js/services/errorHandler.js
export function logError(context, error) {
  console.warn(`[${context}]`, error?.message || error);
}
```

Trocar gradualmente, **um arquivo por vez**, `.catch(() => {})` por
`.catch(e => logError('nomeDoContexto', e))`. Prioridade: `profile.js`,
`app.js`, `loyalty.js` — locais já identificados no napkin como pontos onde
erros de RLS foram mascarados antes.

**Teste:** depois de cada arquivo migrado, abrir DevTools → Console e
provocar o erro intencionalmente (ex: desligar Wi-Fi) — confirmar que agora
aparece `[nomeDoContexto] mensagem do erro` em vez de silêncio total.

### Fase D — Migrar imports antigos para `services/` (opcional, longo prazo)

Só depois que A, B e C estiverem estáveis em produção por pelo menos uma
semana sem bugs reportados. Trocar `import { saveOrder } from './db.js'`
por `import { saveOrder } from './services/orderService.js'` em `cart.js`,
um import por vez, com commit individual.

---

## 6. Checklist de qualidade por entrega (adaptado ao Vercel)

```
[ ] Testado localmente (python -m http.server, sem prefixo de path)
[ ] Console sem erros novos (404, CORS, RLS)
[ ] Se RLS foi tocado: testado em aba anônima (cliente) + sessão admin autenticada
[ ] Realtime do order-tracking continua funcionando
[ ] git diff revisado — mudança é mínima e cirúrgica (SRP: 1 commit = 1 responsabilidade)
[ ] git push para branch de feature → aguardar Preview Deployment da Vercel
[ ] Testar a URL de Preview (não só localhost) antes de mergear
[ ] Merge para branch de produção → Production Deployment automático
[ ] Testar a URL de produção (.vercel.app)
```

---

## 7. Monitoramento (substitui a seção "Vercel Logs / Sentry" do original)

- **Vercel → Project → Logs**: erros de build e runtime (esse projeto é
  estático, então principalmente build logs — se um deploy falhar, é quase
  sempre erro de sintaxe JSON em `vercel.json`/`manifest.json`).
- **Supabase → Logs → API/Realtime/Auth**: para diagnosticar falhas de RLS,
  conexões Realtime caindo, ou falhas de login do admin.
- **DevTools remoto no Android**: para erros de JS em runtime, já que não há
  Sentry. Considerar adicionar, no futuro, um `window.onerror` simples que
  grava em uma tabela `client_errors` do Supabase (zero custo, baixo volume).

---

## 8. O que NÃO fazer (riscos conhecidos do projeto)

- **Não restringir o CSP** (`Content-Security-Policy: default-src * ...`)
  sem uma sessão dedicada — quebra CDNs (Font Awesome, Google Fonts,
  Supabase, esm.sh). Documentado como dívida técnica conhecida.
- **Não mudar `device_id`/identidade anônima para auth real** sem planejar
  migração de dados existentes em `profiles`/`loyalty`/`orders`.
- **Não reestruturar pastas além do plano da seção 5** — qualquer mudança de
  diretório exige revisão de TODOS os imports ES Module (sem bundler, sem
  resolução automática de paths).
- **Não remover o polling de 5s do `order-tracking.js`** mesmo que o
  Realtime pareça estável — é o fallback que cobre falhas silenciosas de RLS.

---

## 9. Próximos passos sugeridos (ordem de prioridade)

1. Migração de hosting (`01-migracao-vercel.md`) — bloqueante, fazer primeiro.
2. Fase A deste documento (services/ via re-export) — zero risco, pode ser
   feito no mesmo dia.
3. Fase B (extrair payment-ui.js) — testar isoladamente.
4. Fase C (error handler) — gradual, sem pressa.
5. Integração PIX real (Efí Bank) — depende da Edge Function
   `create-pix-charge` já documentada em `seguranca-e-pix-flordelotus.md`.
6. n8n / automação WhatsApp — fase posterior, depende do PIX estar estável.
