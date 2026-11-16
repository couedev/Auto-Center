-- Execute uma vez no SQL Editor do Supabase do projeto já existente.
-- Necessário para receber INSERTs de public.agendamentos via Postgres Changes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'agendamentos'
  ) then
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      execute 'create publication supabase_realtime';
    end if;

    execute 'alter publication supabase_realtime add table public.agendamentos';
  end if;
end
$$;
