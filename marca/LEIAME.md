# A marca da JeV Empreendimentos

O logotipo é as letras **JeV** dentro de um selo e, embaixo delas, três traços de tamanhos
diferentes apoiados na mesma base — as várias frentes da empresa sustentadas pelo mesmo
alicerce. A paleta oficial é **Petróleo e Cobre**.

Abra o `manual_da_marca.html` no navegador: ele mostra todas as versões, as cores, o espaço
livre em volta, o tamanho mínimo e o que pode e o que não pode. É a referência para passar
para gráfica, serralheria ou quem for fazer uma peça.

O `estudo_das_paletas.html` guarda as quatro paletas que foram comparadas, caso um dia você
queira rever a decisão.

## Cores

| Onde | Cor |
| --- | --- |
| Petróleo — fundo do selo, títulos, barras | `#123B4E` |
| Petróleo claro — degradê do selo | `#1C5872` |
| Cobre — letras do selo e destaques | `#E09659` |
| Cobre escuro — botões e detalhes sobre claro | `#C2703D` |
| Texto | `#0F3243` |
| Texto secundário | `#6C8794` |
| Papel (fundo claro) | `#F2F1EC` |
| Fundo escuro | `#0A2531` |

## Qual arquivo usar

A pasta `arquivos/` tem cada peça em **SVG** e em **PNG**. Use o SVG sempre que for para
gráfica, placa, adesivo ou corte — ele cresce do tamanho que precisar sem embaçar. O PNG serve
para WhatsApp, documento do Word e apresentação.

`logo-horizontal` é o padrão e resolve quase tudo: papel timbrado, contrato, site, assinatura
de e-mail. Em fundo escuro, use `logo-horizontal-escuro`. Quando o espaço for estreito e alto,
`logo-vertical`. Quando já houver o nome da empresa por perto, o `selo` sozinho basta — é ele
também que vira ícone do sistema e do aplicativo. Para foto de perfil de rede social, use
`selo-redondo`. Para carimbo, bordado e gravação em metal, as versões `selo-uma-cor-preto` e
`selo-uma-cor-branco`, que não têm degradê.

## Tipografia

Poppins — Bold no "JeV" e Medium em "EMPREENDIMENTOS", bem espaçada. Nos arquivos SVG o texto
já está convertido em curvas, então o logotipo abre igual em qualquer computador, mesmo sem a
fonte instalada. Para contratos e documentos, use Poppins ou, na falta dela, Segoe UI ou
Calibri.

## Já está aplicada

O sistema, o JeV Mobile e o instalador do Windows já vieram com a marca nova: logotipo no topo,
ícone do aplicativo, favicon, cores das telas e cabeçalho dos relatórios impressos.

## Para mexer no logotipo depois

A pasta `fonte/` tem os scripts em Python que geram tudo. `logo.py` desenha o selo e as
assinaturas, `exportar.py` gera os arquivos, `manual.py` monta o manual e `aplicar.py` aplica a
marca nos aplicativos. Se um dia a empresa mudar de cor, basta trocar a paleta em `logo.py` e
rodar de novo.
