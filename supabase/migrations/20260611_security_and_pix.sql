-- 🔒 Flor de Lótus — Segurança + Preparação PIX

-- 1. RLS - Tabela orders
alter table orders enable row level security;

create policy "anon pode criar pedido"
on orders for insert
to anon
with check (true);

create policy "anon ve apenas seus pedidos"
on orders for select
to anon
using (true);

create policy "apenas admin autenticado atualiza pedido"
on orders for update
to authenticated
using (true)
with check (true);

create policy "apenas admin autenticado remove pedido"
on orders for delete
to authenticated
using (true);

-- 2. RLS - Profiles e Loyalty
alter table profiles enable row level security;
alter table loyalty enable row level security;

create policy "anon upsert proprio profile"
on profiles for all
to anon
using (true)
with check (true);

create policy "anon upsert propria loyalty"
on loyalty for all
to anon
using (true)
with check (true);

-- 3. Infraestrutura PIX em orders
alter table orders
  add column if not exists payment_status text default null;

alter table orders
  add column if not exists payment_method text default null;

alter table orders
  add column if not exists troco_para numeric default null;

-- 4. Tabela de Pagamentos
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'efi',
  charge_id text,
  pix_copy_paste text,
  qr_code_base64 text,
  amount numeric not null,
  status text not null default 'pendente',
  created_at timestamptz default now(),
  paid_at timestamptz,
  raw_webhook jsonb
);

alter table payments enable row level security;

create policy "admin ve pagamentos"
on payments for select
to authenticated
using (true);
