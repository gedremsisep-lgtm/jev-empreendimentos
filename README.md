# JeV Empreendimentos — aplicativo de Windows e JeV Mobile

Esta pasta tem os dois aplicativos da JeV e tudo o que é preciso para publicá-los.

O sistema que você já usa continua o mesmo: um arquivo só, que guarda os dados no próprio
computador e funciona sem internet. O que mudou é a embalagem — agora ele tem um instalador
de Windows com atualização automática — e a companhia: o **JeV Mobile**, um aplicativo de
celular para a equipe preencher e encaminhar as guias do campo.

## O que tem aqui

A pasta `desktop/` contém o aplicativo de janela do Windows. Dentro dela, `app/index.html` é o
sistema completo (o mesmo arquivo que abre no navegador), `main.js` é a janela do Electron com
os menus em português e a atualização automática, `preload.js` é a ponte segura entre a janela e
a página, e `build/` guarda o ícone.

A pasta `mobile/` contém o JeV Mobile. O código-fonte fica em `src/`, o aplicativo montado fica
em `dist/` — é essa pasta que vai para o ar — e `build.sh` remonta tudo a partir dos fontes.

A pasta `marca/` contém o logotipo da JeV em todas as versões (SVG e PNG), o manual de uso e
os scripts que geram tudo. A marca já vem aplicada nos dois aplicativos e no instalador.

A pasta `nuvem/` contém o script que prepara o espaço da JeV no Supabase e o guia de como
ligar a sincronização — que é opcional.

A pasta `.github/workflows/` contém as duas receitas automáticas do GitHub: uma gera o
instalador do Windows e publica em Releases, a outra publica o JeV Mobile no GitHub Pages.

## Como as duas pontas conversam

Não existe servidor no meio. A informação anda em **pacotes** — um texto que começa com `JEV1.`
e que pode virar arquivo `.jev`, mensagem de WhatsApp ou QR Code.

Do computador para o celular vai o **catálogo**: obras e suas etapas, imóveis, veículos, ciclos
da chácara, produtos, canais, equipe, fornecedores, materiais e as categorias do financeiro. Com
ele a pessoa no campo escolhe tudo em lista, em vez de digitar. Você gera esse pacote em
**Celular da equipe → Preparar celular**.

Do celular para o computador vêm as **guias**: diário de obra, mão de obra do dia, avanço de
etapa, requisição de material, despesa, recebimento, produção da chácara e ocorrência. Elas
chegam na **Caixa de entrada**, onde você confere e aprova. Só depois da sua aprovação é que
viram registro de verdade — diário, custo, medição, requisição ou lançamento no financeiro.

De volta ao celular vai o **recibo**, confirmando o que foi lançado, para a pessoa poder apagar
as guias do aparelho sem medo de perder nada.

Tudo isso funciona com o celular sem sinal: ele guarda as guias e encaminha quando pegar wi-fi.

## E a nuvem, se você quiser

Existe um segundo caminho, opcional: ligar a sincronização pelo Supabase. Com ela, os pacotes
deixam de ser necessários quando há internet — o que você faz no escritório aparece nos outros
computadores, as guias do celular caem sozinhas na caixa de entrada e um computador novo
recupera a base inteira só entrando com o mesmo usuário. O envio por WhatsApp, arquivo e QR
continua ali, para os dias em que a obra está sem sinal.

O espaço da JeV fica em um **projeto Supabase próprio**, criado só para isso — não divide nada
com o GEDREM nem com qualquer outro sistema. As fotos e comprovantes vão para uma pasta
separada (`jev-arquivos`), fora do banco, e nada é lido ou gravado sem usuário e senha.
O passo a passo está em `nuvem/LEIAME.md`, e o próprio sistema traz o script de preparação
embutido, na tela **Nuvem da JeV**.

## Publicar pela primeira vez

Crie um repositório no GitHub e mande esta pasta para lá:

```bash
cd jevapp
git init
git add -A
git commit -m "JeV Empreendimentos + JeV Mobile"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/jev-empreendimentos.git
git push -u origin main
```

Em **Settings → Pages**, escolha a origem **GitHub Actions**. Isso libera a publicação do JeV
Mobile. A receita `publicar-mobile.yml` roda sozinha a cada envio e devolve um endereço no
formato `https://SEU-USUARIO.github.io/jev-empreendimentos/` — é esse endereço que a equipe
abre no celular para instalar o aplicativo.

Para gerar o instalador do Windows, crie uma tag de versão:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O GitHub monta o instalador em um computador Windows dele mesmo e publica em **Releases**, com
o nome `JeV-Empreendimentos-Instalador-1.0.0.exe`. Baixe, instale e pronto.

## Lançar uma versão nova

```bash
./versao.sh 1.0.1          # troca o número nos dois aplicativos
bash mobile/build.sh       # remonta o aplicativo do celular
git add -A && git commit -m "versão 1.0.1" && git push
git tag v1.0.1 && git push origin v1.0.1
```

Quem já tem o sistema instalado no Windows recebe o aviso da versão nova sozinho: o aplicativo
verifica no GitHub quando abre e a cada seis horas, baixa em segundo plano e pergunta se você
quer instalar agora ou ao fechar. Os dados não são tocados. No celular a troca também é
automática — basta abrir o aplicativo com internet uma vez.

## Uma coisa importante sobre os dados

Os dados ficam gravados no computador de quem usa, no armazenamento local do aplicativo. Isso é
bom (funciona sem internet, ninguém depende de mensalidade) e exige um cuidado: **faça o backup
toda semana** pelo botão do banco de dados, no alto da tela, e guarde o arquivo em nuvem ou
pendrive. Se o computador estragar sem backup, os dados vão junto.

Com a nuvem ligada o risco cai bastante, mas ela é uma cópia de conveniência, não um cofre:
se alguém apagar um registro por engano, o apagamento viaja para a nuvem também. O backup
semanal continua sendo o que traz de volta.

Instalar uma versão nova **não** apaga nada. Desinstalar o aplicativo também não apaga —
a opção de remover os dados fica desmarcada de propósito.

## Se preferir não usar o GitHub

O sistema continua funcionando como sempre: abra `desktop/app/index.html` no Chrome ou no Edge.
E o JeV Mobile também: mande `mobile/dist/index.html` para o celular e abra pelo navegador. Nesse
caso ele não instala como aplicativo (o Android e o iPhone exigem um endereço `https://` para
isso) e o resto funciona igual — inclusive o preenchimento sem internet e o envio por WhatsApp.
