-- ═══════════════════════════════════════════════════════════════════════════
-- Agenda, pós-venda e perfil — o que faltava para as últimas telas de
-- protótipo saírem do ar.
--
-- Re-executável, como os anteriores.
-- ═══════════════════════════════════════════════════════════════════════════

/*
  O perfil sai do localStorage.

  Nome e foto moram em `configuracoes`, junto com catálogo, roteiro e regras:
  é o mesmo tipo de dado — um documento só, editado inteiro, que ela muda uma
  vez e esquece. Uma tabela própria para uma linha de duas colunas só daria
  mais um caminho para a mesma coisa.

  O `check` é recriado em vez de alterado porque não dá para acrescentar valor
  a um `check` existente. Nome explícito para o `drop` achar mesmo quando o
  Postgres tiver gerado outro na primeira criação.
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
      check (chave in ('catalogo','roteiro','regras','perfil'))
  $c$;
end;
$$;

/*
  A agenda ganha a nota e os vínculos.

  Sem `nota`, a linha da agenda mostrava só o título — e é na nota que ela
  escreve o que a visita é ("medição final, cozinha e lavanderia"). Os ids
  entram para a tela poder abrir o cliente ou o projeto a partir do
  compromisso, sem uma segunda consulta por linha.

  `create or replace` não aceita mudança de colunas numa view; daí o drop.
  As policies são das tabelas, não da view, então nada se perde.
*/
drop view if exists public.v_agenda;

create view public.v_agenda
with (security_invoker = true) as
select
  co.dono, co.id, co.tipo, co.quando::date as dia, co.quando,
  co.titulo, co.nota, co.local, co.situacao,
  c.nome as cliente, p.nome as projeto,
  co.cliente_id, co.projeto_id,
  -- Compromisso é digitado por ela e pode ser apagado; marco de ambiente é
  -- consequência do andamento do projeto e some junto com ele. A tela precisa
  -- saber a diferença para não oferecer "remover" no que não se remove.
  'compromisso'::text as fonte
from public.compromissos co
left join public.clientes c on c.id = co.cliente_id
left join public.projetos p on p.id = co.projeto_id
where co.situacao <> 'cancelado'
union all
select
  m.dono, m.id, m.tipo, m.previsto as dia, null::timestamptz as quando,
  a.nome as titulo, m.nota, null as local,
  case when m.realizado is not null then 'feito' else 'marcado' end as situacao,
  c.nome as cliente, p.nome as projeto,
  p.cliente_id, p.id as projeto_id,
  'marco'::text as fonte
from public.ambiente_marcos m
join public.ambientes a on a.id = m.ambiente_id
join public.projetos p on p.id = a.projeto_id
join public.clientes c on c.id = p.cliente_id
where m.previsto is not null;

/*
  Pós-venda: a assistência precisa saber de quem é.

  A tela mostra cliente e ambiente em toda linha, e sem índice cada abertura
  varria a tabela inteira. São poucas linhas hoje; o índice é barato e evita
  o problema quando não forem.
*/
create index if not exists assistencias_projeto_idx
  on public.assistencias (projeto_id);
create index if not exists assistencias_situacao_idx
  on public.assistencias (dono, situacao);
create index if not exists ambiente_marcos_ambiente_idx
  on public.ambiente_marcos (ambiente_id);

/*
  `ambientes.eta` fica órfã.

  Era o texto livre que segurava o prazo do cartão enquanto `ambiente_marcos`
  não tinha tela. Agora tem: a legenda do cartão sai do marco previsto, e a
  coluna deixa de ser lida.

  Não é derrubada aqui de propósito — apagar coluna é irreversível, e o que
  estiver escrito nela ainda pode ser útil na primeira semana de uso. Some
  numa migration futura, depois de conferido que está vazia.
*/
comment on column public.ambientes.eta is
  'Obsoleta desde a 0003: a previsão vem de ambiente_marcos.previsto.';
