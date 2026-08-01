# Atualizações do sistema

Esta pasta é o canal por onde o JeV Empreendimentos instalado se atualiza.

- `versao.json` — qual é a versão mais nova, o que mudou e a impressão digital (sha256) do arquivo
- `jev-X.Y.Z.html` — o sistema daquela versão

O aplicativo instalado olha este endereço sozinho a cada 3 horas, baixa, confere a impressão
digital, guarda um backup dos dados e só troca de versão no próximo reinício — e mesmo assim
faz um autoteste antes de aprovar. Deu qualquer problema, ele volta para a versão anterior.

Explicação completa em ATUALIZACOES.md, na raiz do projeto.
