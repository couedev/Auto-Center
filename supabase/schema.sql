-- AUTO CT • Supabase PostgreSQL • MVP v1
-- Execute UMA VEZ em um projeto Supabase NOVO, em SQL Editor.
-- Nao e uma migracao para tabelas preexistentes: revise antes de aplicar em producao.
-- Tabelas: perfis, configuracoes, catalogo, pedidos, pedido_itens, agendamentos.
-- Fluxo: visitante agenda/compra sem login; opcionalmente cria conta e vincula com token.
-- ATENCAO: criacoes de pedidos sao permitidas APENAS ao service_role, via rota
-- Next.js no servidor apos validar Turnstile/rate-limit. Nao expoe service_role no cliente.
-- Seguranca: RLS, funcoes com privilegios elevados isoladas no schema private.

begin;

create schema if not exists private;

-- 1) Conta opcional: perfis apenas para quem realmente se cadastra.
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  email text,
  tipo text not null default 'cliente' check (tipo in ('admin', 'cliente')),
  criado_em timestamptz not null default now()
);

-- 2) Unica empresa (id = 1). JSONB de horario: 1=segunda, ..., 7=domingo.
create table public.configuracoes (
  id integer primary key default 1 check (id = 1),
  nome_empresa text not null default 'Auto CT',
  logo_url text,
  whatsapp_numero text,
  whatsapp_ativo boolean not null default false,
  fuso_horario text not null default 'America/Santarem',
  horarios_funcionamento jsonb not null default '{
    "1":{"abre":"08:00","fecha":"18:00"},
    "2":{"abre":"08:00","fecha":"18:00"},
    "3":{"abre":"08:00","fecha":"18:00"},
    "4":{"abre":"08:00","fecha":"18:00"},
    "5":{"abre":"08:00","fecha":"18:00"},
    "6":{"abre":"08:00","fecha":"12:00"}
  }'::jsonb,
  atualizado_em timestamptz not null default now()
);

insert into public.configuracoes (id) values (1);

-- 3) Produtos e servicos na mesma tabela.
create table public.catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  tipo text not null check (tipo in ('produto', 'servico')),
  descricao text,
  imagem_url text,
  preco numeric(12,2) not null check (preco >= 0),
  estoque integer not null default 0 check (estoque >= 0),
  duracao_minutos integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint catalogo_tipo_campos check (
    (tipo = 'produto' and duracao_minutos is null)
    or (tipo = 'servico' and duracao_minutos between 15 and 480)
  )
);

-- 4) Pedido pode existir sem cliente_id: guest checkout.
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.perfis(id) on delete set null,
  nome_contato text not null,
  telefone_contato text not null,
  email_contato text,
  valor_total numeric(12,2) not null check (valor_total >= 0),
  status text not null default 'pendente' check (status in ('pendente','confirmado','cancelado')),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente','pago','estornado')),
  canal_checkout text not null default 'app' check (canal_checkout in ('app','whatsapp')),
  pago_em timestamptz,
  -- Token secreto so sera entregue uma vez ao visitante.
  token_vinculacao_hash text,
  token_expira_em timestamptz,
  criado_em timestamptz not null default now()
);

-- 5) Copia nome e preco na venda, mesmo se catalogo for editado depois.
create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  item_id uuid not null references public.catalogo(id) on delete restrict,
  nome_item text not null,
  quantidade integer not null check (quantidade between 1 and 100),
  preco_unitario numeric(12,2) not null check (preco_unitario >= 0)
);

-- 6) Agendamento vinculado a pedido; ao cancelar, libera horario.
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos(id) on delete cascade,
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  veiculo text not null,
  placa text,
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluido','cancelado')),
  criado_em timestamptz not null default now(),
  constraint agendamento_intervalo_valido check (data_fim > data_inicio),
  -- MVP: apenas UMA vaga simultanea na empresa.
  constraint agendamentos_sem_sobreposicao exclude using gist (
    tstzrange(data_inicio, data_fim, '[)') with &&
  ) where (status in ('pendente','em_andamento'))
);

create index idx_catalogo_tipo_ativo on public.catalogo(tipo, ativo);
create index idx_pedidos_cliente on public.pedidos(cliente_id, criado_em desc);
create index idx_pedidos_pagamento on public.pedidos(status_pagamento, pago_em desc);
create index idx_pedido_itens_pedido on public.pedido_itens(pedido_id);
create index idx_agendamentos_inicio on public.agendamentos(data_inicio desc);

