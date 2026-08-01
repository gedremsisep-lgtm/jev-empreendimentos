# Publicar no GitHub — passo a passo

> **Você já recebeu o instalador pronto** (`JeV-Empreendimentos-Instalador-1.0.0.exe`), montado
> aqui mesmo. Para começar a usar o sistema hoje, é só executar aquele arquivo — não precisa de
> nada disto aqui.
>
> Este guia é para o passo seguinte: publicar no GitHub, o que liga a **atualização automática**
> (a próxima versão instala sozinha, sem você baixar nada) e coloca o **JeV Mobile** num
> endereço que a equipe abre no celular.

Deixei o projeto pronto: já é um repositório Git, com o primeiro commit feito e a etiqueta
`v1.0.0` criada. Falta só mandar para o GitHub — e isso só você pode fazer, porque exige entrar
na sua conta. São dez minutos.

O GitHub vai fazer duas coisas por você, de graça e sozinho: montar o **instalador do Windows**
num computador Windows dele e publicar o **JeV Mobile** num endereço que a equipe abre no
celular.

---

## Antes: público ou privado?

Recomendo **público**. Dois motivos práticos, não é preguiça:

A publicação do aplicativo do celular (GitHub Pages) só é gratuita em repositório público. Em
repositório privado, ela exige plano pago.

A atualização automática do Windows busca a versão nova em Releases. Em repositório privado
isso só funciona embutindo uma senha de acesso dentro do programa — o que é pior para a
segurança do que deixar o código aberto.

**O que "público" expõe:** o código do sistema. Só isso. **Não** expõe nada da empresa: seus
dados ficam gravados no seu computador, e o endereço e a chave do Supabase são digitados por
você dentro do sistema, não estão em lugar nenhum do código.

Se ainda assim preferir privado, funciona: o instalador é gerado e fica em Releases para você
baixar. Você perde a atualização automática (passa a instalar a versão nova na mão) e o
aplicativo do celular precisa ser distribuído pelo arquivo `mobile/dist/index.html` em vez do
endereço na internet.

---

## Passo 1 — criar o repositório

Entre em **github.com** com a sua conta. Se ainda não tem, crie em github.com/signup — é
gratuito.

No canto superior direito, clique no **+** e depois em **New repository**.

- **Repository name:** `jev-empreendimentos`
- **Description:** Sistema de gestão da JeV Empreendimentos
- Marque **Public** (veja a explicação acima)
- **Não** marque nada em "Initialize this repository with" — nem README, nem .gitignore,
  nem licença. O projeto já vem com tudo.

Clique em **Create repository**. A página seguinte mostra o endereço do repositório, algo como
`https://github.com/seu-usuario/jev-empreendimentos.git`. Guarde ele.

---

## Passo 2 — mandar os arquivos

### Se você tem o Git instalado (mais rápido)

Descompacte o `jev-empreendimentos-completo.zip`, abra o terminal dentro da pasta `jevapp` e
rode, trocando o endereço pelo seu:

```
./publicar.sh https://github.com/seu-usuario/jev-empreendimentos.git
```

No Windows, use o Git Bash (vem junto com o Git) e o mesmo comando. Ele vai pedir seu usuário e
uma senha — nessa senha, cole um **token**: em github.com, clique na sua foto →
**Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** →
**Generate new token**, marque `repo` e `workflow`, gere e copie.

### Se você não tem o Git (pelo navegador mesmo)

Na página do repositório recém-criado, clique em **uploading an existing file**.

Abra a pasta `jevapp` no explorador de arquivos, selecione **tudo o que está dentro dela**
(Ctrl+A) e arraste para a área de upload do navegador. Espere as barrinhas terminarem — são uns
130 arquivos.

Importante: o Windows esconde pastas que começam com ponto. Antes de selecionar, ligue
**Exibir → Itens ocultos** no explorador, senão a pasta `.github` não vai junto — e é ela que
manda o GitHub montar o instalador.

Em **Commit changes**, escreva `JeV Empreendimentos 1.0.0` e clique em **Commit changes**.

