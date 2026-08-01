# Como remontar o sistema

O arquivo `desktop/app/index.html` é gerado — não edite ele direto, senão a próxima
montagem apaga suas mudanças. Mexa nos arquivos de `src/` e remonte:

```bash
cd desktop/fonte
npm install          # só na primeira vez
pip install fonttools brotli --break-system-packages   # só na primeira vez
bash build.sh
```

O `build.sh` junta os arquivos de `src/` na ordem e o `embed.py` embute dentro do HTML a fonte
de ícones (só os desenhos usados), o three.js da visualização 3D e o gerador/leitor de QR Code.
É isso que deixa o sistema 100% offline, sem buscar nada na internet.

Os arquivos de `src/` seguem a ordem do nome: `01_head.html` tem o CSS, `02_body.html` a
estrutura da tela, os `.js` numerados são um módulo cada (financeiro, obras, orçamento,
cronograma, materiais, mão de obra, diário, medições, projetos 3D, imóveis, veículos, chácara,
produtos, mídia, cadastros, relatórios, configurações, celular) e `24_boot.js` dá a partida.

Uma regra importante: se você acrescentar uma tabela nova na lista `STORES`, em `03_core.js`,
**tem que aumentar o `DB_VERSION` na linha logo acima**. Sem isso o navegador de quem já usa o
sistema não cria a tabela nova e a tela quebra.