-- Helpers para verificar admin sem recursao nas RLS.
create function private.eh_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.tipo = 'admin'
  );
$$;

-- Gera perfil apenas quando alguem cria conta (auth.users).
create function private.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfis(id, nome, email, tipo)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'nome', '')), ''),
    new.email,
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_novo_usuario
  after insert on auth.users
  for each row execute function private.ao_criar_usuario();

-- Quando o dono confirma pagamento, baixa estoque apenas UMA VEZ.
-- Nao reserva estoque em pedidos pendentes de WhatsApp.
create function private.ao_atualizar_pagamento()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_item record;
begin
  if old.status_pagamento = 'pendente' and new.status_pagamento = 'estornado' then
    raise exception 'Pagamento pendente nao pode ser estornado';
  end if;
  if old.status_pagamento = 'estornado' and new.status_pagamento <> 'estornado' then
    raise exception 'Pagamento estornado nao pode voltar ao estado anterior';
  end if;
  if old.status_pagamento = 'pago' and new.status_pagamento = 'pendente' then
    raise exception 'Pagamento pago nao pode voltar a pendente';
  end if;
  if old.status_pagamento <> 'pago' and new.status_pagamento = 'pago' then
    for v_item in
      select pi.item_id, pi.quantidade, c.tipo
      from public.pedido_itens pi
      join public.catalogo c on c.id = pi.item_id
      where pi.pedido_id = new.id
      order by pi.item_id
    loop
      if v_item.tipo = 'produto' then
        update public.catalogo
           set estoque = estoque - v_item.quantidade
         where id = v_item.item_id and estoque >= v_item.quantidade;
        if not found then
          raise exception 'Estoque insuficiente no produto %', v_item.item_id;
        end if;
      end if;
    end loop;
    new.pago_em := now();
  end if;
  return new;
end;
$$;

create trigger trg_pedido_pagamento
  before update of status_pagamento on public.pedidos
  for each row execute function private.ao_atualizar_pagamento();

create function private.ao_cancelar_pedido()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' then
    update public.agendamentos
       set status = 'cancelado'
     where pedido_id = new.id and status in ('pendente','em_andamento');
  end if;
  return new;
end;
$$;

create trigger trg_cancelamento_pedido
  after update of status on public.pedidos
  for each row execute function private.ao_cancelar_pedido();

-- Seguranca das seis tabelas.
alter table public.perfis enable row level security;
alter table public.configuracoes enable row level security;
alter table public.catalogo enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.agendamentos enable row level security;

revoke all on public.perfis, public.configuracoes, public.catalogo,
  public.pedidos, public.pedido_itens, public.agendamentos from anon, authenticated;

grant select on public.perfis to authenticated;
grant update (nome, telefone) on public.perfis to authenticated;
grant select, update on public.configuracoes to authenticated;
grant select on public.catalogo to anon, authenticated;
grant insert, update, delete on public.catalogo to authenticated;
grant select on public.pedidos, public.pedido_itens, public.agendamentos to authenticated;
grant update (status, status_pagamento) on public.pedidos to authenticated;
grant update (status) on public.agendamentos to authenticated;

create policy perfis_ler on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select private.eh_admin()));
create policy perfis_editar on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy configuracoes_admin_ler on public.configuracoes for select to authenticated
  using ((select private.eh_admin()));
create policy configuracoes_admin_editar on public.configuracoes for update to authenticated
  using ((select private.eh_admin())) with check ((select private.eh_admin()));

create policy catalogo_publico_ler on public.catalogo for select to anon, authenticated
  using (ativo or (select private.eh_admin()));
create policy catalogo_admin_inserir on public.catalogo for insert to authenticated
  with check ((select private.eh_admin()));
create policy catalogo_admin_editar on public.catalogo for update to authenticated
  using ((select private.eh_admin())) with check ((select private.eh_admin()));
create policy catalogo_admin_excluir on public.catalogo for delete to authenticated
  using ((select private.eh_admin()));

create policy pedidos_ler on public.pedidos for select to authenticated
  using (cliente_id = (select auth.uid()) or (select private.eh_admin()));
