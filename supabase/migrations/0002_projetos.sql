-- ═══════════════════════════════════════════════════════════════════════════
-- Projetos — o que faltava para o app parar de guardar projeto em memória.
--
-- Re-executável, como o 0001.
-- ═══════════════════════════════════════════════════════════════════════════

/*
  Valor esperado antes de existir orçamento.

  O contrato de verdade mora em `contratos.valor`, congelado na assinatura, e
  o valor em aberto sai do orçamento calculado. Falta o terceiro caso: o
  projeto que ela acabou de abrir e ainda não orçou, mas já sabe que é de uns
  X. Sem esta coluna esse projeto apareceria valendo zero.
*/
alter table public.projetos
  add column if not exists valor_previsto numeric(12,2);

/*
  A legenda de prazo do cartão do ambiente — "18 set · montagem".

  Texto livre de propósito: enquanto a marcação por ambiente não tem tela,
  isto é o que ela escreve para lembrar. Quando `ambiente_marcos` ganhar
  interface, esta coluna vira derivada e sai.
*/
alter table public.ambientes
  add column if not exists eta text;

/*
  Marcos do projeto — a linha do tempo de seis etapas.

  Ficam separados de `ambiente_marcos` porque respondem perguntas diferentes:
  briefing, projeto e aprovação acontecem uma vez para o projeto inteiro,
  enquanto produção, entrega e montagem acontecem por ambiente (a cozinha
  embarca antes do closet).

  Os seis tipos estão aqui porque é assim que ela trabalha hoje — marca o
  prazo do projeto, não de cada ambiente. Quando a marcação por ambiente
  ganhar tela, os três últimos passam a ser derivados de `ambiente_marcos` e
  saem desta tabela; até lá, duplicar seria criar duas fontes que discordam.
*/
create table if not exists public.projeto_marcos (
  id          uuid primary key default gen_random_uuid(),
  dono        uuid not null default auth.uid() references auth.users on delete cascade,
  projeto_id  uuid not null references public.projetos on delete cascade,
  tipo        text not null check (tipo in
                ('briefing','projeto','aprovacao','producao','entrega','montagem')),
  previsto    date,
  realizado   date,
  nota        text,
  unique (projeto_id, tipo)
);

do $$
begin
  execute 'alter table public.projeto_marcos enable row level security';
  execute 'alter table public.projeto_marcos force row level security';
  execute 'drop policy if exists projeto_marcos_do_dono on public.projeto_marcos';
  execute $f$
    create policy projeto_marcos_do_dono on public.projeto_marcos
      for all
      to authenticated
      using (dono = auth.uid())
      with check (dono = auth.uid())
  $f$;
end;
$$;

create index if not exists projeto_marcos_projeto_idx on public.projeto_marcos (projeto_id);
create index if not exists ambientes_projeto_idx on public.ambientes (projeto_id);
