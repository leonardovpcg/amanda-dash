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
| Agenda e prazos de fábrica | Supabase, `compromissos` e `ambiente_marcos` |
| Pós-venda | Supabase, `assistencias` + duas views |
| Perfil (nome e foto) | Supabase, `configuracoes` |
| Avisos | nenhum — são derivados na hora |

O app abre vazio: os dados de protótipo saíram. Cadastre pelo "+ Novo
atendimento" ou "+ Novo projeto".

Nada no painel é digitado duas vezes. Os números do topo — clientes no funil,
projetos ativos, ambientes em produção — são contados das mesmas tabelas que
as abas mostram. Comissão e Financeiro saem de contrato assinado; enquanto
não houver nenhum, mostram zero em vez de exemplo.

O contrato é registrado no painel do projeto, logo abaixo do orçamento, e é
ele que destrava "Faturado", a comissão e a meta do mês. A meta é definida em
**Ajustes › Meta do mês**; sem ela o topo não mostra barra nenhuma.

Três coisas que a tela deixa de fora de propósito, porque não são digitadas:

- **Os retornos da agenda** são os leads parados além do limite da etapa,
  calculados a cada leitura. "Atrasado 4 dias" guardado erraria amanhã.
- **A garantia** conta da montagem do último ambiente concluído — e só quando
  nenhum ambiente do projeto está pendente. Quem grava essa data é avançar o
  cartão do ambiente até "Concluído".
- **Os avisos** do sino não têm tabela. Cada um é uma condição que já está
  escrita em outro lugar, e some quando o motivo some. Por isso não há
  "marcar como lido".

A coluna "Entregas e montagens" da agenda vem dos três prazos de fábrica no
cartão de cada ambiente, dentro do projeto — não se digita na agenda.

## Orçamento

A **ART é opcional por projeto** — o interruptor fica no painel de orçamento.
É do projeto inteiro e não por ambiente: quem assina a responsabilidade
técnica assina o projeto todo.

**Custo e markup podem ser trocados por linha**, dentro do projeto, sem mexer
na tabela de valores. Campo vazio usa o do catálogo; vazio e zero são coisas
diferentes, e zero é um custo digitado de propósito.

A proposta imprime em **duas vias**: a do cliente, sem quantitativos, e a
interna, com. O multiplicador de cada linha nunca sai em nenhuma das duas —
é a margem da loja.

## Ícone de app

Dá para instalar na tela de início do celular: no Android, "Instalar app" no
menu do Chrome; no iPhone, "Adicionar à Tela de Início" no Safari. Abre sem
barra de endereço e com ícone próprio.

O símbolo mora em uma fonte só, [`src/app/icon.svg`](src/app/icon.svg). Os
PNGs que o iOS e o Android exigem são derivados dele — nenhum dos dois aceita
SVG para o ícone da tela de início. Se a geometria mudar, gere de novo:

```bash
node scripts/gerar-icones.mjs
```

No iPhone o app instalado tem armazenamento próprio, separado do Safari.
Então ele pede o login uma vez, mesmo com a sessão aberta no navegador.

## Scripts

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção (checa tipos)
npm run lint
```
