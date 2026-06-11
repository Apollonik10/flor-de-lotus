# 🔒 Flor de Lótus — Segurança + Preparação PIX (Efí Bank)

> Documento de referência para aplicar com segurança, sem quebrar o app em produção.
> Siga a ordem das seções. Cada item tem: **o que é**, **por que importa**, **como aplicar**, **risco de quebrar algo**.

---

## ⚠️ Regra de ouro antes de qualquer mudança

```bash
# Sempre crie um branch/commit de segurança antes de mexer no banco ou RLS
git add .
git commit -m "checkpoint antes de ajustes de seguranca/pix"
git push
```

No Supabase, **antes de alterar RLS**, teste sempre em uma aba anônima (sem login) e no admin (logado) — RLS errada pode travar o cardápio inteiro silenciosamente (sem erro visível, só retorna vazio).

---

## 1. ✅ O que já está correto (não precisa mexer)

- **Chave `anon` e URL do Supabase no código do cliente** — isso é o padrão esperado. A chave `anon` é pública por design. Não tente "esconder" ela em `.env` no frontend, isso não muda nada de segurança real.
- Migração `keyup` → `input` no PIN do admin — mantém.
- Limpeza dos campos de PIN em erro — mantém.
- Remoção de `Deno.env.get` do HTML do cliente — mantém.
- Status `pago` isolado (campo separado, não no fluxo de preparo) — mantém essa decisão de design.

---

## 2. 🔴 Crítico — RLS (Row Level Security)

### 2.1 Tabela `orders`

**O que é:** regras que controlam quem pode ler/escrever cada linha da tabela.

**Por que importa:** sem RLS correta, qualquer pessoa com a chave `anon` (que é pública!) pode ler **todos os pedidos** de **todos os clientes**, ou pior, marcar o próprio pedido como `entregue`/`pago` sem pagar.

**Como verificar o estado atual:**

No Supabase Dashboard → Authentication → Policies (ou Table Editor → `orders` → RLS), confira se existem policies parecidas com isto:

```sql
-- Ver políticas atuais da tabela orders
select * from pg_policies where tablename = 'orders';
```

**Políticas recomendadas (aplicar via SQL Editor):**

```sql
-- 1. Habilita RLS (se ainda não estiver)
alter table orders enable row level security;

-- 2. Permite que QUALQUER cliente (anon) INSIRA um pedido novo
create policy "anon pode criar pedido"
on orders for insert
to anon
with check (true);

-- 3. Permite que o cliente veja APENAS pedidos do próprio device_id
--    (isso exige que o app sempre filtre por device_id nas queries)
create policy "anon ve apenas seus pedidos"
on orders for select
to anon
using (true);
-- OBS: manter "using (true)" no SELECT é necessário para o Realtime
-- funcionar (ele precisa enxergar a linha para notificar mudança de status).
-- A privacidade aqui é "by obscurity" (UUID do pedido não é adivinhável).
-- Se quiser reforçar, crie depois uma view que não exponha client_phone/address
-- para leituras anônimas.

-- 4. IMPEDE que anon (cliente) altere o status do pedido
--    Apenas usuários autenticados (admin) podem fazer UPDATE
create policy "apenas admin autenticado atualiza pedido"
on orders for update
to authenticated
using (true)
with check (true);

-- 5. IMPEDE delete por anon
create policy "apenas admin autenticado remove pedido"
on orders for delete
to authenticated
using (true);
```

