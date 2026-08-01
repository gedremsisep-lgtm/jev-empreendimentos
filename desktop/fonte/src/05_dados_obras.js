/* =========================================================================
   Bases de referência — etapas padrão, catálogo de insumos e composições
   ATENÇÃO: os preços abaixo são VALORES DE REFERÊNCIA para partida do sistema.
   Devem ser atualizados em Configurações > Insumos com os preços reais da
   sua praça / dos seus fornecedores antes de fechar qualquer orçamento.
   ========================================================================= */

const ETAPAS_PADRAO = [
  {ord:1,  nome:'Serviços Preliminares e Canteiro', peso:3,  dur:4,  grupo:'preliminar', cor:'#8B93A3'},
  {ord:2,  nome:'Movimento de Terra e Locação',     peso:2,  dur:3,  grupo:'terra',      cor:'#8A5108'},
  {ord:3,  nome:'Fundações',                        peso:8,  dur:8,  grupo:'fundacao',   cor:'#5A6070'},
  {ord:4,  nome:'Estrutura de Concreto',            peso:15, dur:14, grupo:'estrutura',  cor:'#15599E'},
  {ord:5,  nome:'Alvenaria e Vedações',             peso:9,  dur:10, grupo:'alvenaria',  cor:'#A8291F'},
  {ord:6,  nome:'Cobertura e Telhado',              peso:7,  dur:7,  grupo:'cobertura',  cor:'#7A3E12'},
  {ord:7,  nome:'Instalações Hidrossanitárias',     peso:7,  dur:8,  grupo:'instalacao', cor:'#0E6E70'},
  {ord:8,  nome:'Instalações Elétricas e Dados',    peso:7,  dur:8,  grupo:'instalacao', cor:'#B26A0C'},
  {ord:9,  nome:'Esquadrias (Portas e Janelas)',    peso:8,  dur:7,  grupo:'esquadria',  cor:'#4B3FA3'},
  {ord:10, nome:'Revestimentos Internos e Gesso',   peso:10, dur:10, grupo:'acabamento', cor:'#1F7A44'},
  {ord:11, nome:'Pisos e Revestimentos Cerâmicos',  peso:8,  dur:8,  grupo:'acabamento', cor:'#2E9E5B'},
  {ord:12, nome:'Pintura Interna e Externa',        peso:6,  dur:7,  grupo:'acabamento', cor:'#C0392B'},
  {ord:13, nome:'Louças, Metais e Bancadas',        peso:5,  dur:4,  grupo:'acabamento', cor:'#8E44AD'},
  {ord:14, nome:'Serviços Complementares e Limpeza',peso:5,  dur:2,  grupo:'entrega',    cor:'#0F172A'}
];

const CATS = ['Agregados','Aglomerantes','Aço','Concreto','Alvenaria','Madeira','Cobertura',
              'Hidráulica','Elétrica','Revestimento','Pintura','Esquadria','Louças e Metais',
              'Mão de obra','Equipamento','Serviços'];