create policy pedidos_admin_editar on public.pedidos for update to authenticated
  using ((select private.eh_admin())) with check ((select private.eh_admin()));

create policy pedido_itens_ler on public.pedido_itens for select to authenticated
  using (
    (select private.eh_admin()) or exists (
      select 1 from public.pedidos p
       where p.id = pedido_id and p.cliente_id = (select auth.uid())
    )
  );

create policy agendamentos_ler on public.agendamentos for select to authenticated
  using (
    (select private.eh_admin()) or exists (
      select 1 from public.pedidos p
       where p.id = pedido_id and p.cliente_id = (select auth.uid())
    )
  );
create policy agendamentos_admin_editar on public.agendamentos for update to authenticated
  using ((select private.eh_admin())) with check ((select private.eh_admin()));

-- FUNCOES PRIVADAS: privilegios elevados, fora do schema exposto na Data API.
-- O publico usa apenas os wrappers SECURITY INVOKER mais abaixo.

-- Dados publicos de configuracao, sem permitir SELECT direto na tabela.
create function private.configuracao_publica_impl()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'nome_empresa', c.nome_empresa,
    'logo_url', c.logo_url,
    'whatsapp_ativo', (c.whatsapp_ativo and nullif(c.whatsapp_numero, '') is not null),
    'whatsapp_numero', case when c.whatsapp_ativo then c.whatsapp_numero else null end,
    'fuso_horario', c.fuso_horario
  )
  from public.configuracoes c where c.id = 1;
$$;

