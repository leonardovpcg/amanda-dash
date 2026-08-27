-- ═══════════════════════════════════════════════════════════════════════════
-- Amanda Dash — esquema inicial
--
-- Uso de uma pessoa só. Mesmo assim toda tabela tem RLS ligada e uma coluna
-- `dono`: o Supabase publica as tabelas por PostgREST com a chave anônima, e
-- sem policy qualquer um com essa chave lê tudo. RLS aqui não é preparação
-- para multiusuário, é a fechadura da porta.
--
-- A regra que organiza o desenho: **o que pode ser calculado não vira
-- tabela**. Comissão, garantia, retorno em atraso, totais do financeiro e
-- avisos são views. Foi guardar número derivado que fez a aba "Resumo" da
-- planilha ficar R$ 11.957 abaixo do real.
--
-- A exceção deliberada é `contratos`: valor de venda é congelado na
-- assinatura, senão um reajuste na tabela de preços mudaria contrato já
-- fechado.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── ajuda ──────────────────────────────────────────────────────────────────

-- `atualizado_em` mantido pelo banco: aplicação esquece, trigger não.
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

/*
  Fuso da loja.

  Há dois relógios no produto e eles não podem se misturar: a saudação
  ("bom dia") segue o aparelho dela, mas a **data de negócio** — o que conta
  para a meta do mês e para "parado há N dias" — precisa ser sempre o fuso da
  loja. Senão a mesma venda cai em meses diferentes dependendo de onde ela
  abriu o dashboard.
*/
create or replace function public.hoje_local()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ── clientes ───────────────────────────────────────────────────────────────

/*
  A entidade que faltava.

  No protótipo `lead.name` e `projeto.client` eram textos soltos, e ligar as
  duas pontas exigiu um `projetoId` no lead. O cliente é a espinha: lead,
  briefing, projeto, orçamento, contrato, comissão e pós-venda pendem todos
  da mesma pessoa.
*/
create table if not exists public.clientes (
  id             uuid primary key default gen_random_uuid(),
  dono           uuid not null default auth.uid() references auth.users on delete cascade,
  nome           text not null,
  telefone       text,
  email          text,
  endereco       text,
  origem         text,
  -- quem indicou, quando veio de indicação: fecha o ciclo do pós-venda
  indicado_por   uuid references public.clientes on delete set null,
  nota           text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

/*
  Cada contato registrado.

  Sem esta tabela "parado há 9 dias" não existe — hoje é um número escrito à
  mão no protótipo. É ela que alimenta o alerta do funil e a faixa "Retornos
  a fazer" da agenda.
*/
create table if not exists public.interacoes (
  id          uuid primary key default gen_random_uuid(),
  dono        uuid not null default auth.uid() references auth.users on delete cascade,
  cliente_id  uuid not null references public.clientes on delete cascade,
  quando      timestamptz not null default now(),
  canal       text not null check (canal in ('ligacao','whatsapp','email','visita','loja','outro')),
  nota        text,
  criado_em   timestamptz not null default now()
);
create index if not exists interacoes_cliente_idx on public.interacoes (cliente_id, quando desc);

-- ── funil ──────────────────────────────────────────────────────────────────

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  dono            uuid not null default auth.uid() references auth.users on delete cascade,
  cliente_id      uuid not null references public.clientes on delete cascade,
  etapa           text not null default 'lead'
                    check (etapa in ('lead','visita','projeto','orcamento','negociacao','fechado')),
  -- separado da etapa de propósito: "fechado" no funil é o fim do caminho,
  -- ganho ou perdido, e relatório precisa distinguir os dois.
  resultado       text check (resultado in ('ganho','perdido')),
  motivo_perda    text,
  valor_estimado  numeric(12,2),
  -- o que ela digita no atendimento, antes de existir projeto
  ambientes_texto text,
  aberto_em       timestamptz not null default now(),
  fechado_em      timestamptz,
  atualizado_em   timestamptz not null default now()
);
create index if not exists leads_etapa_idx on public.leads (dono, etapa);

-- ── briefing ───────────────────────────────────────────────────────────────

