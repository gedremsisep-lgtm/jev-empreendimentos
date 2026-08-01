/* =========================================================================
   Constantes gerais — unidades de negócio, plano de contas e cadastros de apoio
   ========================================================================= */

const UNIDADES = [
  {id:'obras', pg:'obras', nome:'Obras e Edificações', curto:'Obras', ic:'ti-crane',
   cor:'#B4531F', bg:'#FBEDE5', desc:'Casas, chácaras, condomínios e reformas',
   tabs:[['obras','Obras','ti-building-community'],['orc','Orçamento','ti-calculator'],
         ['crono','Cronograma','ti-calendar-stats'],['mat','Compras','ti-package'],
         ['mo','Mão de obra','ti-users'],['rdo','Diário','ti-notebook'],
         ['med','Medições','ti-ruler-measure'],['proj','Projetos e 3D','ti-cube']]},
  {id:'imoveis', pg:'imoveis', nome:'Locação de Imóveis', curto:'Imóveis', ic:'ti-home',
   cor:'#1F5FA8', bg:'#E8F1FB', desc:'Casas, salas e terrenos alugados', tabs:[]},
  {id:'veiculos', pg:'veiculos', nome:'Locação de Veículos', curto:'Veículos', ic:'ti-car',
   cor:'#4B4FA3', bg:'#ECEDF9', desc:'Frota, contratos e manutenção', tabs:[]},
  {id:'chacara', pg:'chacara', nome:'Produção da Chácara', curto:'Chácara', ic:'ti-plant-2',
   cor:'#2E7D32', bg:'#E8F4E9', desc:'Lotes, ciclos, safra e rebanho', tabs:[]},
  {id:'produtos', pg:'produtos', nome:'Produtos e Vendas', curto:'Produtos', ic:'ti-shopping-bag',
   cor:'#B0842B', bg:'#FBF2DF', desc:'Catálogo, estoque e pedidos', tabs:[]},
  {id:'info', pg:'info', nome:'Infoprodutos', curto:'Infoprodutos', ic:'ti-device-laptop',
   cor:'#7B3FA0', bg:'#F2EAF9', desc:'Cursos e materiais digitais', tabs:[]},
  {id:'midia', pg:'midia', nome:'Canais de Vídeo', curto:'Mídia', ic:'ti-brand-youtube',
   cor:'#C0392B', bg:'#FBEAE8', desc:'Plataformas digitais e monetização', tabs:[]}
];
const UN_GERAL = {id:'geral', nome:'Administrativo / Geral', curto:'Geral', ic:'ti-building-store', cor:'#5B6260', bg:'#EFEDE7'};
function unInfo(id){ return UNIDADES.find(u=>u.id===id) || UN_GERAL; }

/* ---------------- Plano de contas ---------------- */
const CAT_REC = [
  'Medição de obra','Venda de imóvel','Aluguel de imóvel','Taxa e reembolso de locação',
  'Locação de veículo','Venda da produção','Venda de animais','Venda de produtos',
  'Venda de infoproduto','Monetização de vídeos','Publicidade e patrocínio',
  'Comissão e afiliados','Rendimento de aplicação','Empréstimo recebido','Aporte de sócio','Outras receitas'
];
const CAT_DESP = [
  'Material de construção','Mão de obra e empreiteiros','Locação de equipamentos','Fretes e transporte',
  'Combustível','Manutenção e reparos','Peças e pneus','Seguro','IPVA e licenciamento','Multas',
  'Insumos agrícolas','Ração e veterinário','Sementes e mudas','Energia elétrica','Água','Internet e telefone',
  'Aluguel e condomínio','IPTU e taxas','Impostos e tributos','Salários e encargos','Pró-labore e retiradas',
  'Contabilidade e serviços','Marketing e tráfego pago','Plataformas e assinaturas','Equipamentos e móveis',
  'Custo do produto vendido','Comissões pagas','Tarifas bancárias','Juros e financiamento','Despesas administrativas','Outras despesas'
];
const FORMAS = ['Pix','Dinheiro','Boleto','Transferência','Cartão de débito','Cartão de crédito','Cheque','A prazo'];
const ST_FIN = {'Pendente':'s-wn','Pago':'s-ok','Recebido':'s-ok','Atrasado':'s-bl','Cancelado':'s-nt'};
const TIPOS_CONTA = ['Conta corrente','Poupança','Caixa em dinheiro','Carteira digital','Cartão de crédito','Aplicação'];
const PERIODICIDADES = [['mensal','Mensal',1],['bimestral','Bimestral',2],['trimestral','Trimestral',3],
                        ['semestral','Semestral',6],['anual','Anual',12]];

