# Como o sistema se atualiza (e como voltar atrás)

O sistema inteiro é **um arquivo só**. Atualizar, portanto, não é reinstalar nada: é trocar esse
arquivo. É por isso que uma melhoria feita hoje pode estar no seu computador em minutos, sem
instalador, sem perder dado nenhum.

## O caminho de uma melhoria até a sua tela

Quando eu termino uma melhoria, ela vira uma versão numerada e vai para a pasta `atualizacao/`
do repositório no GitHub — dois arquivos: o sistema novo e um `versao.json` dizendo qual é a
versão, o que mudou e a impressão digital do arquivo.

O aplicativo instalado olha esse endereço sozinho **a cada 3 horas** (e quando você manda, pelo
menu **Atualizações → Procurar atualização do sistema**). Achando versão nova, ele:

1. **baixa e confere a impressão digital.** Se o arquivo chegou diferente do que foi publicado,
   ele é recusado na hora — não entra nada adulterado ou pela metade;
2. **guarda um backup completo dos seus dados** na pasta do aplicativo, antes de qualquer troca;
3. **não troca nada ainda.** A versão fica de lado, esperando. Você continua trabalhando na
   versão de sempre até decidir reiniciar.

## A validação no reinício

Na primeira vez que o sistema abre com a versão nova, ele **não a considera boa ainda**. Aparece
uma faixa amarela ("Conferindo a versão…") e o sistema testa a si mesmo:

- o banco de dados abriu, e na versão certa;
- todas as 29 tabelas continuam lá;
- **nenhuma tabela tem menos registros do que tinha antes da atualização**;
- as funções essenciais do sistema existem;
- todas as 21 telas abrem, uma por uma, sem estourar erro.

Passou, a faixa fica verde: *"Versão X aplicada e conferida"*. Só aí a versão vira oficial.

Não passou, ele **desfaz a troca sozinho** e reabre na versão anterior, explicando o motivo.
E se a versão nova for tão ruim que o sistema nem abre, um relógio dentro do aplicativo percebe
que ninguém confirmou o teste em 90 segundos e desfaz do mesmo jeito. A versão com defeito é
jogada fora — ela nunca vira destino do botão de reverter.

## O botão de reverter

Em **Configurações → Atualizações** (ou no menu **Atualizações** da janela) existe o botão
**Reverter atualização**. Ele não é só para defeito: é para quando a versão nova funciona
perfeitamente mas **não é o que você pediu**. Um clique e o sistema volta para a versão anterior
e reabre.

Reverter é reversível: a versão que sai fica guardada no lugar da que entra, então dá para
avançar de novo pela mesma tela. E vale dizer de novo, porque é o que mais importa:

> **Trocar de versão nunca mexe nos seus dados.** Obras, lançamentos, cadastros, fotos e
> documentos ficam no banco do computador, que é o mesmo em todas as versões. O que vai e volta
> é só o programa.

## Onde fica tudo, no seu computador

Dentro da pasta de dados do aplicativo (o caminho exato aparece em **Ajuda → Onde ficam meus
dados**):

```
sistema/atual/       a versão que está no ar
sistema/anterior/    a versão para onde o botão de reverter leva
sistema/pendente/    a versão baixada, esperando o reinício
sistema/historico.json   tudo o que já foi aplicado, aprovado ou desfeito
backups/             backup automático de antes de cada atualização
```

O histórico aparece na tela de Atualizações, com data, versão e o que aconteceu.

## Se você não estiver com o aplicativo instalado

Abrindo o sistema direto do arquivo, no navegador, a tela de Atualizações avisa quando sai versão
nova e baixa o arquivo para você salvar por cima do antigo — os dados continuam no navegador e
não se perdem. A troca com autoteste e a volta atrás em um clique, essas só existem no aplicativo
instalado.

---

## Do meu lado: publicar uma versão nova

```
./atualizar.sh 1.0.2 "primeira nota do que mudou" "segunda nota"
git add -A && git commit -m "sistema 1.0.2" && git push
```

O `atualizar.sh` troca o número da versão nos três lugares (sistema, aplicativo e celular),
remonta o arquivo único, copia para dentro do aplicativo, gera `atualizacao/jev-1.0.2.html`,
calcula o sha256 e reescreve o `versao.json`.

Isso cobre as melhorias do dia a dia. O **instalador** (`.exe`) só precisa ser refeito quando
mudar a janela do aplicativo em si — aí é `git tag v1.0.2 && git push origin v1.0.2`, que dispara
o trabalho do GitHub e publica o instalador em Releases.