-- Retorna faixas de 30 em 30 min e se cada uma esta livre.
create function private.horarios_disponiveis_impl(p_servico_id uuid, p_data date)
returns table(horario text, disponivel boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_cfg public.configuracoes%rowtype;
  v_duracao integer;
  v_dia jsonb;
  v_cursor timestamp;
  v_fim timestamp;
  v_ini_tz timestamptz;
  v_fim_tz timestamptz;
begin
  if p_data is null then return; end if;
  select * into v_cfg from public.configuracoes where id = 1;
  select duracao_minutos into v_duracao from public.catalogo
    where id = p_servico_id and tipo = 'servico' and ativo;
  if v_duracao is null then return; end if;
  if p_data < (now() at time zone v_cfg.fuso_horario)::date or
     p_data > (now() at time zone v_cfg.fuso_horario)::date + 90 then
    return;
  end if;
  v_dia := v_cfg.horarios_funcionamento -> extract(isodow from p_data)::integer::text;
  if v_dia is null or jsonb_typeof(v_dia) <> 'object' then return; end if;
  v_cursor := p_data + (v_dia ->> 'abre')::time;
  v_fim := p_data + (v_dia ->> 'fecha')::time;
  while v_cursor + make_interval(mins => v_duracao) <= v_fim loop
    v_ini_tz := v_cursor at time zone v_cfg.fuso_horario;
    v_fim_tz := (v_cursor + make_interval(mins => v_duracao)) at time zone v_cfg.fuso_horario;
    horario := to_char(v_cursor, 'HH24:MI');
    disponivel := v_ini_tz > now() and not exists (
      select 1 from public.agendamentos a
      where a.status in ('pendente','em_andamento')
        and tstzrange(a.data_inicio, a.data_fim, '[)') && tstzrange(v_ini_tz, v_fim_tz, '[)')
    );
    return next;
    v_cursor := v_cursor + interval '30 minutes';
  end loop;
end;
$$;

-- Cria agendamento e pedido de servico de forma ATOMICA (tudo ou nada).
create function private.criar_agendamento_impl(
  p_servico_id uuid, p_nome text, p_telefone text, p_email text,
  p_veiculo text, p_placa text, p_inicio timestamptz, p_canal text, p_cliente_id uuid
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_serv public.catalogo%rowtype;
  v_cfg public.configuracoes%rowtype;
  v_fim timestamptz;
  v_inicio_local timestamp;
  v_fim_local timestamp;
  v_dia jsonb;
  v_telefone text;
  v_token text;
  v_id uuid;
  v_ag_id uuid;
  v_cliente_id uuid;
begin
  if length(btrim(coalesce(p_nome,''))) not between 2 and 120 or
     length(btrim(coalesce(p_veiculo,''))) not between 2 and 100 then
    raise exception 'Informe nome e veiculo validos';
  end if;
  v_telefone := regexp_replace(coalesce(p_telefone,''), '[^0-9]', '', 'g');
  if length(v_telefone) not between 10 and 13 then
    raise exception 'Telefone invalido';
  end if;
  if p_email is not null and btrim(p_email) <> '' and (
    length(p_email) > 254 or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception 'Email invalido';
  end if;
  if p_inicio is null or p_canal not in ('app','whatsapp') then
    raise exception 'Data ou canal invalido';
  end if;

  select * into v_cfg from public.configuracoes where id = 1;
  select * into v_serv from public.catalogo
   where id = p_servico_id and ativo and tipo = 'servico';
  if not found then raise exception 'Servico indisponivel'; end if;
  v_fim := p_inicio + make_interval(mins => v_serv.duracao_minutos);
  v_inicio_local := p_inicio at time zone v_cfg.fuso_horario;
  v_fim_local := v_fim at time zone v_cfg.fuso_horario;
  if p_inicio <= now() or
     v_inicio_local::date > (now() at time zone v_cfg.fuso_horario)::date + 90 then
    raise exception 'Data fora do periodo permitido';
  end if;
  v_dia := v_cfg.horarios_funcionamento -> extract(isodow from v_inicio_local)::integer::text;
  if v_dia is null or jsonb_typeof(v_dia) <> 'object' or
     v_inicio_local::date <> v_fim_local::date or
     v_inicio_local::time < (v_dia ->> 'abre')::time or
     v_fim_local::time > (v_dia ->> 'fecha')::time or
     extract(minute from v_inicio_local)::integer % 30 <> 0 or
     extract(second from v_inicio_local) <> 0 then
    raise exception 'Horario indisponivel ou fora do funcionamento';
  end if;
  -- O indice EXCLUDE na tabela previne concorrencia ate sob acessos simultaneos.
  if exists (
    select 1 from public.agendamentos a
    where a.status in ('pendente','em_andamento')
      and tstzrange(a.data_inicio, a.data_fim, '[)') && tstzrange(p_inicio, v_fim, '[)')
  ) then
    raise exception 'Horario ja reservado';
  end if;

  -- O endpoint Next.js valida a sessao e passa SOMENTE um UUID autenticado.
  v_cliente_id := p_cliente_id;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.pedidos (
    cliente_id, nome_contato, telefone_contato, email_contato,
    valor_total, canal_checkout, token_vinculacao_hash, token_expira_em
  ) values (
    v_cliente_id, btrim(p_nome), v_telefone, nullif(lower(btrim(p_email)), ''),
    v_serv.preco, p_canal, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '90 days'
  ) returning id into v_id;

  insert into public.pedido_itens(pedido_id, item_id, nome_item, quantidade, preco_unitario)
  values (v_id, v_serv.id, v_serv.nome, 1, v_serv.preco);

  insert into public.agendamentos(pedido_id, data_inicio, data_fim, veiculo, placa)
  values (v_id, p_inicio, v_fim, btrim(p_veiculo), nullif(upper(btrim(p_placa)), ''))
  returning id into v_ag_id;

  return jsonb_build_object(
    'pedido_id', v_id, 'agendamento_id', v_ag_id,
    'token_vinculacao', case when v_cliente_id is null then v_token else null end,
    'valor_total', v_serv.preco, 'status', 'pendente',
    'whatsapp_ativo', v_cfg.whatsapp_ativo and nullif(v_cfg.whatsapp_numero, '') is not null,
    'whatsapp_numero', case when v_cfg.whatsapp_ativo then v_cfg.whatsapp_numero else null end
  );
exception when exclusion_violation then
  raise exception 'Este horario acabou de ser reservado; selecione outro';
end;
$$;

-- Produtos: sem conta, com snapshots de preco. Estoque debitado so apos pagamento.
create function private.criar_pedido_produtos_impl(
  p_itens jsonb, p_nome text, p_telefone text, p_email text, p_canal text, p_cliente_id uuid
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_token text;
  v_cliente_id uuid;
  v_valor numeric(12,2) := 0;
  v_telefone text;
  v_linha record;
  v_prod public.catalogo%rowtype;
  v_cfg public.configuracoes%rowtype;
begin
  if jsonb_typeof(p_itens) is distinct from 'array' or
     jsonb_array_length(p_itens) not between 1 and 10 then
    raise exception 'Informe de 1 a 10 itens';
  end if;
  if length(btrim(coalesce(p_nome,''))) not between 2 and 120 then
    raise exception 'Nome invalido';
  end if;
  v_telefone := regexp_replace(coalesce(p_telefone,''), '[^0-9]', '', 'g');
  if length(v_telefone) not between 10 and 13 then raise exception 'Telefone invalido'; end if;
  if p_email is not null and btrim(p_email) <> '' and (
    length(p_email) > 254 or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then raise exception 'Email invalido'; end if;
  if p_canal not in ('app','whatsapp') then raise exception 'Canal invalido'; end if;

  -- Recusa IDs duplicados, quantidades invalidas e campos ausentes.
  if exists (
    select 1 from jsonb_to_recordset(p_itens) as i(id uuid, quantidade integer)
    where i.id is null or i.quantidade is null or i.quantidade not between 1 and 20
  ) or (
    select count(distinct i.id) from jsonb_to_recordset(p_itens) as i(id uuid, quantidade integer)
  ) <> jsonb_array_length(p_itens) then
    raise exception 'Itens repetidos ou quantidades invalidas';
  end if;

  select * into v_cfg from public.configuracoes where id = 1;
  -- O endpoint Next.js valida a sessao e passa SOMENTE um UUID autenticado.
  v_cliente_id := p_cliente_id;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.pedidos(
    cliente_id, nome_contato, telefone_contato, email_contato,
    valor_total, canal_checkout, token_vinculacao_hash, token_expira_em
  ) values (
    v_cliente_id, btrim(p_nome), v_telefone, nullif(lower(btrim(p_email)),''),
    0, p_canal, encode(sha256(convert_to(v_token,'UTF8')),'hex'), now() + interval '90 days'
  ) returning id into v_id;

  for v_linha in
    select i.id, i.quantidade
    from jsonb_to_recordset(p_itens) as i(id uuid, quantidade integer)
    order by i.id
  loop
    select * into v_prod from public.catalogo
     where id = v_linha.id and tipo = 'produto' and ativo for update;
    if not found then raise exception 'Produto indisponivel: %', v_linha.id; end if;
    if v_prod.estoque < v_linha.quantidade then
      raise exception 'Estoque insuficiente: %', v_prod.nome;
    end if;
    insert into public.pedido_itens(pedido_id, item_id, nome_item, quantidade, preco_unitario)
    values (v_id, v_prod.id, v_prod.nome, v_linha.quantidade, v_prod.preco);
    v_valor := v_valor + v_prod.preco * v_linha.quantidade;
  end loop;
  update public.pedidos set valor_total = v_valor where id = v_id;
  return jsonb_build_object(
    'pedido_id', v_id, 'token_vinculacao',
    case when v_cliente_id is null then v_token else null end,
    'valor_total', v_valor, 'status', 'pendente',
    'whatsapp_ativo', v_cfg.whatsapp_ativo and nullif(v_cfg.whatsapp_numero,'') is not null,
    'whatsapp_numero', case when v_cfg.whatsapp_ativo then v_cfg.whatsapp_numero else null end
  );
end;
$$;

-- Depois de autenticar, o usuario associa seu pedido de visitante ao perfil.
-- Nao usa telefone/email como prova de propriedade; exige o token original.
create function private.vincular_pedido_impl(p_pedido_id uuid, p_token text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_pedido_id is null or
     length(coalesce(p_token,'')) <> 64 then
    raise exception 'Login e token valido sao obrigatorios';
  end if;
  update public.pedidos
     set cliente_id = v_uid, token_vinculacao_hash = null, token_expira_em = null
   where id = p_pedido_id
     and cliente_id is null
     and token_expira_em > now()
     and token_vinculacao_hash = encode(sha256(convert_to(p_token,'UTF8')),'hex');
  return found;
end;
$$;

-- Wrappers publicos sem privilegio elevado (somente validacao dentro das private).
create function public.configuracao_publica()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.configuracao_publica_impl(); $$;

create function public.horarios_disponiveis(p_servico_id uuid, p_data date)
returns table(horario text, disponivel boolean)
language sql stable security invoker set search_path = ''
as $$ select * from private.horarios_disponiveis_impl(p_servico_id, p_data); $$;

create function public.criar_agendamento_sem_conta(
  p_servico_id uuid, p_nome text, p_telefone text, p_email text,
  p_veiculo text, p_placa text, p_inicio timestamptz, p_canal text default 'app',
  p_cliente_id uuid default null
) returns jsonb language sql volatile security invoker set search_path = ''
as $$ select private.criar_agendamento_impl(
  p_servico_id, p_nome, p_telefone, p_email, p_veiculo, p_placa, p_inicio, p_canal, p_cliente_id
); $$;

create function public.criar_pedido_produtos_sem_conta(
  p_itens jsonb, p_nome text, p_telefone text, p_email text, p_canal text default 'app',
  p_cliente_id uuid default null
) returns jsonb language sql volatile security invoker set search_path = ''
as $$ select private.criar_pedido_produtos_impl(
  p_itens, p_nome, p_telefone, p_email, p_canal, p_cliente_id
); $$;

create function public.vincular_pedido_apos_cadastro(p_pedido_id uuid, p_token text)
returns boolean language sql volatile security invoker set search_path = ''
as $$ select private.vincular_pedido_impl(p_pedido_id, p_token); $$;

-- Funcao de trigger so pode ser executada por triggers.
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.configuracao_publica() from public, anon, authenticated;
revoke all on function public.horarios_disponiveis(uuid,date) from public, anon, authenticated;
revoke all on function public.criar_agendamento_sem_conta(uuid,text,text,text,text,text,timestamptz,text,uuid) from public, anon, authenticated;
revoke all on function public.criar_pedido_produtos_sem_conta(jsonb,text,text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.vincular_pedido_apos_cadastro(uuid,text) from public, anon, authenticated;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.eh_admin() to anon, authenticated;
grant execute on function private.configuracao_publica_impl() to anon, authenticated;
grant execute on function private.horarios_disponiveis_impl(uuid,date) to anon, authenticated;
grant execute on function private.criar_agendamento_impl(uuid,text,text,text,text,text,timestamptz,text,uuid) to service_role;
grant execute on function private.criar_pedido_produtos_impl(jsonb,text,text,text,text,uuid) to service_role;
grant execute on function private.vincular_pedido_impl(uuid,text) to authenticated;

grant execute on function public.configuracao_publica() to anon, authenticated;
grant execute on function public.horarios_disponiveis(uuid,date) to anon, authenticated;
grant execute on function public.criar_agendamento_sem_conta(uuid,text,text,text,text,text,timestamptz,text,uuid) to service_role;
grant execute on function public.criar_pedido_produtos_sem_conta(jsonb,text,text,text,text,uuid) to service_role;
grant execute on function public.vincular_pedido_apos_cadastro(uuid,text) to authenticated;

commit;

-- =============================================================
-- APOS EXECUTAR E CRIAR UMA CONTA NO SUPABASE AUTH:
-- Promova manualmente SOMENTE o proprietario (no SQL Editor).
-- Troque pelo e-mail real e confirmado do administrador.
--
-- update public.perfis set tipo = 'admin'
-- where id = (
--   select id from auth.users
--   where email = 'EMAIL_VERIFICADO_DO_ADMIN' and email_confirmed_at is not null
-- );
--
-- Exemplos de servicos (NAO EXECUTADOS; valores ilustrativos):
-- insert into public.catalogo(nome,tipo,preco,duracao_minutos)
-- values ('Lavagem carro simples','servico',100,60),
--        ('Lavagem caminhao','servico',150,90),
--        ('Lavagem carreta','servico',300,120);
--
-- Consultar faturamento por mes (somente admin):
-- select date_trunc('month', pago_em at time zone 'America/Santarem') as mes,
--        count(*) as vendas, sum(valor_total) as faturamento
-- from public.pedidos
-- where status_pagamento = 'pago' and pago_em is not null
-- group by 1 order by 1 desc;
--
-- IMPORTANTE: expor criacao apenas pelo seu Next.js server route.
-- Valide CAPTCHA/Turnstile e rate limit no servidor ANTES de chamar
-- RPC com service_role. Se usuario estiver logado, valide sessao no
-- servidor e passe p_cliente_id=auth.user.id; senao passe null.
-- Nunca mande a chave service_role para o navegador.