/* ---------------- Pessoas ---------------- */
const PAPEIS = ['Cliente','Inquilino','Locatário de veículo','Fornecedor','Empreiteiro','Funcionário',
                'Prestador de serviço','Sócio','Comprador','Outro'];

/* ---------------- Imóveis ---------------- */
const TIPOS_IMOVEL = ['Casa','Apartamento','Kitnet','Sala comercial','Loja','Galpão','Terreno','Chácara','Barracão','Quarto'];
const ST_IMOVEL = {'Alugado':'s-ok','Vago':'s-wn','Em reforma':'s-pd','Próprio em uso':'s-nt','À venda':'s-pu'};
const INDICES = ['IGP-M','IPCA','INPC','Percentual fixo','Sem reajuste'];

/* ---------------- Veículos ---------------- */
const TIPOS_VEICULO = ['Carro','Caminhonete','Caminhão','Van','Moto','Trator','Máquina','Reboque','Ônibus'];
const ST_VEICULO = {'Locado':'s-ok','Disponível':'s-wn','Em manutenção':'s-pd','Uso próprio':'s-nt','À venda':'s-pu'};
const COMBUSTIVEIS = ['Flex','Gasolina','Etanol','Diesel','GNV','Elétrico','Híbrido'];

/* ---------------- Chácara ---------------- */
const TIPOS_LOTE = ['Talhão de lavoura','Pomar','Horta','Pastagem','Curral / baia','Viveiro','Açude','Estufa','Área de reserva'];
const CULTURAS = ['Milho','Soja','Mandioca','Feijão','Hortaliças','Banana','Laranja','Manga','Limão','Abacaxi',
                  'Café','Cana','Capim / pastagem','Bovinos','Suínos','Aves / frango','Ovos','Peixes','Mel','Outro'];
const UND_PROD = ['kg','saca','ton','caixa','dúzia','litro','cabeça','unidade','maço','fardo'];
const ST_CICLO = {'Planejado':'s-nt','Em andamento':'s-pd','Colhido':'s-ok','Vendido':'s-br','Perdido':'s-bl'};

/* ---------------- Produtos e infoprodutos ---------------- */
const TIPOS_PRODUTO = ['Produto físico','Produto da chácara','Infoproduto','Serviço','Assinatura'];
const CAT_PRODUTO = ['Alimentos','Bebidas','Artesanato','Insumos','Ferramentas','Curso online','E-book',
                     'Mentoria','Planilha / template','Consultoria','Outro'];
const PLATAFORMAS = ['Venda direta','WhatsApp','Instagram','Mercado Livre','Shopee','Hotmart','Kiwify',
                     'Eduzz','Monetizze','Braip','Site próprio','Feira / presencial','Outro'];
const ST_VENDA = {'Pedido':'s-nt','Confirmada':'s-pd','Entregue':'s-ok','Paga':'s-br','Cancelada':'s-bl','Reembolsada':'s-wn'};

/* ---------------- Canais de vídeo ---------------- */
const PLATS_VIDEO = [
  {v:'YouTube',   ic:'ti-brand-youtube',   cor:'#C0392B'},
  {v:'TikTok',    ic:'ti-brand-tiktok',    cor:'#111827'},
  {v:'Instagram', ic:'ti-brand-instagram', cor:'#B03A83'},
  {v:'Kwai',      ic:'ti-video',           cor:'#D97706'},
  {v:'Facebook',  ic:'ti-brand-facebook',  cor:'#1F5FA8'},
  {v:'Outra',     ic:'ti-device-tv',       cor:'#5B6260'}
];
const ST_VIDEO = {'Ideia':'s-nt','Roteiro':'s-pu','Gravado':'s-wn','Editado':'s-pd','Publicado':'s-ok','Arquivado':'s-bl'};
const FONTES_REC = ['Monetização da plataforma','Publicidade / publipost','Afiliados','Patrocínio',
                    'Venda de infoproduto','Doações','Outra'];

function platInfo(v){ return PLATS_VIDEO.find(p=>p.v===v)||PLATS_VIDEO[5]; }
