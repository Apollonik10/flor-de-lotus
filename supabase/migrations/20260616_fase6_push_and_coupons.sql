-- 🎉 Flor de Lótus — Fase 6: Push Notifications & Cupons

-- 1. Tabela de Cupons
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_percent numeric not null check (discount_percent > 0 and discount_percent <= 100),
  discount_amount numeric default null check (discount_amount is null or discount_amount > 0),
  min_order_value numeric default 0,
  max_uses integer default null,
  current_uses integer default 0,
  valid_from timestamptz default now(),
  valid_until timestamptz default null,
  active boolean default true,
  created_at timestamptz default now()
);

-- 2. Tabela de Push Subscriptions
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text default null,
  created_at timestamptz default now(),
  unique(endpoint)
);

-- 3. Tabela de Histórico de Cupons Usados
create table if not exists coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  device_id text not null,
  order_id uuid references orders(id) on delete set null,
  used_at timestamptz default now()
);

-- 4. RLS para Cupons
alter table coupons enable row level security;

create policy "anon ve cupons ativos"
on coupons for select
to anon
using (active = true and (valid_until is null or valid_until > now()));

create policy "admin gerencia cupons"
on coupons for all
to authenticated
using (true)
with check (true);

-- 5. RLS para Push Subscriptions
alter table push_subscriptions enable row level security;

create policy "anon cadastra propria subscription"
on push_subscriptions for all
to anon
using (true)
with check (true);

-- 6. RLS para Coupon Usage
alter table coupon_usage enable row level security;

create policy "anon ve proprios usos"
on coupon_usage for select
to anon
using (true);

create policy "anon registra proprio uso"
on coupon_usage for insert
to anon
with check (true);

-- 7. Índices para performance
create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_coupons_active on coupons(active, valid_until);
create index if not exists idx_push_subscriptions_endpoint on push_subscriptions(endpoint);
create index if not exists idx_push_subscriptions_device on push_subscriptions(device_id);
create index if not exists idx_coupon_usage_coupon on coupon_usage(coupon_id);

-- 8. Função para validar e aplicar cupom
create or replace function apply_coupon(p_code text, p_device_id text, p_order_value numeric)
returns jsonb as $$
declare
  v_coupon coupons%rowtype;
  v_discount numeric := 0;
  v_new_total numeric;
begin
  -- Buscar cupom
  select * into v_coupon
  from coupons
  where upper(code) = upper(p_code)
    and active = true
    and (valid_until is null or valid_until > now())
    and (max_uses is null or current_uses < max_uses)
    and p_order_value >= min_order_value;

  if not found then
    return jsonb_build_object('valid', false, 'error', 'Cupom inválido ou expirado');
  end if;

  -- Calcular desconto
  if v_coupon.discount_percent > 0 then
    v_discount := p_order_value * (v_coupon.discount_percent / 100);
  elsif v_coupon.discount_amount > 0 then
    v_discount := least(v_coupon.discount_amount, p_order_value);
  end if;

  v_new_total := p_order_value - v_discount;

  return jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'discount', round(v_discount, 2),
    'new_total', round(v_new_total, 2),
    'discount_type', case when v_coupon.discount_percent > 0 then 'percent' else 'amount' end,
    'discount_value', case when v_coupon.discount_percent > 0 then v_coupon.discount_percent else v_coupon.discount_amount end
  );
end;
$$ language plpgsql security definer;

-- 9. Função para registrar uso do cupom
create or replace function use_coupon(p_coupon_id uuid, p_device_id text, p_order_id uuid)
returns void as $$
begin
  -- Incrementar uso
  update coupons set current_uses = current_uses + 1 where id = p_coupon_id;

  -- Registrar uso
  insert into coupon_usage (coupon_id, device_id, order_id)
  values (p_coupon_id, p_device_id, p_order_id);
end;
$$ language plpgsql security definer;

-- 10. Inserir cupons de exemplo
insert into coupons (code, discount_percent, min_order_value, max_uses, valid_until) values
  ('BEMVINDO10', 10, 0, 100, now() + interval '30 days'),
  ('LOTUS20', 20, 30, 50, now() + interval '60 days'),
  ('FRETE5', 0, 5.00, 200, now() + interval '90 days')
on conflict (code) do nothing;