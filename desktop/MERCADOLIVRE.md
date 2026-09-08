# Mercado Livre Afiliados — como o link sai, de verdade

Descoberto em 08/09/2026, dentro da conta do dono, no hub de afiliados.
**Guardado aqui de propósito**: já perdi este achado uma vez quando o
ambiente de trabalho foi reciclado. Código que não sobe para o GitHub não
existe.

## A correção de uma coisa que eu disse errado

Eu tinha afirmado, com fonte, que "o Mercado Livre não tem API de
afiliado". Isso é verdade **para API pública documentada** — e é
reclamação antiga dos afiliados. Mas o site tem um endereço INTERNO que
gera os links, e ele funciona a partir de uma sessão logada. Ou seja: dá
para automatizar, e dá para automatizar em lote.

Não é a mesma coisa que uma API oficial, e a diferença importa:

- não é documentado, então pode mudar de forma sem aviso nenhum;
- depende do dono estar logado na conta dele;
- se mudar, o sistema TEM que cair na colagem em lote e avisar, nunca
  ficar quieto gerando link errado ou nenhum.

## O endereço

```
POST https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink
Content-Type: application/json
(cookies da sessão do dono — credentials: 'include')
```

### O que vai

```json
{
  "tag": "jl20260908183348982",
  "type": "product",
  "urls": ["https://www.mercadolivre.com.br/<produto>"],
  "extraCommission": false
}
```

`tag` é o identificador de afiliado do dono — o mesmo que aparece em
"Perfil de afiliado" no hub. **Fica na configuração dele, nunca no
código.**

O campo `urls` é uma LISTA. Foi conferido com três produtos numa chamada
só: `total_items: 3, total_success: 3, total_error: 0`. É isso que torna
o abastecimento viável — um pedido resolve a fila do dia inteiro.

### O que volta

```
{ status, urls[], total_items, total_success, total_error }
```

e cada item de `urls`:

```
id, created, tag, text, short_url, long_url, type_url,
generated_date, origin_url, regex, list_url, deeplink_list_url
```

- `short_url` → o link curto, em `meli.la/XXXXXXX`. É o que vai no post.
- `text` → um texto pronto com um CÓDIGO DE BUSCA, tipo
  `🔍 Cole este texto no buscador do Mercado Livre: CX0V3Z-J3FE`.
  Serve para onde link de afiliado é barrado (Instagram, por exemplo).
  É um presente: resolve um problema que eu ia ter mais adiante.
- `type_url` veio `SOCIAL_PROFILE_ENCRYPTED`.

## A lista de produtos, com a comissão

O hub renderiza os produtos no HTML (não é XHR), em `li.poly-card`. De
cada cartão dá para tirar, sem inventar nada:

| dado | onde está |
|---|---|
| id do produto | `MLB\d+` no href |
| nome | `.poly-component__title` |
| comissão | texto `GANHOS 12%` ou `GANHOS EXTRAS 62%` |
| preço e preço cheio | `.andes-money-amount` |
| nota e vendidos | texto do cartão |
| selo | MAIS VENDIDO / MAIS BUSCADO / MAIS COMPARTILHADO |

São 18 por página, e há filtros (Ganhos extras, Mais vendidos,
Categorias) que mudam a lista.

### Por que isso muda o jogo para ele

Medido na conta dele, a comissão real do ML bate MUITO acima do catálogo
que o sistema usava:

| produto | comissão | preço | ganho por venda |
|---|---|---|---|
| Compressor portátil de ar | 62% extra | R$ 61,71 | **R$ 38,26** |
| Kit 2 refletor LED 400w | 62% extra | R$ 43,77 | **R$ 27,14** |
| Lixeira inteligente | 62% extra | R$ 25,46 | **R$ 15,79** |

O melhor produto do catálogo antigo pagava R$ 8,55. Os "Ganhos extras"
do ML pagam 3 a 4 vezes mais — e são produtos com dezenas de milhares de
vendas, não item de nicho.

## Como isso deve entrar no JeV

Molde do Kalodata, que já existe e já funciona (`desktop/kalodata.js`):
uma janela do Mercado Livre dentro do aplicativo, onde **o dono entra na
conta dele com o dedo dele**. Nenhuma senha passa pelo programa, e o
sistema nunca guarda credencial — só aproveita a sessão que ele abriu.

Daí para frente:

1. ler a lista de produtos com comissão (o garimpo de verdade);
2. gerar os links em lote pelo `createLink`;
3. cair na ficha de afiliado, e daí no grupo de ofertas e no vídeo.

**A regra que não dobra:** se o endereço interno mudar de forma, o
sistema avisa e manda colar em lote. Nunca finge que deu certo.