const INSUMOS_PADRAO = [
  // --- Agregados e aglomerantes
  {cod:'AG-01', desc:'Areia média lavada',                         und:'m³', custo:135.00, cat:'Agregados'},
  {cod:'AG-02', desc:'Brita nº 1',                                 und:'m³', custo:145.00, cat:'Agregados'},
  {cod:'AG-03', desc:'Pedrisco',                                   und:'m³', custo:150.00, cat:'Agregados'},
  {cod:'AG-04', desc:'Aterro / solo de empréstimo',                und:'m³', custo:58.00,  cat:'Agregados'},
  {cod:'AGL-01',desc:'Cimento CP-II-Z-32 (saco 50 kg)',            und:'sc', custo:42.00,  cat:'Aglomerantes'},
  {cod:'AGL-02',desc:'Cal hidratada CH-III (saco 20 kg)',          und:'sc', custo:22.00,  cat:'Aglomerantes'},
  {cod:'AGL-03',desc:'Argamassa de assentamento ensacada 20 kg',   und:'sc', custo:19.50,  cat:'Aglomerantes'},
  // --- Concreto e aço
  {cod:'CC-01', desc:'Concreto usinado bombeado FCK 25 MPa',       und:'m³', custo:545.00, cat:'Concreto'},
  {cod:'CC-02', desc:'Concreto usinado FCK 30 MPa',                und:'m³', custo:590.00, cat:'Concreto'},
  {cod:'CC-03', desc:'Concreto magro para lastro',                 und:'m³', custo:430.00, cat:'Concreto'},
  {cod:'AC-01', desc:'Aço CA-50 (barras)',                         und:'kg', custo:8.90,   cat:'Aço'},
  {cod:'AC-02', desc:'Aço CA-60 (estribos)',                       und:'kg', custo:9.40,   cat:'Aço'},
  {cod:'AC-03', desc:'Arame recozido nº 18',                       und:'kg', custo:23.00,  cat:'Aço'},
  {cod:'AC-04', desc:'Tela soldada Q-138',                         und:'m²', custo:26.00,  cat:'Aço'},
  // --- Alvenaria
  {cod:'AV-01', desc:'Bloco cerâmico vedação 9x19x39 cm',          und:'un', custo:2.35,   cat:'Alvenaria'},
  {cod:'AV-02', desc:'Bloco cerâmico estrutural 14x19x39 cm',      und:'un', custo:3.90,   cat:'Alvenaria'},
  {cod:'AV-03', desc:'Bloco de concreto 14x19x39 cm',              und:'un', custo:4.60,   cat:'Alvenaria'},
  {cod:'AV-04', desc:'Tijolo maciço',                              und:'un', custo:1.05,   cat:'Alvenaria'},
  {cod:'AV-05', desc:'Verga / contraverga pré-moldada',            und:'m',  custo:26.00,  cat:'Alvenaria'},
  // --- Madeira e formas
  {cod:'MD-01', desc:'Chapa madeirit plastificado 17 mm (2,20x1,10)',und:'un',custo:145.00,cat:'Madeira'},
  {cod:'MD-02', desc:'Peça de madeira serrada (escoras/gravatas)',  und:'m',  custo:12.00,  cat:'Madeira'},
  {cod:'MD-03', desc:'Prego 17x27 com cabeça',                      und:'kg', custo:24.00,  cat:'Madeira'},
  {cod:'MD-04', desc:'Desmoldante para formas',                     und:'L',  custo:18.00,  cat:'Madeira'},
  // --- Cobertura
  {cod:'CB-01', desc:'Telha cerâmica portuguesa',                   und:'un', custo:2.60,   cat:'Cobertura'},
  {cod:'CB-02', desc:'Telha fibrocimento 6 mm (2,44x1,10 m)',       und:'un', custo:78.00,  cat:'Cobertura'},
  {cod:'CB-03', desc:'Telha termoacústica sanduíche 30 mm',         und:'m²', custo:168.00, cat:'Cobertura'},
  {cod:'CB-04', desc:'Madeiramento de telhado (estrutura)',         und:'m²', custo:95.00,  cat:'Cobertura'},
  {cod:'CB-05', desc:'Calha e rufo em chapa galvanizada',           und:'m',  custo:72.00,  cat:'Cobertura'},
  {cod:'CB-06', desc:'Manta asfáltica impermeabilizante 3 mm',      und:'m²', custo:58.00,  cat:'Cobertura'},
  // --- Hidráulica
  {cod:'HD-01', desc:'Tubo PVC esgoto DN 100 mm (barra 6 m)',       und:'br', custo:78.00,  cat:'Hidráulica'},
  {cod:'HD-02', desc:'Tubo PVC esgoto DN 50 mm (barra 6 m)',        und:'br', custo:42.00,  cat:'Hidráulica'},
  {cod:'HD-03', desc:'Tubo PVC soldável água fria DN 25 mm (6 m)',  und:'br', custo:32.00,  cat:'Hidráulica'},
  {cod:'HD-04', desc:'Conexões hidráulicas diversas (verba)',       und:'vb', custo:850.00, cat:'Hidráulica'},
  {cod:'HD-05', desc:'Caixa d\'água polietileno 1.000 L',           und:'un', custo:685.00, cat:'Hidráulica'},
  {cod:'HD-06', desc:'Registro de gaveta 3/4"',                     und:'un', custo:78.00,  cat:'Hidráulica'},
  {cod:'HD-07', desc:'Caixa de inspeção / gordura',                 und:'un', custo:190.00, cat:'Hidráulica'},
  // --- Elétrica
  {cod:'EL-01', desc:'Cabo flexível 2,5 mm² (rolo 100 m)',          und:'rl', custo:195.00, cat:'Elétrica'},
  {cod:'EL-02', desc:'Cabo flexível 4,0 mm² (rolo 100 m)',          und:'rl', custo:305.00, cat:'Elétrica'},
  {cod:'EL-03', desc:'Eletroduto corrugado 3/4" (rolo 50 m)',       und:'rl', custo:68.00,  cat:'Elétrica'},
  {cod:'EL-04', desc:'Caixa 4x2" PVC embutir',                      und:'un', custo:2.80,   cat:'Elétrica'},
  {cod:'EL-05', desc:'Quadro de distribuição 12 disjuntores',       und:'un', custo:245.00, cat:'Elétrica'},
  {cod:'EL-06', desc:'Disjuntor monopolar DIN',                     und:'un', custo:26.00,  cat:'Elétrica'},
  {cod:'EL-07', desc:'Conjunto tomada / interruptor',               und:'cj', custo:24.00,  cat:'Elétrica'},
  {cod:'EL-08', desc:'Luminária / ponto de iluminação',             und:'un', custo:95.00,  cat:'Elétrica'},
  // --- Revestimentos
  {cod:'RV-01', desc:'Argamassa colante AC-II (saco 20 kg)',        und:'sc', custo:26.00,  cat:'Revestimento'},
  {cod:'RV-02', desc:'Rejunte flexível (saco 5 kg)',                und:'sc', custo:18.00,  cat:'Revestimento'},
  {cod:'RV-03', desc:'Porcelanato acetinado 60x60 cm',              und:'m²', custo:78.00,  cat:'Revestimento'},
  {cod:'RV-04', desc:'Piso cerâmico esmaltado PEI-4',               und:'m²', custo:42.00,  cat:'Revestimento'},
  {cod:'RV-05', desc:'Azulejo cerâmico 30x60 cm',                   und:'m²', custo:45.00,  cat:'Revestimento'},
  {cod:'RV-06', desc:'Gesso liso em pasta (aplicado)',              und:'m²', custo:32.00,  cat:'Revestimento'},
  {cod:'RV-07', desc:'Forro de gesso acartonado',                   und:'m²', custo:78.00,  cat:'Revestimento'},
  {cod:'RV-08', desc:'Rodapé de poliestireno 10 cm',                und:'m',  custo:28.00,  cat:'Revestimento'},
  // --- Pintura
  {cod:'PT-01', desc:'Tinta acrílica premium (lata 18 L)',          und:'lt', custo:385.00, cat:'Pintura'},
  {cod:'PT-02', desc:'Massa corrida PVA (lata 18 L)',               und:'lt', custo:165.00, cat:'Pintura'},
  {cod:'PT-03', desc:'Selador acrílico (lata 18 L)',                und:'lt', custo:175.00, cat:'Pintura'},
  {cod:'PT-04', desc:'Textura acrílica externa (18 L)',             und:'lt', custo:310.00, cat:'Pintura'},
  // --- Esquadrias
  {cod:'ES-01', desc:'Porta de madeira semi-oca com batente 0,80 m',und:'cj', custo:495.00, cat:'Esquadria'},
  {cod:'ES-02', desc:'Porta de alumínio de abrir 0,80x2,10 m',      und:'un', custo:890.00, cat:'Esquadria'},
  {cod:'ES-03', desc:'Janela de alumínio de correr 1,20x1,00 m',    und:'un', custo:720.00, cat:'Esquadria'},
  {cod:'ES-04', desc:'Janela basculante alumínio 0,60x0,60 m',      und:'un', custo:290.00, cat:'Esquadria'},
  {cod:'ES-05', desc:'Portão social / basculante (verba)',          und:'vb', custo:3200.00,cat:'Esquadria'},
  {cod:'ES-06', desc:'Fechadura e ferragens por porta',             und:'cj', custo:135.00, cat:'Esquadria'},
  // --- Louças e metais
  {cod:'LM-01', desc:'Vaso sanitário com caixa acoplada',           und:'cj', custo:590.00, cat:'Louças e Metais'},
  {cod:'LM-02', desc:'Lavatório com coluna',                        und:'cj', custo:320.00, cat:'Louças e Metais'},
  {cod:'LM-03', desc:'Cuba inox de embutir',                        und:'un', custo:380.00, cat:'Louças e Metais'},
  {cod:'LM-04', desc:'Torneira de mesa / parede',                   und:'un', custo:130.00, cat:'Louças e Metais'},
  {cod:'LM-05', desc:'Chuveiro elétrico / ducha',                   und:'un', custo:180.00, cat:'Louças e Metais'},
  {cod:'LM-06', desc:'Bancada em granito (com cuba)',               und:'m²', custo:640.00, cat:'Louças e Metais'},
  {cod:'LM-07', desc:'Tanque de louça / lavanderia',                und:'un', custo:295.00, cat:'Louças e Metais'},
  // --- Mão de obra (hora)
  {cod:'MO-01', desc:'Pedreiro',                                    und:'h',  custo:28.00,  cat:'Mão de obra'},
  {cod:'MO-02', desc:'Servente / ajudante',                         und:'h',  custo:18.00,  cat:'Mão de obra'},
  {cod:'MO-03', desc:'Carpinteiro de formas',                       und:'h',  custo:30.00,  cat:'Mão de obra'},
  {cod:'MO-04', desc:'Armador',                                     und:'h',  custo:30.00,  cat:'Mão de obra'},
  {cod:'MO-05', desc:'Encanador',                                   und:'h',  custo:32.00,  cat:'Mão de obra'},
  {cod:'MO-06', desc:'Eletricista',                                 und:'h',  custo:34.00,  cat:'Mão de obra'},
  {cod:'MO-07', desc:'Pintor',                                      und:'h',  custo:28.00,  cat:'Mão de obra'},
  {cod:'MO-08', desc:'Gesseiro',                                    und:'h',  custo:32.00,  cat:'Mão de obra'},
  {cod:'MO-09', desc:'Azulejista / ladrilheiro',                    und:'h',  custo:32.00,  cat:'Mão de obra'},
  {cod:'MO-10', desc:'Mestre de obras (mensal)',                    und:'mês',custo:5200.00,cat:'Mão de obra'},
  // --- Equipamento e serviços
  {cod:'EQ-01', desc:'Betoneira 400 L (locação)',                   und:'dia',custo:85.00,  cat:'Equipamento'},
  {cod:'EQ-02', desc:'Retroescavadeira com operador',               und:'h',  custo:220.00, cat:'Equipamento'},
  {cod:'EQ-03', desc:'Andaime tubular (locação)',                   und:'m²', custo:12.00,  cat:'Equipamento'},
  {cod:'EQ-04', desc:'Caçamba para entulho 5 m³',                   und:'un', custo:320.00, cat:'Equipamento'},
  {cod:'EQ-05', desc:'Bomba de concreto (mobilização)',             und:'vb', custo:1450.00,cat:'Equipamento'},
  {cod:'SV-01', desc:'Projeto arquitetônico e complementares',      und:'vb', custo:0,      cat:'Serviços'},
  {cod:'SV-02', desc:'ART/RRT e taxas de aprovação',                und:'vb', custo:0,      cat:'Serviços'},
  {cod:'SV-03', desc:'Ligação provisória de água e energia',        und:'vb', custo:1200.00,cat:'Serviços'},
  {cod:'SV-04', desc:'Tapume e placa de obra',                      und:'m',  custo:95.00,  cat:'Serviços'}
];

