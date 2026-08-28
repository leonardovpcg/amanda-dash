-- ═══════════════════════════════════════════════════════════════════════════
-- Orçamento: ART opcional e valor de mão de obra por projeto.
--
-- Três apontamentos da Amanda:
--
--   "tornar opcional a ART (deve marcar com ou sem)"
--   "a parte da mão de obra não é bom que fique em ajustes, pois varia muito.
--    seria bom que ficasse em cada projeto"
--   "o markup pode existir para os acessórios"
--
-- Statement independente vem primeiro, como a 0004 ensinou.
-- Re-executável.
-- ═══════════════════════════════════════════════════════════════════════════

/*
  ART com ou sem, por projeto.

  A ART é uma taxa sobre o total, e nem todo trabalho leva. Não é por
  ambiente: quem assina a responsabilidade técnica assina o projeto inteiro,
  então marcar ambiente a ambiente permitiria um estado que não existe no
  mundo — metade do projeto com ART e metade sem.

  `default true` mantém o que já está lançado: os orçamentos existentes foram
  feitos com ART e o total deles não pode mudar por causa desta migration.
*/
alter table public.projetos
  add column if not exists com_art boolean not null default true;

/*
  Custo e markup por linha de orçamento.

  Nulo significa "usa o do catálogo". Não é o mesmo que zero — zero é um
  custo que ela digitou de propósito, e distinguir os dois é o que permite o
  catálogo continuar servindo de ponto de partida.

  Valem para mão de obra, que é o caso dela ("varia muito"), mas a coluna não
  é exclusiva do bloco: acessório com preço negociado para um projeto tem o
  mesmo problema, e a restrição por bloco só criaria uma migration futura.
*/
alter table public.orcamento_linhas
  add column if not exists custo_unitario numeric(12,2) check (custo_unitario >= 0);
alter table public.orcamento_linhas
  add column if not exists markup numeric(6,3) check (markup >= 0);

/*
  Relatório final, como na 0004: o editor SQL mostra só o último comando, e
  se esta tabela não aparecer é porque algo acima abortou.
*/
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'projetos'
       and column_name = 'com_art')                            as coluna_com_art,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'orcamento_linhas'
       and column_name in ('custo_unitario','markup'))         as colunas_de_override;