create table if not exists public.briefings (
  id             uuid primary key default gen_random_uuid(),
  dono           uuid not null default auth.uid() references auth.users on delete cascade,
  -- um por lead: o briefing nasce antes de existir projeto
  lead_id        uuid not null unique references public.leads on delete cascade,
  nota_geral     text not null default '',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.briefing_ambientes (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null default auth.uid() references auth.users on delete cascade,
  briefing_id  uuid not null references public.briefings on delete cascade,
  -- id do roteiro de ambiente ("cozinha", "closet") — o roteiro é editável e
  -- vive em `configuracoes`, então aqui é texto, não FK
  tipo         text not null,
  -- como o cliente chama: "Suíte da filha", não "Dormitório"
  apelido      text not null,
  nota         text not null default '',
  ordem        int not null default 0
);

/*
  Uma linha por pergunta respondida.

  Duas decisões aqui:

  - **Linha ausente = "não perguntei".** Só existe registro quando ela
    respondeu ou marcou que não se aplica. É a mesma invariante do app, e é o
    que faz o contador de pendências não mentir.
  - **Normalizado, não JSONB.** Custa pouco e abre a pergunta que a dona da
    loja faz cedo ou tarde: quantos clientes pediram cooktop a gás? Sair de
    JSONB para relacional depois é migração cara.
*/
create table if not exists public.briefing_respostas (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null default auth.uid() references auth.users on delete cascade,
  briefing_id  uuid not null references public.briefings on delete cascade,
  -- nulo = pergunta do bloco geral, que não pertence a nenhum ambiente
  ambiente_id  uuid references public.briefing_ambientes on delete cascade,
  pergunta_id  text not null,
  estado       text not null check (estado in ('respondida','naoSeAplica')),
  -- string | string[] | number | boolean, conforme o tipo da pergunta
  valor        jsonb,
  -- `nulls not distinct` porque o bloco geral tem ambiente_id nulo: sem isso
  -- o Postgres trataria cada nulo como diferente e aceitaria duplicata.
  unique nulls not distinct (briefing_id, ambiente_id, pergunta_id)
);

-- ── projetos ───────────────────────────────────────────────────────────────

create table if not exists public.projetos (
  id             uuid primary key default gen_random_uuid(),
  dono           uuid not null default auth.uid() references auth.users on delete cascade,
  cliente_id     uuid not null references public.clientes on delete cascade,
  -- o lead que virou este projeto; nulo quando ela cria projeto direto
  lead_id        uuid unique references public.leads on delete set null,
  nome           text not null,
  endereco       text,
  situacao       text not null default 'aguardando'
                   check (situacao in ('aguardando','andamento','concluido','cancelado')),
  etapa          text,
  prazo          date,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.ambientes (
  id               uuid primary key default gen_random_uuid(),
  dono             uuid not null default auth.uid() references auth.users on delete cascade,
  projeto_id       uuid not null references public.projetos on delete cascade,
  nome             text not null,
  detalhe          text,
  -- 0..5, os passos de AMB_STEPS
  etapa            smallint not null default 0 check (etapa between 0 and 5),
  ordem            int not null default 0,
  -- vínculo com o briefing, criado pela ponte. Explícito e não por nome,
  -- porque os dois lados são editáveis e renomear duplicaria o ambiente.
  origem_briefing  uuid references public.briefing_ambientes on delete set null
);

/*
  Produção, entrega e montagem.

  Ela marca cada data na mão — não há cálculo por lead time. `realizado`
  separado de `previsto` para o atraso ser visível em vez de a data sumir
  quando é reagendada.
*/
create table if not exists public.ambiente_marcos (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null default auth.uid() references auth.users on delete cascade,
  ambiente_id  uuid not null references public.ambientes on delete cascade,
  tipo         text not null check (tipo in ('producao','entrega','montagem')),
  previsto     date,
  realizado    date,
  nota         text,
  unique (ambiente_id, tipo)
);

-- ── orçamento ──────────────────────────────────────────────────────────────

/*
  Uma tabela para os quatro blocos, com discriminador.

  Quatro tabelas quase idênticas só dariam quatro caminhos para a mesma
  consulta. `item_id` aponta para o catálogo, que vive em `configuracoes`
  como documento — não há FK, e é de propósito: o motor de cálculo já trata
  item removido do catálogo como pendência visível em vez de erro.
*/
create table if not exists public.orcamento_linhas (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null default auth.uid() references auth.users on delete cascade,
  ambiente_id  uuid not null references public.ambientes on delete cascade,
  bloco        text not null check (bloco in ('chapas','fita','acessorios','mao_de_obra')),
  item_id      text not null,
  -- só chapas: 6, 15 ou 18 mm
  espessura    smallint check (espessura in (6,15,18)),
  -- zero é estado válido e esperado: é a linha que a ponte lançou e que só
  -- ganha número depois do projeto 3D. Vira pendência na tela.
  qnt          numeric(10,2) not null default 0 check (qnt >= 0),
  ordem        int not null default 0,
  criado_em    timestamptz not null default now(),
  -- chapa precisa de espessura; os outros blocos não têm
  constraint espessura_so_em_chapa check (
    (bloco = 'chapas' and espessura is not null) or
    (bloco <> 'chapas' and espessura is null)
  )
);
create index if not exists orcamento_ambiente_idx on public.orcamento_linhas (ambiente_id);

-- ── contrato e dinheiro ────────────────────────────────────────────────────

/*
  O evento que separa proposta de venda.

  `valor` é **guardado**, não derivado — única quebra deliberada da regra. Um
  reajuste na tabela de preços não pode mudar contrato assinado, e
  `orcamento_snapshot` guarda o que foi vendido para a proposta continuar
  reproduzível depois do reajuste.
*/
create table if not exists public.contratos (
  id                  uuid primary key default gen_random_uuid(),
  dono                uuid not null default auth.uid() references auth.users on delete cascade,
  projeto_id          uuid not null unique references public.projetos on delete cascade,
  valor               numeric(12,2) not null check (valor >= 0),
  -- é esta data que conta para a meta do mês. Data de envio da proposta
  -- faria a meta mentir.
  assinado_em         date not null default public.hoje_local(),
  condicoes           text,
  garantia_meses      int not null default 60,
  orcamento_snapshot  jsonb,
  criado_em           timestamptz not null default now()
);

create table if not exists public.parcelas (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null default auth.uid() references auth.users on delete cascade,
  contrato_id  uuid not null references public.contratos on delete cascade,
  numero       int not null,
  valor        numeric(12,2) not null check (valor >= 0),
  vence_em     date not null,
  unique (contrato_id, numero)
);

create table if not exists public.recebimentos (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null default auth.uid() references auth.users on delete cascade,
  parcela_id   uuid not null references public.parcelas on delete cascade,
  valor        numeric(12,2) not null check (valor >= 0),
  recebido_em  date not null default public.hoje_local(),
  forma        text
);

/*
  Faixas de comissão.

  Hoje é 2% em tudo — uma linha só, de zero a sem teto. A tabela existe em
  vez de uma constante porque faixa por valor de venda é o passo natural
  seguinte, e acrescentar linha é mais barato que migrar coluna.
*/
create table if not exists public.faixas_comissao (
  id    uuid primary key default gen_random_uuid(),
  dono  uuid not null default auth.uid() references auth.users on delete cascade,
  de    numeric(12,2) not null default 0,
  -- nulo = sem teto
  ate   numeric(12,2),
  taxa  numeric(5,4) not null check (taxa >= 0 and taxa <= 1),
  check (ate is null or ate > de)
);

/*
  Meta mensal, definida por ela mesma na tela de Ajustes.

  `ano_mes` guarda o primeiro dia do mês — data em vez de texto para poder
  comparar e ordenar sem gambiarra.
*/
create table if not exists public.metas (
  dono           uuid not null default auth.uid() references auth.users on delete cascade,
  ano_mes        date not null check (extract(day from ano_mes) = 1),
  valor          numeric(12,2) not null check (valor > 0),
  atualizado_em  timestamptz not null default now(),
  primary key (dono, ano_mes)
);

-- ── agenda ─────────────────────────────────────────────────────────────────

/*
  Compromissos com hora marcada.

  Quase nenhum nasce digitado na agenda: mover o lead para "Visita técnica"
  no funil cria o compromisso, abrir assistência cria a visita. A agenda é
  consequência do que acontece nas outras telas — é isso que separa um
  dashboard de mais um formulário.

  Sem campos de sincronização: não há integração com agenda externa.
*/
create table if not exists public.compromissos (
  id             uuid primary key default gen_random_uuid(),
  dono           uuid not null default auth.uid() references auth.users on delete cascade,
  tipo           text not null check (tipo in
                   ('visita','medicao','apresentacao','entrega','montagem','assistencia','outro')),
  quando         timestamptz not null,
  duracao_min    int not null default 60,
  titulo         text,
  local          text,
  nota           text,
  situacao       text not null default 'marcado'
                   check (situacao in ('marcado','confirmado','feito','cancelado')),
  cliente_id     uuid references public.clientes on delete cascade,
  lead_id        uuid references public.leads on delete cascade,
  projeto_id     uuid references public.projetos on delete cascade,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists compromissos_quando_idx on public.compromissos (dono, quando);

-- ── pós-venda ──────────────────────────────────────────────────────────────

create table if not exists public.assistencias (
  id           uuid primary key default gen_random_uuid(),
  dono         uuid not null default auth.uid() references auth.users on delete cascade,
  projeto_id   uuid not null references public.projetos on delete cascade,
  ambiente_id  uuid references public.ambientes on delete set null,
  sintoma      text not null,
  aberta_em    date not null default public.hoje_local(),
  prazo        date,
  situacao     text not null default 'aberta'
                 check (situacao in ('aberta','peca_solicitada','agendada','resolvida')),
  resolvida_em date,
  nota         text
);

-- ── configuração ───────────────────────────────────────────────────────────

/*
  Catálogo, roteiro de briefing e regras da ponte.

  Documentos JSONB porque é exatamente assim que o app já os trata: a tela
  edita o objeto inteiro, o motor carrega o objeto inteiro, e ninguém
  consulta uma cor solta. Normalizar aqui seria trabalho sem resposta nova.
*/
create table if not exists public.configuracoes (
  dono           uuid not null default auth.uid() references auth.users on delete cascade,
  chave          text not null check (chave in ('catalogo','roteiro','regras')),
  valor          jsonb not null,
  atualizado_em  timestamptz not null default now(),
  primary key (dono, chave)
);

-- ── triggers de atualizado_em ──────────────────────────────────────────────

-- Em laço, e não sete linhas quase iguais: linha repetida à mão é onde uma
-- tabela fica de fora na primeira distração. Drop antes do create para o
-- arquivo poder ser rodado de novo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes','leads','briefings','projetos','compromissos','metas','configuracoes'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 't_' || t, t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.tocar_atualizado_em()',
      't_' || t, t
    );
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
--
-- Uma pessoa usa, mas a chave anônima do Supabase publica as tabelas na
-- internet. Sem policy, quem tiver a chave lê tudo — inclusive o briefing,
-- que guarda quem mora na casa, idade das crianças e faixa de renda.
--
-- A policy é sempre a mesma: dono = auth.uid(). `with check` idêntico ao
-- `using` para ninguém conseguir gravar linha em nome de outro.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes','interacoes','leads',
    'briefings','briefing_ambientes','briefing_respostas',
    'projetos','ambientes','ambiente_marcos','orcamento_linhas',
    'contratos','parcelas','recebimentos','faixas_comissao','metas',
    'compromissos','assistencias','configuracoes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- drop antes do create para o arquivo poder rodar de novo sem erro:
    -- create policy não aceita "if not exists".
    execute format('drop policy if exists %I on public.%I', t || '_do_dono', t);
    execute format($f$
      create policy %I on public.%I
        for all
        to authenticated
        using (dono = auth.uid())
        with check (dono = auth.uid())
    $f$, t || '_do_dono', t);
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Views — tudo que é calculado
--
-- `security_invoker` para a view respeitar a RLS de quem consulta, em vez de
-- rodar com os poderes de quem a criou. Sem isso a view seria um buraco por
-- onde os dados saem sem policy.
-- ═══════════════════════════════════════════════════════════════════════════

-- Última interação por cliente: base do "parado há N dias".
create or replace view public.v_ultimo_contato
with (security_invoker = true) as
select cliente_id, max(quando) as quando
from public.interacoes
group by cliente_id;

/*
  Funil com o tempo parado calculado.

  No protótipo `idle` era um número digitado. Aqui vem da diferença entre
  hoje e o último contato registrado — se nunca houve contato, conta da
  abertura do lead.
*/
create or replace view public.v_funil
with (security_invoker = true) as
select
  l.id, l.dono, l.etapa, l.resultado, l.valor_estimado, l.ambientes_texto,
  c.id as cliente_id, c.nome as cliente,
  coalesce(u.quando, l.aberto_em) as ultimo_contato,
  (public.hoje_local() - coalesce(u.quando, l.aberto_em)::date) as dias_parado
from public.leads l
join public.clientes c on c.id = l.cliente_id
left join public.v_ultimo_contato u on u.cliente_id = c.id
where l.resultado is null or l.resultado = 'ganho';

/*
  Retornos a fazer — a faixa da agenda que não tem tabela.

  O prazo tolerado muda com a etapa: lead novo esfria em três dias,
  negociação aguenta uma semana.
*/
create or replace view public.v_retornos
with (security_invoker = true) as
select *
from public.v_funil
where etapa in ('lead','visita','projeto','orcamento','negociacao')
  and dias_parado >= case etapa
        when 'lead'       then 3
        when 'visita'     then 5
        when 'projeto'    then 7
        when 'orcamento'  then 5
        when 'negociacao' then 7
      end;

/*
  Agenda: compromissos e marcos de projeto na mesma lista.

  Os retornos ficam de fora de propósito — eles não têm hora marcada e a
  tela os busca em `v_retornos`, numa faixa própria.
*/
create or replace view public.v_agenda
with (security_invoker = true) as
select
  co.dono, co.id, co.tipo, co.quando::date as dia, co.quando, co.titulo,
  co.local, co.situacao, c.nome as cliente, p.nome as projeto
from public.compromissos co
left join public.clientes c on c.id = co.cliente_id
left join public.projetos p on p.id = co.projeto_id
where co.situacao <> 'cancelado'
union all
select
  m.dono, m.id, m.tipo, m.previsto as dia, null::timestamptz as quando,
  a.nome as titulo, null as local,
  case when m.realizado is not null then 'feito' else 'marcado' end as situacao,
  c.nome as cliente, p.nome as projeto
from public.ambiente_marcos m
join public.ambientes a on a.id = m.ambiente_id
join public.projetos p on p.id = a.projeto_id
join public.clientes c on c.id = p.cliente_id
where m.previsto is not null;

/*
  Comissão por contrato.

  Nenhuma linha guardada: a faixa é aplicada sobre o valor do contrato, e a
  situação vem do quanto já foi recebido.
*/
create or replace view public.v_comissoes
with (security_invoker = true) as
select
  ct.dono, ct.id as contrato_id, p.nome as projeto, c.nome as cliente,
  ct.valor, ct.assinado_em,
  f.taxa,
  round(ct.valor * f.taxa, 2) as comissao,
  coalesce(r.recebido, 0) as recebido,
  case
    when coalesce(r.recebido, 0) >= ct.valor then 'recebida'
    when coalesce(r.recebido, 0) > 0         then 'a liberar'
    else 'prevista'
  end as situacao
from public.contratos ct
join public.projetos p on p.id = ct.projeto_id
join public.clientes c on c.id = p.cliente_id
left join public.faixas_comissao f
  on f.dono = ct.dono
 and ct.valor >= f.de
 and (f.ate is null or ct.valor < f.ate)
left join (
  select pa.contrato_id, sum(re.valor) as recebido
  from public.parcelas pa
  join public.recebimentos re on re.parcela_id = pa.id
  group by pa.contrato_id
) r on r.contrato_id = ct.id;

-- Vendido e recebido por mês — alimenta o gráfico e o cálculo da meta.
create or replace view public.v_financeiro_mes
with (security_invoker = true) as
select
  ct.dono,
  date_trunc('month', ct.assinado_em)::date as ano_mes,
  sum(ct.valor) as contratado,
  count(*) as contratos
from public.contratos ct
group by 1, 2;

/*
  Meta do mês.

  O percentual e o "faltam R$ X" saem daqui, nunca do banco. `left join` no
  contratado porque mês sem venda ainda precisa aparecer com a meta.
*/
create or replace view public.v_meta_mes
with (security_invoker = true) as
select
  m.dono, m.ano_mes, m.valor as meta,
  coalesce(f.contratado, 0) as vendido,
  round(coalesce(f.contratado, 0) / m.valor * 100) as pct,
  greatest(m.valor - coalesce(f.contratado, 0), 0) as falta
from public.metas m
left join public.v_financeiro_mes f
  on f.dono = m.dono and f.ano_mes = m.ano_mes;

/*
  Garantias.

  Conta da última montagem realizada, e o `having` exige que **nenhum**
  ambiente esteja pendente: filtrar as montagens não realizadas no `where`
  faria o projeto ganhar garantia assim que o primeiro ambiente ficasse
  pronto, com os outros ainda na fábrica.

  Guardar "restam 58 meses" seria um número errado no dia seguinte.
*/
create or replace view public.v_garantias
with (security_invoker = true) as
select
  ct.dono, p.id as projeto_id, p.nome as projeto,
  c.id as cliente_id, c.nome as cliente,
  max(m.realizado) as entregue_em,
  (max(m.realizado) + (ct.garantia_meses || ' months')::interval)::date as vence_em,
  ((max(m.realizado) + (ct.garantia_meses || ' months')::interval)::date
    - public.hoje_local()) as dias_restantes
from public.contratos ct
join public.projetos p  on p.id = ct.projeto_id
join public.clientes c  on c.id = p.cliente_id
join public.ambientes a on a.projeto_id = p.id
join public.ambiente_marcos m on m.ambiente_id = a.id and m.tipo = 'montagem'
group by ct.dono, p.id, p.nome, c.id, c.nome, ct.garantia_meses
having count(*) filter (where m.realizado is null) = 0;

/*
  Oportunidades de indicação: entregues há mais de 60 dias que ainda não
  indicaram ninguém. Lista de trabalho, não cadastro.
*/
create or replace view public.v_indicacoes
with (security_invoker = true) as
select g.dono, g.projeto_id, g.projeto, g.cliente_id, g.cliente, g.entregue_em,
       (public.hoje_local() - g.entregue_em) as dias_desde_entrega
from public.v_garantias g
where public.hoje_local() - g.entregue_em > 60
  -- casa por id: nome de cliente não é único nem estável
  and not exists (
    select 1 from public.clientes ind where ind.indicado_por = g.cliente_id
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Semente
--
-- `dono` tem `default auth.uid()`, que resolve certo quando a linha nasce
-- pelo app: o PostgREST carrega o JWT e a função sabe quem é. No editor SQL
-- e em migration não existe sessão autenticada — `auth.uid()` volta nulo e o
-- not-null estoura. Toda inserção feita daqui precisa dizer o dono na mão.
-- ═══════════════════════════════════════════════════════════════════════════

/*
  Faixa de comissão de quem já tem conta.

  2% de zero a sem teto, uma linha só. Vira faixa de verdade acrescentando
  linhas com `de` e `ate` diferentes.
*/
insert into public.faixas_comissao (dono, de, ate, taxa)
select u.id, 0, null, 0.0200
from auth.users u
where not exists (
  select 1 from public.faixas_comissao f where f.dono = u.id
);

/*
  E para conta criada depois desta migration.

  `security definer` porque o gatilho dispara no cadastro, antes de existir
  sessão: quem grava é o dono da função (postgres, que tem bypassrls).
  `search_path` fixo para a função não ser sequestrada por um schema plantado
  à frente no caminho de busca.
*/
create or replace function public.semear_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.faixas_comissao (dono, de, ate, taxa)
  values (new.id, 0, null, 0.0200);
  return new;
end;
$$;

drop trigger if exists semear_apos_cadastro on auth.users;
create trigger semear_apos_cadastro
after insert on auth.users
for each row execute function public.semear_usuario();