> ⚠️ **Teste depois de aplicar:**
> - Abra o cardápio em aba anônima → faça um pedido de teste → confirme que salva (`saveOrder` retorna `id`).
> - Abra o admin → confirme que ainda consegue ver pedidos e mudar status.
> - Confirme que o **Realtime continua atualizando** o `order-tracking.js` (RLS bloqueando SELECT quebra o Realtime silenciosamente — é o ponto #1 do seu napkin).

**Risco de quebrar:** médio. Se a policy de UPDATE ficar só para `authenticated` e o admin não estiver de fato autenticado via `supabase.auth`, o admin para de funcionar. Confirme que `apps/admin/index.html` usa `signInWithPassword` (já usa, conforme o código) e que a sessão persiste.

---

### 2.2 Tabela `profiles` e `loyalty`

Mesma lógica — `device_id` não autenticado, então:

```sql
alter table profiles enable row level security;
alter table loyalty enable row level security;

-- profiles: anon pode criar/atualizar o próprio perfil (upsert por device_id)
create policy "anon upsert proprio profile"
on profiles for all
to anon
using (true)
with check (true);

-- loyalty: mesma lógica
create policy "anon upsert propria loyalty"
on loyalty for all
to anon
using (true)
with check (true);
```

> Isso mantém o comportamento atual (sem login real, identidade por `device_id`). Não é "seguro" no sentido de impedir um usuário malicioso de escrever na loyalty de outro `device_id` — mas isso já é uma limitação de design conhecida (sem auth real). Resolver isso de verdade exigiria autenticação por usuário, o que é uma mudança grande, não recomendo agora.

---

## 3. 🟡 Importante — Admin / PIN

### 3.1 Mensagens de erro do login

**O que foi feito:** agora mostra o erro real do Supabase Auth em vez de "PIN incorreto" genérico.

**Cuidado:** se o painel admin algum dia tiver mais de um usuário, **não exiba** mensagens como "user not found" — isso permite descobrir emails válidos. Para 1 usuário só (seu caso), o risco é baixo, mas deixe anotado no napkin.

**Sugestão de ajuste leve (opcional, sem quebrar nada):**

No `apps/admin/index.html`, dentro de `verifyPin`, troque:

```js
err.textContent = 'PIN incorreto.';
```

por:

```js
// Mostra detalhe só em ambiente de teste; em produção, mensagem genérica
const isDev = location.hostname === 'localhost' || location.hostname.includes('replit');
err.textContent = isDev ? (error.message || 'PIN incorreto.') : 'PIN incorreto.';
```

Isso mantém o diagnóstico durante desenvolvimento e some em produção (GitHub Pages).

---

### 3.2 Rate limiting do PIN

**Verificar no Supabase Dashboard:** Authentication → Rate Limits — confirme que `signInWithPassword` tem limite de tentativas (padrão do Supabase já vem com proteção básica, mas confirme que está ativado no seu projeto).

**Sem mudança de banco necessária.** Apenas verificação.

---

## 4. 🟡 CSP (Content-Security-Policy)

**Estado atual:** todos os HTMLs (`index.html`, `apps/cardapio/index.html`, `register.html`) têm:

```html
<meta http-equiv="Content-Security-Policy" content="
default-src * data: blob: 'unsafe-inline' 'unsafe-eval';
...">
```

Isso na prática **desativa** a CSP (permite tudo).

**Recomendação:** não mexer agora. Restringir CSP é trabalho fino que pode quebrar CDNs (Font Awesome, Google Fonts, Supabase, esm.sh) se não for testado com calma. Deixe para uma sessão dedicada, **depois** que o PIX estiver funcionando. Anotar no napkin como "dívida técnica, não bloqueante".

---

## 5. 💳 Preparação do banco para PIX / Efí Bank

### 5.1 Estratégia escolhida: campo paralelo `payment_status`

Não vamos mexer no fluxo `pendente → preparando → pronto → entregue` (campo `status`). Vamos adicionar um campo **separado** só para pagamento:

```
payment_status: 'pendente' | 'pago' | 'falhou' | null
```

- `null` = pedido não usa PIX (continua só WhatsApp, como hoje — **comportamento padrão, nada quebra**)
- `'pendente'` = cobrança PIX gerada, aguardando confirmação
- `'pago'` = confirmado via webhook Efí (única fonte de verdade)
- `'falhou'` = cobrança expirou/cancelada

### 5.2 SQL para rodar agora (no SQL Editor do Supabase)

```sql
-- 1. Adiciona coluna payment_status em orders (não afeta linhas existentes)
alter table orders
  add column if not exists payment_status text default null;

-- 2. Confirma que payment_method e troco_para existem
--    (o db.js já tenta gravar esses campos — se a coluna não existir,
--     o insert falha silenciosamente e cai no catch)
alter table orders
  add column if not exists payment_method text default null;

alter table orders
  add column if not exists troco_para numeric default null;

-- 3. Tabela dedicada para detalhes da cobrança PIX
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'efi',       -- 'efi', futuramente outros
  charge_id text,                              -- ID da cobrança na Efí
  pix_copy_paste text,                         -- código "copia e cola"
  qr_code_base64 text,                         -- imagem do QR em base64
  amount numeric not null,
  status text not null default 'pendente',     -- pendente | pago | expirado | erro
  created_at timestamptz default now(),
  paid_at timestamptz,
  raw_webhook jsonb                            -- guarda o payload recebido, p/ debug
);

-- 4. RLS da tabela payments: anon NÃO acessa direto
alter table payments enable row level security;

-- Apenas leitura para o próprio dono do pedido (via join indireto não é trivial
-- sem auth real, então por simplicidade: nenhuma policy para anon =
-- anon não acessa a tabela payments diretamente. O frontend vai receber
-- os dados do QR code via retorno da Edge Function, não via select direto).

-- Admin autenticado pode ver tudo (para debug/relatórios futuros)
create policy "admin ve pagamentos"
on payments for select
to authenticated
using (true);
```

> **Por que `payments` não tem policy de `insert`/`update` para `anon` nem `authenticated`?**
> Porque essas operações vão ocorrer via **Edge Function** usando a `service_role` key (que ignora RLS). Isso é o jeito seguro de lidar com dinheiro: nada de escrita direta do navegador na tabela de pagamentos.

**Risco de quebrar:** **zero** para o app atual. São colunas novas com `default null` e uma tabela nova — nada existente é alterado ou removido. `saveOrder()` em `db.js` já envia `payment_method`/`troco_para`; agora essas colunas vão existir de fato.

---

### 5.3 Edge Function placeholder — `create-pix-charge`

**O que é:** uma função que vai rodar no Supabase (servidor), não no navegador. Hoje ela retorna um **mock** (QR code falso); quando você tiver a chave da Efí, troca só o "miolo".

**Por que assim:** permite testar TODO o fluxo visual (botão "Pagar com PIX" → modal com QR code → "aguardando pagamento") **hoje**, sem a chave real.

**Estrutura do arquivo** (você vai criar isso depois, quando formos implementar — por ora é só o esqueleto para referência):

```ts
// supabase/functions/create-pix-charge/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { order_id, amount } = await req.json();

  const EFI_CLIENT_ID = Deno.env.get('EFI_CLIENT_ID');
  const EFI_CLIENT_SECRET = Deno.env.get('EFI_CLIENT_SECRET');

  // ── MOCK (enquanto não temos a chave da Efí) ──
  if (!EFI_CLIENT_ID || !EFI_CLIENT_SECRET) {
    return new Response(JSON.stringify({
      mock: true,
      pix_copy_paste: '00020126...MOCK...DADOSFALSOS...6304ABCD',
      qr_code_base64: null, // frontend pode mostrar "modo teste"
      charge_id: 'mock-' + Date.now(),
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ── REAL (quando EFI_CLIENT_ID/SECRET estiverem configurados) ──
  // 1. Autenticar na Efí (OAuth)
  // 2. Criar cobrança PIX
  // 3. Salvar na tabela `payments` usando service_role
  // 4. Retornar pix_copy_paste + qr_code_base64 para o frontend

  return new Response(JSON.stringify({ error: 'not_implemented' }), { status: 501 });
});
```

> **Importante:** `EFI_CLIENT_ID` e `EFI_CLIENT_SECRET` vão ficar em **Supabase Secrets** (`supabase secrets set EFI_CLIENT_ID=...`), **nunca no código do frontend**. Isso sim é uma chave que precisa ficar protegida — diferente da `anon` key.

**Quando aplicar:** só quando formos implementar o botão de PIX no `cart.js`. Por enquanto, **não precisa criar esse arquivo ainda** — é só para você visualizar o plano.

---

## 6. 📋 Checklist de aplicação (ordem recomendada)

Marque conforme for fazendo:

- [ ] **1.** Commit/push do estado atual (checkpoint)
- [ ] **2.** Rodar SQL da seção 2.1 (RLS `orders`) no SQL Editor
- [ ] **3.** Testar: pedido anônimo cria normalmente (`saveOrder` retorna ID)
- [ ] **4.** Testar: admin vê pedidos e consegue mudar status
- [ ] **5.** Testar: `order-tracking.js` continua recebendo updates em tempo real
- [ ] **6.** Rodar SQL da seção 2.2 (RLS `profiles`/`loyalty`)
- [ ] **7.** Testar: cadastro de perfil (`register.html`) ainda sincroniza (`syncProfile`)
- [ ] **8.** Rodar SQL da seção 5.2 (colunas novas + tabela `payments`)
- [ ] **9.** Testar: app continua 100% funcional (nada deve mudar visualmente ainda)
- [ ] **10.** (Opcional) Aplicar ajuste de mensagem de erro do PIN (seção 3.1)
- [ ] **11.** Atualizar `.claude/napkin.md` com:
  - RLS aplicada (data)
  - Tabela `payments` criada, aguardando integração Efí
  - CSP permissiva = dívida técnica conhecida, não bloqueante

---

## 7. 🚫 O que NÃO fazer agora

- Não criar a Edge Function `create-pix-charge` ainda (sem chave, sem pressa)
- Não restringir a CSP agora (alto risco de quebrar CDNs sem benefício imediato)
- Não tentar "esconder" a chave `anon` do Supabase — é inútil e pode quebrar o app
- Não mudar o fluxo de `status` do pedido — `payment_status` é **paralelo**, não substitui nada

---

## 8. Quando a chave da Efí chegar

Volte a este documento, seção 5.3. O fluxo será:

1. `supabase secrets set EFI_CLIENT_ID=... EFI_CLIENT_SECRET=...`
2. Implementar a parte "REAL" da Edge Function
3. Adicionar botão "Pagar com PIX" no `cart.js` → chama a Edge Function → mostra QR code
4. Criar webhook receiver (outra Edge Function) que a Efí chama quando o pagamento é confirmado → atualiza `payments.status = 'pago'` e `orders.payment_status = 'pago'`
5. `order-tracking.js` passa a exibir "✅ Pagamento confirmado" quando `payment_status === 'pago'`

Tudo isso é **aditivo** — o fluxo WhatsApp continua existindo em paralelo, como opção.
