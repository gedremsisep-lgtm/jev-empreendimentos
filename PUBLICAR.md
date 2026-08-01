# Publicar e lançar versões

Este repositório já está publicado e funcionando. O que está no ar:

- **Instalador do Windows** — em [Releases](../../releases), gerado automaticamente pelo GitHub
  a cada etiqueta de versão. O arquivo chama `JeV-Empreendimentos-Instalador-X.Y.Z.exe`.
- **JeV Mobile** — no ar em `https://gedremsisep-lgtm.github.io/jev-empreendimentos/`,
  publicado automaticamente a cada alteração na pasta `mobile/`.

Cole o endereço do celular no sistema, em **Celular da equipe → Preparar celular →
Endereço do JeV Mobile**, e use o botão **QR para abrir no celular** para a equipe ler com
a câmera.

---

## Lançar uma versão nova

```bash
./versao.sh 1.0.1          # troca o número nos dois aplicativos
bash mobile/build.sh       # remonta o aplicativo do celular
git add -A && git commit -m "versão 1.0.1" && git push
git tag v1.0.1 && git push origin v1.0.1
```

A etiqueta `v1.0.1` dispara a montagem do instalador; o push na pasta `mobile/` republica o
aplicativo do celular. Quem já tem o sistema instalado recebe o aviso sozinho, baixa em
segundo plano e instala com um clique. Os dados não são tocados.

Sem o Git instalado, dá para fazer o mesmo pelo navegador: em **Releases → Create a new
release**, escreva a etiqueta nova (por exemplo `v1.0.1`), clique em *Create new tag on
publish* e depois em **Publish release**.

---

## As duas receitas automáticas

`.github/workflows/instalador-windows.yml` roda em um computador Windows do próprio GitHub,
monta o instalador com o electron-builder e anexa em Releases junto com o `latest.yml`, que
é o arquivo que o sistema consulta para saber se existe versão nova.

`.github/workflows/publicar-mobile.yml` pega a pasta `mobile/dist` e publica no GitHub Pages.

As duas podem ser disparadas na mão pela aba **Actions**, no botão **Run workflow**.

---

## Se algo der errado

**O trabalho falhou na aba Actions.** Clique nele e depois no passo vermelho — a mensagem de
erro aparece inteira.

**O endereço do Pages dá erro 404.** Espere dois minutos e recarregue; a primeira publicação
demora um pouco a propagar.

**O Windows avisa que o programa é de origem desconhecida.** É esperado: o instalador não tem
assinatura digital, que é um certificado pago. Clique em **Mais informações → Executar assim
mesmo**.

**Repositorio público.** É o que faz a atualização automática e o Pages funcionarem de graça.
Expõe o código do sistema e nada mais: os dados ficam no computador de cada um, e o endereço
e a chave do Supabase são digitados dentro do sistema, não estão em lugar nenhum do código.