---

## Passo 3 — ligar a publicação do aplicativo do celular

No repositório, vá em **Settings** (a engrenagem no menu de cima) → **Pages**, no menu da
esquerda.

Em **Build and deployment → Source**, escolha **GitHub Actions**. Não precisa salvar, ele
guarda sozinho.

Vá na aba **Actions**. Você verá o trabalho *Publicar o JeV Mobile* rodando. Em dois ou três
minutos ele fica verde e o endereço aparece: `https://seu-usuario.github.io/jev-empreendimentos/`

Esse é o endereço que a equipe abre no celular. Cole ele no sistema, em
**Celular da equipe → Preparar celular → Endereço do JeV Mobile** e clique em
**Guardar endereço** — depois o botão **QR para abrir no celular** monta o código para as
pessoas lerem com a câmera.

Se você mandou os arquivos pelo navegador, a etapa acima já roda sozinha. Se por algum motivo
não rodar, entre em **Actions**, clique em *Publicar o JeV Mobile* na lista da esquerda e depois
em **Run workflow**.

---

## Passo 4 — gerar o instalador do Windows

Se você usou o `publicar.sh`, ele já mandou a etiqueta `v1.0.0` e o instalador já está sendo
montado — pule para o final.

Se você mandou pelo navegador, crie a etiqueta assim: na página inicial do repositório, na
coluna da direita, clique em **Releases** → **Create a new release**.

- Em **Choose a tag**, escreva `v1.0.0` e clique em **Create new tag: v1.0.0 on publish**
- **Release title:** `JeV Empreendimentos 1.0.0`
- Clique em **Publish release**

Vá na aba **Actions**: o trabalho *Instalador do Windows* começa sozinho. Ele leva de cinco a
dez minutos — está baixando o Electron e montando o instalador num computador Windows do
próprio GitHub.

Quando ficar verde, volte em **Releases**. Anexado à versão 1.0.0 vai estar o arquivo:

**`JeV-Empreendimentos-Instalador-1.0.0.exe`**

Esse é o arquivo que você baixa e executa. Ele instala o JeV Empreendimentos no computador, cria
o atalho na área de trabalho, associa os arquivos `.jev` (dois cliques abrem direto na caixa de
entrada) e liga a atualização automática.

---

## Depois: lançar uma versão nova

Melhoria do dia a dia (mudou o sistema, não a janela do aplicativo) — é o caso de quase sempre:

```
./atualizar.sh 1.0.2 "o que mudou nesta versão"
git add -A && git commit -m "sistema 1.0.2" && git push
```

Pronto. Quem tem o sistema instalado recebe sozinho em até 3 horas, o sistema testa a versão nova
ao reiniciar e desfaz a troca se algo sair errado. O passo a passo completo está em
**ATUALIZACOES.md**.

Só quando mudar o aplicativo em si (a janela, os menus, a associação dos arquivos `.jev`) é que
vale refazer o instalador:

```
git tag v1.0.2 && git push origin v1.0.2
```

No celular, o aplicativo se atualiza sozinho ao abrir com internet.

---

## Se algo der errado

**O trabalho falhou na aba Actions.** Clique nele e depois no passo vermelho — a mensagem de
erro aparece inteira. Me mande o texto que eu resolvo.

**Não apareceu nenhum trabalho na aba Actions.** Quase sempre é a pasta `.github` que não subiu
(itens ocultos desligados no Windows). Confira se ela aparece na lista de arquivos do
repositório; se não, arraste ela sozinha em **Add file → Upload files**.

**O endereço do Pages dá erro 404.** Espere mais dois minutos e recarregue; a primeira
publicação demora um pouco a propagar.

**O Windows avisa que o programa é de origem desconhecida.** É esperado: o instalador não tem
assinatura digital, que é um certificado pago (uns 200 dólares por ano). Clique em
**Mais informações → Executar assim mesmo**. Se um dia quiser tirar esse aviso, dá para comprar
o certificado e eu configuro a assinatura no processo.
