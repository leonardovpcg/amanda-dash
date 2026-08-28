-- ═══════════════════════════════════════════════════════════════════════════
-- O valor estimado do atendimento chega ao projeto.
--
-- A 0004 criou um projeto para cada lead que ainda não tinha, mas o insert
-- levava só nome, cliente e etapa — o `valor_estimado` do lead ficou para
-- trás. Resultado: o cartão do funil mostrava o valor que ela digitou e o
-- mesmo negócio aparecia zerado na aba Projetos.
--
-- Re-executável.
-- ═══════════════════════════════════════════════════════════════════════════

/*
  Copia o que existe, sem sobrescrever o que já foi decidido.

  `is null` no destino é o ponto: se ela já digitou um valor no cabeçalho do
  projeto, ele vale mais que a estimativa da abertura do atendimento —
  aquela é do primeiro telefonema, esta é depois de ver a obra.
*/
update public.projetos p
set valor_previsto = l.valor_estimado
from public.leads l
where p.lead_id = l.id
  and p.valor_previsto is null
  and l.valor_estimado is not null;

/*
  Relatório, como nas anteriores. Se esta tabela não aparecer, algo acima
  abortou e a mensagem de erro é o que importa.

  `projetos_zerados_com_lead_estimado` tem de sair em zero: é exatamente a
  divergência que ela viu na tela.
*/
select
  (select count(*) from public.projetos where valor_previsto is not null)
    as projetos_com_valor,
  (select count(*)
     from public.projetos p
     join public.leads l on l.id = p.lead_id
    where p.valor_previsto is null and l.valor_estimado is not null)
    as projetos_zerados_com_lead_estimado;