/* Coeficientes por m² de área construída — base do "Orçamento Automático".
   Valores médios para residência unifamiliar de padrão normal. Ajuste conforme
   o projeto real; servem para gerar rapidamente uma primeira planilha. */
const COMP_PADRAO = {
  'Serviços Preliminares e Canteiro':[
    {cod:'SV-04',coef:0.35},{cod:'SV-03',coef:0.006},{cod:'EQ-04',coef:0.010},{cod:'MO-02',coef:0.55}
  ],
  'Movimento de Terra e Locação':[
    {cod:'EQ-02',coef:0.045},{cod:'AG-04',coef:0.09},{cod:'MD-02',coef:0.30},{cod:'MO-02',coef:0.45},{cod:'MO-01',coef:0.20}
  ],
  'Fundações':[
    {cod:'CC-01',coef:0.085},{cod:'CC-03',coef:0.012},{cod:'AC-01',coef:4.60},{cod:'AC-02',coef:1.10},
    {cod:'MD-01',coef:0.030},{cod:'MO-01',coef:1.10},{cod:'MO-04',coef:0.55},{cod:'MO-02',coef:1.60}
  ],
  'Estrutura de Concreto':[
    {cod:'CC-01',coef:0.135},{cod:'AC-01',coef:9.50},{cod:'AC-02',coef:3.20},{cod:'AC-03',coef:0.22},
    {cod:'MD-01',coef:0.085},{cod:'MD-02',coef:1.30},{cod:'MD-03',coef:0.16},
    {cod:'MO-03',coef:1.55},{cod:'MO-04',coef:0.95},{cod:'MO-01',coef:1.35},{cod:'MO-02',coef:2.60},{cod:'EQ-05',coef:0.004}
  ],
  'Alvenaria e Vedações':[
    {cod:'AV-01',coef:36.0},{cod:'AGL-01',coef:0.62},{cod:'AG-01',coef:0.055},{cod:'AGL-02',coef:0.30},
    {cod:'AV-05',coef:0.55},{cod:'MO-01',coef:1.55},{cod:'MO-02',coef:1.55},{cod:'EQ-01',coef:0.035}
  ],
  'Cobertura e Telhado':[
    {cod:'CB-04',coef:0.62},{cod:'CB-01',coef:10.5},{cod:'CB-05',coef:0.20},{cod:'CB-06',coef:0.14},
    {cod:'MO-01',coef:0.70},{cod:'MO-02',coef:0.70},{cod:'MO-03',coef:0.45}
  ],
  'Instalações Hidrossanitárias':[
    {cod:'HD-01',coef:0.075},{cod:'HD-02',coef:0.090},{cod:'HD-03',coef:0.140},{cod:'HD-04',coef:0.0075},
    {cod:'HD-05',coef:0.007},{cod:'HD-06',coef:0.055},{cod:'HD-07',coef:0.015},
    {cod:'MO-05',coef:1.15},{cod:'MO-02',coef:0.70}
  ],
  'Instalações Elétricas e Dados':[
    {cod:'EL-01',coef:0.065},{cod:'EL-02',coef:0.020},{cod:'EL-03',coef:0.075},{cod:'EL-04',coef:0.75},
    {cod:'EL-05',coef:0.006},{cod:'EL-06',coef:0.075},{cod:'EL-07',coef:0.42},{cod:'EL-08',coef:0.16},
    {cod:'MO-06',coef:1.20},{cod:'MO-02',coef:0.55}
  ],
  'Esquadrias (Portas e Janelas)':[
    {cod:'ES-01',coef:0.055},{cod:'ES-02',coef:0.012},{cod:'ES-03',coef:0.055},{cod:'ES-04',coef:0.020},
    {cod:'ES-06',coef:0.070},{cod:'ES-05',coef:0.0035},{cod:'MO-01',coef:0.55},{cod:'MO-02',coef:0.40}
  ],
  'Revestimentos Internos e Gesso':[
    {cod:'AGL-01',coef:0.95},{cod:'AG-01',coef:0.095},{cod:'AGL-02',coef:0.62},
    {cod:'RV-06',coef:1.35},{cod:'RV-07',coef:0.55},
    {cod:'MO-01',coef:2.10},{cod:'MO-08',coef:0.85},{cod:'MO-02',coef:1.70},{cod:'EQ-03',coef:0.55}
  ],
  'Pisos e Revestimentos Cerâmicos':[
    {cod:'RV-03',coef:0.62},{cod:'RV-04',coef:0.42},{cod:'RV-05',coef:0.35},
    {cod:'RV-01',coef:0.42},{cod:'RV-02',coef:0.13},{cod:'RV-08',coef:0.85},
    {cod:'MO-09',coef:1.35},{cod:'MO-02',coef:0.75}
  ],
  'Pintura Interna e Externa':[
    {cod:'PT-01',coef:0.055},{cod:'PT-02',coef:0.045},{cod:'PT-03',coef:0.030},{cod:'PT-04',coef:0.014},
    {cod:'MO-07',coef:1.45},{cod:'MO-02',coef:0.45},{cod:'EQ-03',coef:0.35}
  ],
  'Louças, Metais e Bancadas':[
    {cod:'LM-01',coef:0.018},{cod:'LM-02',coef:0.018},{cod:'LM-03',coef:0.008},{cod:'LM-04',coef:0.045},
    {cod:'LM-05',coef:0.018},{cod:'LM-06',coef:0.055},{cod:'LM-07',coef:0.007},
    {cod:'MO-05',coef:0.35},{cod:'MO-01',coef:0.25}
  ],
  'Serviços Complementares e Limpeza':[
    {cod:'EQ-04',coef:0.014},{cod:'AGL-01',coef:0.18},{cod:'AG-01',coef:0.020},
    {cod:'MO-01',coef:0.55},{cod:'MO-02',coef:1.30},{cod:'MO-10',coef:0.0022}
  ]
};

