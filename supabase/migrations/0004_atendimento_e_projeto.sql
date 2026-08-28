-- ═══════════════════════════════════════════════════════════════════════════
-- Atendimento e projeto viram um só, e o funil perde uma etapa.
--
-- Duas coisas que a Amanda apontou usando o app:
--
--   "projeto e orçamento pra marcenaria é a mesma coisa, pode manter só
--    projeto"
--   "ele passa naquelas fases do funil, só que ele já é um projeto desde o
--    início"
--
-- O schema já previa o vínculo — `projetos.lead_id` existe desde a 0001 e é
-- `unique`. O que faltava era alguém preenchê-lo: o app criava lead de um
-- lado e projeto do outro, cada um com o seu próprio cliente, e os dois nunca
-- se encontravam.
--
-- Re-executável, como os anteriores.
-- ═══════════════════════════════════════════════════════════════════════════

/* ═══════════════════════════════════════════════════════════════════════════
   Primeiro o que não depende de nada.

   Na primeira versão deste arquivo a coluna `dispensado` estava no fim, depois
   dos `drop view` e dos laços de emparelhamento. Alguma coisa lá no meio
   abortou o script na máquina dela, e a coluna — que não tem relação nenhuma
   com o resto — ficou sem ser criada. O app já dependia dela, e o aviso de
   "prazos indisponíveis" não saía da tela.

   A lição fica no arquivo: statement independente vai primeiro, para não
   ficar refém do que pode falhar depois.
   ═══════════════════════════════════════════════════════════════════════════ */

/*
  Marco de projeto que não se aplica.

  Ela pode receber o projeto pronto de um arquiteto de fora, e aí não há
  briefing; pode não haver visita técnica. Sem uma forma de dispensar, essas
  etapas ficariam "em curso" para sempre na linha do tempo, e uma linha do
  tempo que mente sobre onde o projeto está é pior que nenhuma.

  Coluna própria em vez de uma data mágica ou de texto na nota: "dispensado" e
  "sem data marcada" são estados diferentes, e distinguir os dois é o motivo
  de a coluna existir.
*/
alter table public.projeto_marcos
  add column if not exists dispensado boolean not null default false;

/*
  Comissão: 2% vira 2,5%.

  Corrigido pela própria Amanda. `v_comissoes` lê a faixa do banco, então
  trocar a linha basta — nenhum contrato precisa ser recalculado à mão.

  Vale para o previsto e para o já recebido: diferente do valor do contrato,
  a comissão não é congelada, e a taxa certa é a que ela recebe de fato.
*/
update public.faixas_comissao set taxa = 0.0250 where taxa = 0.0200;

/*
  A etapa "orcamento" sai.

  Para ela, desenhar o projeto e levantar o quantitativo é o mesmo trabalho —
  o orçamento só existe porque o projeto foi redesenhado. Duas etapas para um
  trabalho só significavam arrastar o cartão duas vezes pelo mesmo motivo.

  Migra as linhas antes de trocar o `check`: com alguém ainda em 'orcamento',
  a restrição nova seria recusada na criação.
*/
update public.leads set etapa = 'projeto' where etapa = 'orcamento';

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
      and rel.relname = 'leads'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%etapa%'
  loop
    execute format('alter table public.leads drop constraint %I', nome);
  end loop;

  execute $c$
    alter table public.leads
      add constraint leads_etapa_check
      check (etapa in ('lead','visita','projeto','negociacao','fechado'))
  $c$;
end;
$$;

/*
  O funil passa a saber o projeto de cada lead.

  Sem isto, `Lead.projetoId` era declarado no app e nunca preenchido. O cartão
  do funil mostrava a estimativa digitada em vez do valor do orçamento, e o
  briefing não chegava ao projeto — o caminho de volta não existia.

  `create or replace` não aceita coluna nova numa view, daí o drop. `v_retornos`
  depende desta, então cai e volta junto; é a única dependente.

  O limite de dias perde o ramo 'orcamento'. O prazo de 'projeto' (7 dias)
  passa a valer para a etapa fundida: era o maior dos dois, e desenhar mais
  orçar leva mais tempo que só orçar — cobrar em 5 dias criaria alarme falso.
*/
drop view if exists public.v_retornos;
drop view if exists public.v_funil;

