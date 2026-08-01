#!/usr/bin/env python3
"""Monta o estudo de marca: o mesmo logotipo em quatro paletas, com aplicações."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo import PALETAS, horizontal, vertical, icone, icone_chapado, marca_texto, selo_redondo

def bloco(p):
    sw = ''.join(
        f'<div class="sw"><i style="background:{p[k]}"></i><b>{n}</b><span>{p[k]}</span></div>'
        for k, n in [('selo','Cor principal'),('marca','Cor de destaque'),
                     ('nome_cor','Texto'),('sub','Texto secundário'),('papel','Fundo claro')])
    return f'''
  <section class="pal" id="{p['chave']}">
    <header>
      <div class="tag">{p['nome']}</div>
      <p>{p['descr']}</p>
    </header>

    <div class="linha">
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Assinatura principal</span>
        <div class="mid">{horizontal(p, 96)}</div>
      </div>
      <div class="cx" style="background:{p['escuro']}">
        <span class="cap" style="color:#ffffff88">Em fundo escuro</span>
        <div class="mid">{horizontal(p, 96, 'escuro')}</div>
      </div>
    </div>

    <div class="linha">
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Versão empilhada</span>
        <div class="mid">{vertical(p, 84)}</div>
      </div>
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Só o nome</span>
        <div class="mid">{marca_texto(p, 52)}</div>
      </div>
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Selo redondo — carimbo e perfil</span>
        <div class="mid">{selo_redondo(p, 96)}</div>
      </div>
    </div>

    <div class="linha">
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Ícone do sistema e do aplicativo, do maior ao menor</span>
        <div class="mid ic">{icone(p,88)}{icone(p,56)}{icone(p,40)}{icone(p,28)}{icone(p,18)}</div>
      </div>
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Uma cor só — carimbo, bordado, gravação</span>
        <div class="mid ic">{icone_chapado(p,64,'preto')}
          <div style="background:{p['escuro']};padding:10px;border-radius:12px;display:flex">{icone_chapado(p,64,'branco')}</div>
        </div>
      </div>
    </div>

    <div class="cores">{sw}</div>

    <div class="linha apps">
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Na tela do celular</span>
        <div class="mid">
          <div class="fone">
            <div class="app">{icone(p,54)}<b>JeV Mobile</b></div>
            <div class="app off"><div class="q"></div><b>Fotos</b></div>
            <div class="app off"><div class="q"></div><b>WhatsApp</b></div>
          </div>
        </div>
      </div>
      <div class="cx" style="background:{p['papel']}">
        <span class="cap">Placa de obra</span>
        <div class="mid">
          <div class="placa" style="background:{p['escuro']};border-color:{p['marca']}">
            {horizontal(p, 44, 'escuro')}
            <div class="ln" style="background:{p['marca']}33"></div>
            <div class="txt" style="color:#ffffffcc">Residencial Alvorada · 320 m²<br>
              <span style="color:{p['marca']}">Execução e gerenciamento</span></div>
          </div>
        </div>
      </div>
      <div class="cx" style="background:#fff">
        <span class="cap">Papel timbrado</span>
        <div class="mid">
          <div class="folha">
            {horizontal(p, 30)}
            <div class="rasc"><i></i><i></i><i style="width:60%"></i><i></i><i style="width:75%"></i></div>
            <div class="pe" style="border-color:{p['marca']}">
              <span style="color:{p['sub']}">Rua Exemplo, 100 · (62) 90000-0000 · jevempreendimentos.com.br</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>'''

def pagina():
    blocos = ''.join(bloco(PALETAS[k]) for k in ['grafite','petroleo','oliva','atual'])
    comparar = ''.join(
        f'<div class="cmp"><div>{icone(PALETAS[k],72)}</div><b>{PALETAS[k]["nome"]}</b></div>'
        for k in ['grafite','petroleo','oliva','atual'])
    return f'''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>JeV Empreendimentos — estudo de marca</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#E9E7E2;color:#1A1D1F;
  line-height:1.55;padding:34px 22px 60px}}
.topo{{max-width:1080px;margin:0 auto 34px}}
.topo h1{{font-size:26px;font-weight:800;letter-spacing:-.4px}}
.topo p{{color:#5C6367;font-size:15px;margin-top:8px;max-width:760px}}
.topo .obs{{background:#fff;border-radius:14px;padding:15px 17px;margin-top:18px;font-size:14px;color:#41474A;
  border:1px solid #D8D5CE}}
.escolha{{display:flex;gap:14px;flex-wrap:wrap;margin-top:18px}}
.cmp{{background:#fff;border:1px solid #D8D5CE;border-radius:14px;padding:14px 16px;text-align:center;min-width:150px}}
.cmp b{{display:block;font-size:12.5px;margin-top:9px;color:#41474A}}
section.pal{{max-width:1080px;margin:0 auto 40px;background:#fff;border:1px solid #D8D5CE;
  border-radius:20px;padding:24px;box-shadow:0 1px 2px rgba(0,0,0,.04)}}
section.pal header{{margin-bottom:18px}}
.tag{{display:inline-block;font-size:17px;font-weight:800;letter-spacing:-.2px}}
section.pal header p{{color:#5C6367;font-size:14px;margin-top:5px;max-width:720px}}
.linha{{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px}}
.cx{{flex:1;min-width:270px;border-radius:16px;padding:16px 18px 20px;border:1px solid #0000000f}}
.cap{{font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#00000066;display:block}}
.mid{{margin-top:16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}}
.mid.ic{{gap:16px}}
.cores{{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 16px}}
.sw{{background:#F7F6F3;border:1px solid #E4E1DA;border-radius:12px;padding:9px 12px;display:flex;
  align-items:center;gap:10px;font-size:12px}}
.sw i{{width:24px;height:24px;border-radius:7px;display:block;border:1px solid #0000001a}}
.sw b{{font-weight:700}} .sw span{{color:#7A8084;font-family:ui-monospace,monospace;font-size:11px}}
.apps .cx{{min-width:300px}}
.fone{{display:flex;gap:16px;align-items:flex-start}}
.app{{text-align:center;font-size:10.5px;color:#00000099;width:60px}}
.app b{{display:block;margin-top:6px;font-weight:600}}
.app .q{{width:54px;height:54px;border-radius:13px;background:#0000000d;border:1px dashed #00000022}}
.app.off{{opacity:.5}}
.placa{{border-radius:12px;padding:16px 18px;border:2px solid;min-width:250px}}
.placa .ln{{height:1px;margin:12px 0}}
.placa .txt{{font-size:11.5px;line-height:1.6}}
.folha{{background:#fff;border:1px solid #E4E1DA;border-radius:8px;padding:16px;min-width:230px;
  box-shadow:0 2px 10px rgba(0,0,0,.06)}}
.rasc{{margin:16px 0}}
.rasc i{{display:block;height:5px;background:#0000000d;border-radius:3px;margin-bottom:7px;width:100%}}
.pe{{border-top:2px solid;padding-top:8px;font-size:9px}}
@media(max-width:700px){{.cx{{min-width:100%}}}}
</style></head><body>

<div class="topo">
  <h1>JeV Empreendimentos — estudo de marca</h1>
  <p>O mesmo logotipo desenhado em quatro paletas. O desenho é sempre este: as letras
  <b>JeV</b> dentro de um selo e, embaixo delas, três traços de tamanhos diferentes apoiados
  na mesma base — as várias frentes da empresa, todas sustentadas pelo mesmo alicerce.
  Compare com calma e me diga qual paleta fica.</p>
  <div class="obs">O logotipo é vetorial: cresce para uma placa de obra e diminui para o ícone do
  aplicativo sem perder nada. O texto já está em curvas, então o arquivo abre igual em qualquer
  computador, mesmo sem a fonte instalada.</div>
  <div class="escolha">{comparar}</div>
</div>

{blocos}

<div class="topo" style="margin-top:10px">
  <div class="obs">Escolhida a paleta, eu entrego o pacote completo — SVG e PNG de cada versão,
  ícones do sistema e do aplicativo, favicon — e atualizo o JeV Empreendimentos, o JeV Mobile e o
  instalador do Windows para a marca nova.</div>
</div>
</body></html>'''

if __name__ == '__main__':
    destino = sys.argv[1] if len(sys.argv) > 1 else '/root/marca/estudo_marca.html'
    open(destino, 'w', encoding='utf-8').write(pagina())
    print(destino, os.path.getsize(destino)//1024, 'KB')
