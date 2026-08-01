#!/usr/bin/env python3
"""Manual da marca JeV Empreendimentos — paleta oficial Petróleo e Cobre."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo import (PALETAS, horizontal, vertical, icone, icone_chapado,
                  marca_texto, selo_redondo)

P = PALETAS['petroleo']

def sw(k, n, obs):
    return (f'<div class="sw"><i style="background:{P[k]}"></i>'
            f'<div><b>{n}</b><span>{P[k]}</span><em>{obs}</em></div></div>')

def pagina():
    return f'''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>JeV Empreendimentos — manual da marca</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#E9E7E2;color:#141A1D;
  line-height:1.6;padding:0 0 60px}}
.capa{{background:{P['escuro']};color:#fff;padding:52px 26px 46px}}
.in{{max-width:1000px;margin:0 auto}}
.capa h1{{font-size:30px;font-weight:800;letter-spacing:-.5px;margin-top:26px}}
.capa p{{color:#9FB8C5;font-size:15px;margin-top:8px;max-width:640px}}
section{{max-width:1000px;margin:26px auto;background:#fff;border:1px solid #DDDBD4;border-radius:20px;padding:26px}}
h2{{font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#8A9297;margin-bottom:16px}}
h3{{font-size:16px;font-weight:700;margin:22px 0 10px}}
p.t{{color:#4B565C;font-size:14.5px;max-width:760px}}
.linha{{display:flex;gap:14px;flex-wrap:wrap;margin-top:14px}}
.cx{{flex:1;min-width:250px;border-radius:16px;padding:18px 20px 22px;border:1px solid #0000000f;
  display:flex;flex-direction:column}}
.cap{{font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#00000055}}
.mid{{margin-top:18px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;flex:1}}
.sw{{background:#F7F6F3;border:1px solid #E4E1DA;border-radius:14px;padding:12px 14px;display:flex;
  align-items:center;gap:12px;font-size:12.5px;flex:1;min-width:210px}}
.sw i{{width:38px;height:38px;border-radius:10px;display:block;border:1px solid #0000001a;flex:none}}
.sw b{{display:block;font-weight:700}}
.sw span{{color:#7A8084;font-family:ui-monospace,monospace;font-size:11px;display:block}}
.sw em{{color:#8A9297;font-style:normal;font-size:11.5px;display:block;margin-top:2px}}
.regras{{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px}}
.reg{{flex:1;min-width:260px;border-radius:14px;padding:16px 18px;font-size:13.5px;line-height:1.6}}
.sim{{background:#EAF4EE;border:1px solid #C2E0CD}}
.nao{{background:#FBEDEA;border:1px solid #F0C9C1}}
.reg b{{display:block;margin-bottom:8px;font-size:13px;letter-spacing:.3px;text-transform:uppercase}}
.reg ul{{margin-left:18px}} .reg li{{margin-bottom:5px}}
table{{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:10px}}
th{{text-align:left;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:#8A9297;
  padding:9px 10px;border-bottom:1px solid #E4E1DA}}
td{{padding:10px;border-bottom:1px solid #F0EEE9;vertical-align:top}}
td.a{{font-family:ui-monospace,monospace;font-size:12px;color:{P['selo']};white-space:nowrap}}
.folga{{position:relative;display:inline-block;padding:34px;background:
  repeating-linear-gradient(45deg,#F2F1EC,#F2F1EC 6px,#E8E6DF 6px,#E8E6DF 12px);border-radius:16px}}
.folga>div{{background:#fff;padding:2px;border-radius:6px;display:inline-block;line-height:0}}
@media(max-width:700px){{.cx,.reg,.sw{{min-width:100%}}}}
</style></head><body>

<div class="capa"><div class="in">
  {horizontal(P, 88, 'escuro')}
  <h1>Manual da marca</h1>
  <p>Como usar o logotipo da JeV Empreendimentos em placa, contrato, papel timbrado,
  rede social e nos aplicativos. Guarde este arquivo — é a referência oficial.</p>
</div></div>

<section>
  <h2>A marca</h2>
  <p class="t">As letras <b>JeV</b> dentro de um selo e, embaixo delas, três traços de tamanhos
  diferentes apoiados na mesma base: as várias frentes da empresa — obra, imóvel, veículo,
  chácara, produto e mídia — todas sustentadas pelo mesmo alicerce, que é a família.
  O selo funciona sozinho como ícone; o nome completo entra ao lado ou embaixo.</p>
  <div class="linha">
    <div class="cx" style="background:{P['papel']}">
      <span class="cap">Assinatura principal — use esta sempre que puder</span>
      <div class="mid">{horizontal(P, 92)}</div>
    </div>
    <div class="cx" style="background:{P['escuro']}">
      <span class="cap" style="color:#ffffff77">Em fundo escuro</span>
      <div class="mid">{horizontal(P, 92, 'escuro')}</div>
    </div>
  </div>
  <div class="linha">
    <div class="cx" style="background:{P['papel']}">
      <span class="cap">Empilhada — espaços estreitos</span>
      <div class="mid">{vertical(P, 76)}</div>
    </div>
    <div class="cx" style="background:{P['papel']}">
      <span class="cap">Selo — ícone e redes sociais</span>
      <div class="mid">{icone(P, 76)}{selo_redondo(P, 76)}</div>
    </div>
    <div class="cx" style="background:{P['papel']}">
      <span class="cap">Só o nome</span>
      <div class="mid">{marca_texto(P, 46)}</div>
    </div>
  </div>
</section>

<section>
  <h2>Cores</h2>
  <p class="t">O petróleo manda no conjunto e o cobre entra como destaque, nunca o contrário.
  Estas são as cores do sistema, dos aplicativos e de qualquer peça da empresa.</p>
  <div class="linha" style="margin-top:16px">
    {sw('selo','Petróleo','Fundo do selo, barras, títulos')}
    {sw('marca','Cobre','Letras do selo e destaques')}
    {sw('nome_cor','Texto','Nome da empresa e corpo de texto')}
  </div>
  <div class="linha">
    {sw('sub','Texto secundário','Legendas e apoio')}
    {sw('papel','Papel','Fundo claro das peças')}
    {sw('escuro','Fundo escuro','Placas, capas e fundo de destaque')}
  </div>
</section>

<section>
  <h2>Espaço livre e tamanho mínimo</h2>
  <p class="t">Deixe em volta da marca, no mínimo, o espaço da altura do selo dividido por três.
  Nada entra nessa faixa: nem texto, nem foto, nem borda.</p>
  <div class="linha">
    <div class="cx" style="background:#fff;border:1px solid #E4E1DA">
      <span class="cap">Espaço livre</span>
      <div class="mid"><div class="folga"><div>{horizontal(P, 62)}</div></div></div>
    </div>
    <div class="cx" style="background:{P['papel']}">
      <span class="cap">Menor tamanho — o selo ainda se lê a 16 px</span>
      <div class="mid">{icone(P,64)}{icone(P,40)}{icone(P,24)}{icone(P,16)}</div>
    </div>
  </div>
  <p class="t" style="margin-top:14px">Em impressão, a assinatura horizontal não deve ficar com
  menos de 25&nbsp;mm de largura. Abaixo disso, use só o selo.</p>
</section>

<section>
  <h2>O que pode e o que não pode</h2>
  <div class="regras">
    <div class="reg sim"><b>Pode</b><ul>
      <li>Usar o selo sozinho quando o nome já aparece perto.</li>
      <li>Aplicar a versão de uma cor só em carimbo, bordado, gravação e fax.</li>
      <li>Usar o selo redondo em foto de perfil de rede social.</li>
      <li>Colocar sobre foto, desde que seja uma área escura e limpa.</li>
    </ul></div>
    <div class="reg nao"><b>Não pode</b><ul>
      <li>Trocar as cores, criar degradês novos ou usar cor de fantasia.</li>
      <li>Esticar, achatar, inclinar ou girar.</li>
      <li>Trocar a fonte do nome ou redigitar “JeV” por cima do selo.</li>
      <li>Colocar contorno, sombra dura ou brilho.</li>
      <li>Usar o selo cobre sobre fundo claro — nesse caso ele some.</li>
    </ul></div>
  </div>
</section>

<section>
  <h2>Tipografia</h2>
  <p class="t">A marca usa <b>Poppins</b> — Bold no “JeV” e Medium em “EMPREENDIMENTOS”, com as
  letras bem espaçadas. Nos arquivos SVG o texto já está em curvas, então o logotipo abre igual
  em qualquer computador, mesmo sem a fonte instalada. Para documentos e contratos, use Poppins
  ou, se não tiver, Segoe UI / Calibri — nada de fonte com serifa.</p>
</section>

<section>
  <h2>Os arquivos</h2>
  <p class="t">Estão na pasta <b>marca/</b>. Cada peça vem em SVG (para gráfica, placa e corte) e
  em PNG (para WhatsApp, documento e apresentação).</p>
  <table>
    <thead><tr><th>Arquivo</th><th>Quando usar</th></tr></thead>
    <tbody>
      <tr><td class="a">logo-horizontal</td><td>O padrão. Papel timbrado, contrato, site, assinatura de e-mail.</td></tr>
      <tr><td class="a">logo-horizontal-escuro</td><td>A mesma, para fundo escuro: placa de obra, capa, camiseta.</td></tr>
      <tr><td class="a">logo-vertical</td><td>Espaços estreitos e altos: banner, adesivo de porta, faixa.</td></tr>
      <tr><td class="a">selo</td><td>Ícone do sistema e do aplicativo, marca d'água, adesivo pequeno.</td></tr>
      <tr><td class="a">selo-redondo</td><td>Foto de perfil no WhatsApp, Instagram e Facebook.</td></tr>
      <tr><td class="a">selo-uma-cor-preto / branco</td><td>Carimbo, bordado, gravação em metal, impressão de uma cor.</td></tr>
      <tr><td class="a">so-o-nome</td><td>Quando o selo já aparece em outro canto da mesma peça.</td></tr>
    </tbody>
  </table>
</section>

<section>
  <h2>Onde a marca já está aplicada</h2>
  <p class="t">O sistema <b>JeV Empreendimentos</b>, o aplicativo <b>JeV Mobile</b> e o instalador
  do Windows já foram atualizados: logotipo no topo, ícone do aplicativo, favicon, cores das telas
  e cabeçalho dos relatórios impressos. Não é preciso fazer nada — é só usar a versão nova.</p>
</section>

</body></html>'''

if __name__ == '__main__':
    destino = sys.argv[1] if len(sys.argv) > 1 else '/root/marca/manual_da_marca.html'
    open(destino, 'w', encoding='utf-8').write(pagina())
    print(destino, os.path.getsize(destino)//1024, 'KB')
