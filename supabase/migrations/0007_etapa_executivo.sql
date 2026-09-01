-- ═══════════════════════════════════════════════════════════════════════════
-- A linha do tempo do projeto ganha "Executivo".
--
-- A régua passa a ser, na ordem que ela usa:
--
--   Briefing · Projeto · Aprovação · Executivo · Produção · Montagem · Entrega
--
-- "Executivo" é o projeto executivo, que ela desenha depois de o cliente
-- aprovar. E "Entrega" fica no fim, depois da montagem — é assim que a obra
-- dela termina.
--
-- Só isso: um valor a mais aceito. `entrega` já estava na restrição e
-- continua; a ordem é da tela, não do banco. Nenhum dado a migrar.
--
-- Re-executável.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  nome text;
begin
  for nome in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'projeto_marcos'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%tipo%'
  loop
    execute format('alter table public.projeto_marcos drop constraint %I', nome);
  end loop;

  execute $c$
    alter table public.projeto_marcos
      add constraint projeto_marcos_tipo_check
      check (tipo in
        ('briefing','projeto','aprovacao','executivo','producao','montagem','entrega'))
  $c$;
end;
$$;

/*
  Relatório final. Se esta tabela não aparecer, algo acima abortou e a
  mensagem de erro é o que importa.

  `aceita_executivo` tem de sair em 1.
*/
select
  (select count(*)
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'projeto_marcos'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%executivo%') as aceita_executivo,
  (select count(*) from public.projeto_marcos) as marcos_existentes;
