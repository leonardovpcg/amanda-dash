-- ═══════════════════════════════════════════════════════════════════════════
-- A proposta do cliente.
--
-- A via impressa para o cliente deixa de listar o orçamento — chapa, fita,
-- acessório, mão de obra — e passa a mostrar, por ambiente, o descritivo dos
-- módulos, a especificação de material e os acessórios. Igual à proposta que
-- ela já envia hoje.
--
-- O descritivo já existe: é `ambientes.detalhe`, o texto que ela escreve na
-- caixinha do cartão. Faltam os outros dois campos e o modelo.
--
-- Re-executável.
-- ═══════════════════════════════════════════════════════════════════════════

/*
  Material e acessórios, por ambiente.

  Os dois variam de ambiente para ambiente — muda a cor do MDF e mudam os
  acessórios. Só as ferragens se repetem, e essas moram no modelo.

  Texto livre, e não derivado das chapas lançadas: ela escreve
  "Interno: MDF 15mm Branco Texturizado / Externo: MDF 18mm Greige", que é
  prosa de proposta, não uma lista de itens com quantidade.
*/
alter table public.ambientes
  add column if not exists material text;
alter table public.ambientes
  add column if not exists acessorios_texto text;

/*
  O modelo da proposta.

  Mais uma chave em `configuracoes`, ao lado de catálogo, roteiro, regras e
  perfil. Guarda só o que **não** muda de projeto para projeto: ferragens, as
  observações, forma de pagamento, garantia, prazo e o fecho.

  O `check` é recriado em vez de alterado porque não dá para acrescentar valor
  a um `check` existente — mesmo laço da 0003.
*/
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
      and rel.relname = 'configuracoes'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%chave%'
  loop
    execute format('alter table public.configuracoes drop constraint %I', nome);
  end loop;

  execute $c$
    alter table public.configuracoes
      add constraint configuracoes_chave_check
      check (chave in ('catalogo','roteiro','regras','perfil','proposta'))
  $c$;
end;
$$;

/*
  Relatório final. Se esta tabela não aparecer, algo acima abortou e a
  mensagem de erro é o que importa.

  `colunas_do_ambiente` tem de sair em 2 e `aceita_proposta` em 1.
*/
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'ambientes'
      and column_name in ('material','acessorios_texto'))     as colunas_do_ambiente,
  (select count(*)
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'configuracoes'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%proposta%')     as aceita_proposta;