create view public.v_funil
with (security_invoker = true) as
select
  l.id, l.dono, l.etapa, l.resultado, l.valor_estimado, l.ambientes_texto,
  c.id as cliente_id, c.nome as cliente,
  p.id as projeto_id,
  coalesce(u.quando, l.aberto_em) as ultimo_contato,
  (public.hoje_local() - coalesce(u.quando, l.aberto_em)::date) as dias_parado
from public.leads l
join public.clientes c on c.id = l.cliente_id
left join public.projetos p on p.lead_id = l.id
left join public.v_ultimo_contato u on u.cliente_id = c.id
where l.resultado is null or l.resultado = 'ganho';

create view public.v_retornos
with (security_invoker = true) as
select *
from public.v_funil
where etapa in ('lead','visita','projeto','negociacao')
  and dias_parado >= case etapa
        when 'lead'       then 3
        when 'visita'     then 5
        when 'projeto'    then 7
        when 'negociacao' then 7
      end;

-- ═══════════════════════════════════════════════════════════════════════════
-- Emparelhar o que já existe
--
-- Em laço, uma linha por vez, e não em dois `insert ... select` casados
-- depois por cliente: um cliente com dois projetos faria o pareamento em
-- massa escolher um par arbitrário, e ligar o briefing de um projeto ao outro
-- é o tipo de erro que ninguém percebe até estar na frente do cliente.
--
-- `dono` tem `default auth.uid()`, que é nulo no editor SQL. Toda inserção
-- daqui copia o dono da linha de origem, como na semente da 0001.
-- ═══════════════════════════════════════════════════════════════════════════

/*
  Lead sem projeto ganha o seu.

  O nome sai do que ela digitou em "ambientes" no atendimento — a única
  descrição que existe nesse momento — e cai no nome do cliente quando aquilo
  está vazio. Sem isso o projeto nasceria "Projeto sem nome" e ela renomearia
  um por um.
*/
do $$
declare
  r record;
begin
  for r in
    select l.id, l.dono, l.cliente_id, l.ambientes_texto, c.nome as cliente
    from public.leads l
    join public.clientes c on c.id = l.cliente_id
    where not exists (select 1 from public.projetos p where p.lead_id = l.id)
  loop
    insert into public.projetos (dono, cliente_id, lead_id, nome, situacao, etapa)
    values (
      r.dono,
      r.cliente_id,
      r.id,
      coalesce(nullif(btrim(split_part(r.ambientes_texto, '·', 1)), ''), r.cliente),
      'aguardando',
      'Medição e projeto'
    );
  end loop;
end;
$$;

/*
  Projeto sem lead ganha o seu, para aparecer no funil.

  A etapa é deduzida da situação: concluído já foi fechado, o resto está em
  projeto. É palpite, mas conservador — ela arrasta o cartão para a etapa
  certa num gesto, e a alternativa era o projeto seguir invisível no funil.

  Cancelado fica de fora: não é atendimento em aberto, e ressuscitá-lo no
  funil seria trabalho para ela fechar de novo.
*/
do $$
declare
  r record;
  novo uuid;
begin
  for r in
    select id, dono, cliente_id, nome, situacao
    from public.projetos
    where lead_id is null and situacao <> 'cancelado'
  loop
    insert into public.leads (dono, cliente_id, etapa, resultado, ambientes_texto)
    values (
      r.dono,
      r.cliente_id,
      case when r.situacao = 'concluido' then 'fechado' else 'projeto' end,
      case when r.situacao = 'concluido' then 'ganho' end,
      r.nome
    )
    returning id into novo;

    update public.projetos set lead_id = novo where id = r.id;
  end loop;
end;
$$;


/*
  Relatório final.

  O editor SQL mostra só o resultado do último comando. Este select existe
  para o script terminar dizendo o que ficou de pé — se ele não aparecer, é
  porque alguma coisa acima abortou, e aí a mensagem de erro é o que importa.
*/
select
  (select count(*) from public.leads    where etapa = 'orcamento')  as leads_em_orcamento,
  (select count(*) from public.leads    l where not exists
     (select 1 from public.projetos p where p.lead_id = l.id))      as leads_sem_projeto,
  (select count(*) from public.projetos where lead_id is null
     and situacao <> 'cancelado')                                   as projetos_sem_lead,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'projeto_marcos'
       and column_name = 'dispensado')                              as coluna_dispensado,
  (select taxa from public.faixas_comissao limit 1)                 as taxa_comissao;
