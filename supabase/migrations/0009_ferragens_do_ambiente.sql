-- ═══════════════════════════════════════════════════════════════════════════
-- Ferragem por ambiente.
--
-- As ferragens são padrão da loja e por isso moram no modelo da proposta —
-- mas mudam de vez em quando: banheiro e cozinha levam corrediça oculta. Era
-- a única das quatro categorias sem como variar de um ambiente para o outro.
--
-- Coluna opcional de propósito: em branco significa "usa o padrão do modelo",
-- e é diferente de escrever o mesmo texto do padrão à mão. Sem isso, mudar a
-- ferragem padrão da loja não alcançaria os ambientes já cadastrados.
--
-- Re-executável.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ambientes
  add column if not exists ferragens text;

/*
  Relatório final. `tem_ferragens` tem de sair em 1.
*/
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'ambientes'
      and column_name = 'ferragens') as tem_ferragens;