const TIPOS_OBRA = [
  {v:'Casa Residencial',   ic:'ti-home',              cor:'#15599E'},
  {v:'Sobrado',            ic:'ti-building',          cor:'#4B3FA3'},
  {v:'Chácara / Sítio',    ic:'ti-trees',             cor:'#1F7A44'},
  {v:'Condomínio',         ic:'ti-building-community',cor:'#8A5108'},
  {v:'Edifício',           ic:'ti-building-skyscraper',cor:'#0E6E70'},
  {v:'Galpão / Comercial', ic:'ti-building-warehouse',cor:'#A8291F'},
  {v:'Reforma / Ampliação',ic:'ti-tools',             cor:'#8E44AD'}
];
const ST_OBRA = {
  'Planejamento':'s-nt','Em andamento':'s-pd','Paralisada':'s-wn','Concluída':'s-ok','Entregue':'s-ok'
};
const DISCIPLINAS = ['Arquitetônico','Estrutural','Hidrossanitário','Elétrico','Prevenção Incêndio',
                     'Climatização','Paisagismo','Terraplenagem','Levantamento Topográfico','Modelo BIM (IFC)','Aprovação / Prefeitura','Outro'];

function tipoInfo(t){ return TIPOS_OBRA.find(x=>x.v===t) || TIPOS_OBRA[0]; }
function etapaCor(nome){ const e = ETAPAS_PADRAO.find(x=>x.nome===nome); return e?e.cor:'#8B93A3'; }
