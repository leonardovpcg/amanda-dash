# Amanda Dash

Painel comercial e de projetos para loja de móveis planejados. Next.js 16 +
Supabase.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # e preencha os dois valores
npm run dev
```

Os dois valores saem do painel do Supabase, em **Project Settings › API**:
a URL do projeto e a chave `anon`. Ela é pública por natureza — o Next embute
qualquer `NEXT_PUBLIC_*` no bundle do navegador. Quem protege os dados é a
RLS, não o segredo da chave.

A chave `service_role` ignora RLS e **não entra** em variável `NEXT_PUBLIC_`
nem em nenhum lugar do cliente.

> O Next lê `.env.local` só na subida. Depois de criar ou editar o arquivo,
> reinicie o `npm run dev`.

## Banco

O schema vive em [`supabase/migrations`](supabase/migrations). Para aplicar,
cole o arquivo no **SQL Editor** do projeto. Ele é re-executável: rodar de
novo não quebra nada.

Duas coisas que o schema assume e vale saber antes de mexer nele:

- **O que pode ser calculado não vira tabela.** Comissão, garantia, retorno
  em atraso, totais do financeiro e indicações são views. A exceção
  deliberada é `contratos.valor`, congelado na assinatura — reajuste de preço
  não pode mudar contrato fechado.
- **RLS em tudo**, com `dono = auth.uid()`. O uso é de uma pessoa só, mas a
  chave anônima publica as tabelas na internet.

## Login

O app não abre sem conta: as policies são `to authenticated`, então sem
sessão o banco não devolve nada.

Crie o usuário no painel do Supabase, em **Authentication › Users › Add
user**, e entre com ele na tela inicial.

## O que já está no banco e o que ainda não

| | Onde mora |
|---|---|
| Catálogo (tabela de valores) | Supabase, `configuracoes` |
| Roteiro de briefing | Supabase, `configuracoes` |
| Regras da ponte | Supabase, `configuracoes` |
| Clientes, leads e interações | Supabase, tabelas próprias |
| Briefings preenchidos | Supabase, três tabelas normalizadas |
| Projetos, ambientes e orçamentos | Supabase, tabelas próprias |
| Contratos, parcelas e recebimentos | Supabase, tabelas próprias |
| Meta do mês | Supabase, `metas` |
| Agenda, pós-venda e avisos | ainda com dados de protótipo |
| Perfil (nome e foto) | ainda no `localStorage` |

O app abre vazio: os dados de protótipo saíram. Cadastre pelo "+ Novo
atendimento" ou "+ Novo projeto".

Nada no painel é digitado duas vezes. Os números do topo — clientes no funil,
projetos ativos, ambientes em produção — são contados das mesmas tabelas que
as abas mostram. Comissão e Financeiro saem de contrato assinado; enquanto
não houver nenhum, mostram zero em vez de exemplo.

O contrato é registrado no painel do projeto, logo abaixo do orçamento, e é
ele que destrava "Faturado", a comissão e a meta do mês. A meta é definida em
**Ajustes › Meta do mês**; sem ela o topo não mostra barra nenhuma.

## Scripts

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção (checa tipos)
npm run lint
```
