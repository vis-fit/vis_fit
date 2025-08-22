//Inicio do arquivo: server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const fileUpload = require('express-fileupload');

app.use(express.json({ limit: '10mb' })); // Aumenta limite para imagens base64
app.use(express.static(path.join(__dirname, 'frontend')));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

app.use(fileUpload());
app.use(express.urlencoded({ extended: true }));

//======ROTAS======//

// Rota principal (mantida igual)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rota de pesquisa melhorada
app.get('/api/foods/search', async (req, res) => {
  try {
    const { term } = req.query;
    
    if (!term || term.trim().length < 2) {
      return res.status(400).json({ error: 'Termo de pesquisa inválido' });
    }
    
    const searchTerms = term.toLowerCase()
      .split(' ')
      .filter(word => word.length > 2)
      .map(word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    
    if (searchTerms.length === 0) {
      return res.json([]);
    }
    
    const query = `
      SELECT f.*, b.nome as brand_name, p.nome as preparation_name
      FROM tbl_foods f
      LEFT JOIN tbl_brands b ON f.id_item_brand = b.id
      LEFT JOIN tbl_aux_prep p ON f.id_preparo = p.id
      WHERE unaccent(f.key_words) ILIKE unaccent($1)
      OR (b.nome IS NOT NULL AND unaccent(b.nome) ILIKE unaccent($1))
      ORDER BY f.item_name ASC
      LIMIT 100`;
    
    const searchPattern = `%${term}%`;
    const result = await pool.query(query, [searchPattern]);
    
    const foods = result.rows.map(row => ({
      id: row.id,
      item_name: row.item_name,
      brand: row.brand_name,
      preparation: row.preparation_name,
      base_portion: row.porcao_base,
      measure_type: row.id_tipo_medida,
      calories_kcal: row.caloria_kcal
    }));
    
    res.json(foods);
  } catch (error) {
    console.error('Erro na pesquisa:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota principal - serve o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rotas para as páginas de módulos
app.get('/mod_projetos', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'mod_projetos.html'));
});

app.get('/mod_food', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'mod_food.html'));
});

// Rota de teste do banco de dados (mantida)
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Rota Criação do Campo Marca
app.get('/api/brands', async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search || search.length < 3) {
      return res.json([]);
    }

    const searchTerm = search.toUpperCase(); // Busca exata em maiúsculas
    
    const query = `
      SELECT nome 
      FROM tbl_brands 
      WHERE nome LIKE $1
      ORDER BY nome
      LIMIT 10`;
    
    const result = await pool.query(query, [`%${searchTerm}%`]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar marcas:', error);
    res.status(500).json({ error: 'Erro ao carregar marcas' });
  }
});

// Rota para processar marca (verificar existência ou criar nova)
app.post('/api/brands/process', async (req, res) => {
  try {
    const { nome } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome da marca é obrigatório' });
    }

    const upperNome = nome.toUpperCase();
    
    // 1. Verifica se a marca já existe
    const checkQuery = 'SELECT id FROM tbl_brands WHERE UPPER(nome) = $1';
    const checkResult = await pool.query(checkQuery, [upperNome]);
    
    if (checkResult.rows.length > 0) {
      return res.json(checkResult.rows[0]);
    }

    // 2. Cria nova marca
    const insertQuery = `
      INSERT INTO tbl_brands (nome)
      VALUES ($1)
      RETURNING id`;
    
    const insertResult = await pool.query(insertQuery, [upperNome]);
    return res.json(insertResult.rows[0]);

  } catch (error) {
    console.error('Erro detalhado:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar marca',
      details: error.message 
    });
  }
});

// Rota para opções de Modo de Preparo
app.get('/api/preparation-options', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_prep ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar modos de preparo:', error);
    res.status(500).json({ error: 'Erro ao carregar opções' });
  }
});

// Rota para opções de Grupo Alimentar
app.get('/api/foodgroup-options', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_grupo_alimentar ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar grupos alimentares:', error);
    res.status(500).json({ error: 'Erro ao carregar opções' });
  }
});

// Rota para opções de Alérgenos
app.get('/api/allergen-options', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_alergenos ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar alérgenos:', error);
    res.status(500).json({ error: 'Erro ao carregar opções' });
  }
});

// Rota para opções de Intolerâncias
app.get('/api/intolerancias-options', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_intolerancias ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar intolerâncias:', error);
    res.status(500).json({ error: 'Erro ao carregar opções' });
  }
});

// Rota para opções de Categoria
app.get('/api/categoria-options', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_categoria_alimentar ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar categorias alimentares:', error);
    res.status(500).json({ error: 'Erro ao carregar opções' });
  }
});

// Rota para opções de Origem Alimentar
app.get('/api/origem-alimentar-options', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_origem_alimentar ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar origens alimentares:', error);
    res.status(500).json({ error: 'Erro ao carregar opções' });
  }
});

// Rota para opções de Nível de Processamento
app.get('/api/processamento-options', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_nvl_processamento ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar níveis de processamento:', error);
    res.status(500).json({ error: 'Erro ao carregar opções' });
  }
});

// Rota para obter alérgenos por IDs
app.get('/api/allergens-by-ids', async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.json([]);
    }
    
    // Converter string de IDs em array e criar placeholders para a query
    const idArray = ids.split(',').filter(id => id.trim() !== '');
    
    if (idArray.length === 0) {
      return res.json([]);
    }
    
    // Criar placeholders para a query ($1, $2, $3, ...)
    const placeholders = idArray.map((_, index) => `$${index + 1}`).join(',');
    
    const query = `
      SELECT id, nome 
      FROM tbl_aux_alergenos 
      WHERE id IN (${placeholders})
      ORDER BY nome`;
    
    const result = await pool.query(query, idArray);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar alérgenos por IDs:', error);
    res.status(500).json({ error: 'Erro ao carregar alérgenos' });
  }
});

// Rota para obter intolerâncias por IDs
app.get('/api/intolerancias-by-ids', async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.json([]);
    }
    
    // Converter string de IDs em array e criar placeholders para a query
    const idArray = ids.split(',').filter(id => id.trim() !== '');
    
    if (idArray.length === 0) {
      return res.json([]);
    }
    
    // Criar placeholders para a query ($1, $2, $3, ...)
    const placeholders = idArray.map((_, index) => `$${index + 1}`).join(',');
    
    const query = `
      SELECT id, nome 
      FROM tbl_aux_intolerancias 
      WHERE id IN (${placeholders})
      ORDER BY nome`;
    
    const result = await pool.query(query, idArray);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar intolerâncias por IDs:', error);
    res.status(500).json({ error: 'Erro ao carregar intolerâncias' });
  }
});

// Rota para obter categorias por IDs
app.get('/api/categoria-by-ids', async (req, res) => {
  try {
    const { ids } = req.query;
    
    if (!ids) {
      return res.json([]);
    }
    
    // Converter string de IDs em array e criar placeholders para a query
    const idArray = ids.split(',').filter(id => id.trim() !== '');
    
    if (idArray.length === 0) {
      return res.json([]);
    }
    
    // Criar placeholders para a query ($1, $2, $3, ...)
    const placeholders = idArray.map((_, index) => `$${index + 1}`).join(',');
    
    const query = `
      SELECT id, nome 
      FROM tbl_aux_categoria_alimentar 
      WHERE id IN (${placeholders})
      ORDER BY nome`;
    
    const result = await pool.query(query, idArray);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar categorias por IDs:', error);
    res.status(500).json({ error: 'Erro ao carregar categorias' });
  }
});

// Rota para obter origem alimentar por ID
app.get('/api/origem-alimentar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT id, nome FROM tbl_aux_origem_alimentar WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Origem alimentar não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar origem alimentar:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para obter nível de processamento por ID
app.get('/api/processamento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT id, nome FROM tbl_aux_nvl_processamento WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nível de processamento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar nível de processamento:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.post('/api/foods', async (req, res) => {
  try {
    // Extrai os campos do FormData
    const {
      item_name,
      id_item_brand,
      id_preparo,
      id_grupo,
      id_tipo_medida,
      caloria_kcal,
      proteinas_g,
      carboidratos_g,
      gorduras_totais_g,
      img_registro_tipo,
      img_registro_web
    } = req.body;

    // Validações básicas
    if (!item_name || !id_preparo || !id_grupo || !id_tipo_medida ||
        !caloria_kcal || !proteinas_g || !carboidratos_g || !gorduras_totais_g) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // Processa a imagem se existir
    let imgBuffer = null;
    if (req.files && req.files.img_registro_dp) {
      imgBuffer = req.files.img_registro_dp.data;
    }

    const { id_alergenos } = req.body;
    const { id_intolerancias } = req.body;
    const { id_categoria } = req.body;

    const {
      gluten_sim,
      id_origem,
      id_processamento,
      obs_alimento
    } = req.body;

    //======PRIMEIRO PASSO BLOCO 2======
    // Query SQL atualizada
    const query = `
      INSERT INTO tbl_foods (
        item_name,
        id_item_brand,
        id_preparo,
        id_grupo,
        id_tipo_medida,
        caloria_kcal,
        proteinas_g,
        carboidratos_g,
        gorduras_totais_g,
        gorduras_monoinsaturadas_g,   
        gorduras_poliinsaturadas_g,
        gorduras_saturadas_g,
        gorduras_trans_g,
        fibras_g,
        sodio_mg,
        acucares_totais_g,
        acucares_naturais_g,
        acucares_adicionados_g,
        indice_glicemico,
        carga_glicemica_g,
        teor_agua_g,
        colesterol_mg,
        ferro_total_mg,
        ferro_heme_mg,
        ferro_n_heme_mg,
        omega_3_g,
        calcio_mg,
        magnesio_mg,
        zinco_mg,
        potassio_mg,
        vitamina_a_mcg,
        vitamina_b12_mcg,
        vitamina_c_mg,
        vitamina_d_mcg,
        vitamina_e_mg,
        vitamina_k_mcg,
        vitamina_b1_mg,
        vitamina_b2_mg,
        vitamina_b3_mg,
        vitamina_b5_mg,
        vitamina_b6_mg,
        vitamina_b7_mcg,
        omega_6_g,
        fitosterol_mg,
        cloro_mg,
        pral_meq,
        poliois_g,
        carboidratos_liquidos_g,
        indice_quality_proteinas_pdcaas,
        perfil_aminoacidos_ess_mg,
        cobre_mg,
        manganes_mg,
        selenio_mcg,
        iodo_mcg,
        betacaroteno_mcg,
        licopeno_mcg,
        luteina_zeaxantina_mcg,
        acido_folico_mcg,
        polifenol_total_mg,
        carga_antioxidante_orac,
        teor_alcool_prcent,
        id_alergenos,
        id_intolerancias,
        id_categoria,
        gluten_sim,
        id_origem,
        id_processamento,
        obs_alimento,
>>>>>>> backup-temporario
        img_registro_tipo,
        img_registro_web,
        img_registro_dp,
        porcao_base
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,$16, 
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
      $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45,
      $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57,
      $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, 100)
>>>>>>> backup-temporario
      RETURNING id`;

    //======SEGUNDO PASSO BLOCO 2======
    const result = await pool.query(query, [
      item_name,
      id_item_brand || null,
      id_preparo,
      id_grupo,
      id_tipo_medida,
      parseFloat(caloria_kcal),
      parseFloat(proteinas_g),
      parseFloat(carboidratos_g),
      parseFloat(gorduras_totais_g),
      parseFloat(req.body.gorduras_monoinsaturadas_g),  // NOVO CAMPO (default 0)
      parseFloat(req.body.gorduras_poliinsaturadas_g),  // NOVO CAMPO (default 0)
      parseFloat(req.body.gorduras_saturadas_g),  // NOVO CAMPO (default 0)
      parseFloat(req.body.gorduras_trans_g),  // NOVO CAMPO (default 0)
      parseFloat(req.body.fibras_g),  // NOVO CAMPO (default 0)
      parseFloat(req.body.sodio_mg),  // NOVO CAMPO (default 0)
      parseFloat(req.body.acucares_totais_g),
      parseFloat(req.body.acucares_naturais_g),
      parseFloat(req.body.acucares_adicionados_g),
      parseFloat(req.body.indice_glicemico),
      parseFloat(req.body.carga_glicemica_g),
      parseFloat(req.body.teor_agua_g),
      parseFloat(req.body.colesterol_mg),
      parseFloat(req.body.ferro_total_mg),
      parseFloat(req.body.ferro_heme_mg),
      parseFloat(req.body.ferro_n_heme_mg),
      parseFloat(req.body.omega_3_g),
      parseFloat(req.body.calcio_mg),
      parseFloat(req.body.magnesio_mg),
      parseFloat(req.body.zinco_mg),
      parseFloat(req.body.potassio_mg),
      parseFloat(req.body.vitamina_a_mcg),
      parseFloat(req.body.vitamina_b12_mcg),
      parseFloat(req.body.vitamina_c_mg),
      parseFloat(req.body.vitamina_d_mcg),
      parseFloat(req.body.vitamina_e_mg),
      parseFloat(req.body.vitamina_k_mcg),
      parseFloat(req.body.vitamina_b1_mg),
      parseFloat(req.body.vitamina_b2_mg),
      parseFloat(req.body.vitamina_b3_mg),
      parseFloat(req.body.vitamina_b5_mg),
      parseFloat(req.body.vitamina_b6_mg),
      parseFloat(req.body.vitamina_b7_mcg),
      parseFloat(req.body.omega_6_g),
      parseFloat(req.body.fitosterol_mg),
      parseFloat(req.body.cloro_mg),
      parseFloat(req.body.pral_meq),
      parseFloat(req.body.poliois_g),
      parseFloat(req.body.carboidratos_liquidos_g),
      parseFloat(req.body.indice_quality_proteinas_pdcaas),
      parseFloat(req.body.perfil_aminoacidos_ess_mg),
      parseFloat(req.body.cobre_mg),
      parseFloat(req.body.manganes_mg),
      parseFloat(req.body.selenio_mcg),
      parseFloat(req.body.iodo_mcg),
      parseFloat(req.body.betacaroteno_mcg),
      parseFloat(req.body.licopeno_mcg),
      parseFloat(req.body.luteina_zeaxantina_mcg),
      parseFloat(req.body.acido_folico_mcg),
      parseFloat(req.body.polifenol_total_mg),
      parseFloat(req.body.carga_antioxidante_orac),
      parseFloat(req.body.teor_alcool_prcent),
      id_alergenos || null,
      id_intolerancias || null,
      id_categoria || null,
      gluten_sim || null,
      id_origem || null, 
      id_processamento || null,
      obs_alimento || null,
      img_registro_tipo || null,
      img_registro_web || null,
      imgBuffer
    ]);

    res.json({ success: true, id: result.rows[0].id });

  } catch (error) {
    console.error('Erro ao salvar alimento:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Nova rota para buscar detalhes completos do alimento
app.get('/api/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        f.id,
        f.item_name,
        f.img_registro_tipo,
        f.img_registro_web,
        CASE WHEN f.img_registro_tipo = 1 THEN
          'data:image/jpeg;base64,' || encode(f.img_registro_dp, 'base64')
        ELSE NULL END as img_base64,
        b.nome as brand_name,
        p.nome as preparation_name,
        g.nome as group_name,
        f.id_tipo_medida,
        f.caloria_kcal,
        f.proteinas_g,
        f.carboidratos_g,
        f.gorduras_totais_g,
        f.fibras_g,
        f.gorduras_saturadas_g,
        f.gorduras_monoinsaturadas_g,
        f.gorduras_poliinsaturadas_g,
        f.gorduras_trans_g,
        f.omega_3_g,
        f.acucares_totais_g,
        f.acucares_naturais_g,
        f.acucares_adicionados_g,
        f.indice_glicemico,
        f.carga_glicemica_g,
        f.sodio_mg,
        f.potassio_mg,
        f.colesterol_mg,
        f.calcio_mg,
        f.ferro_total_mg,
        f.ferro_heme_mg,
        f.ferro_n_heme_mg,
        f.vitamina_a_mcg,
        f.vitamina_c_mg,
        f.vitamina_d_mcg,
        f.vitamina_b12_mcg,
        f.vitamina_e_mg,
        f.vitamina_b1_mg,
        f.vitamina_b2_mg,
        f.vitamina_b3_mg,
        f.vitamina_b5_mg,
        f.vitamina_b6_mg,
        f.vitamina_b7_mcg,
        f.vitamina_k_mcg,
        f.cloro_mg,
        f.magnesio_mg,
        f.zinco_mg,
        f.cobre_mg,
        f.manganes_mg,
        f.selenio_mcg,
        f.iodo_mcg,
        f.betacaroteno_mcg,
        f.licopeno_mcg,
        f.luteina_zeaxantina_mcg,
        f.omega_6_g,
        f.om6_x_om3,
        f.fitosterol_mg,
        f.carboidratos_liquidos_g,
        f.poliois_g,
        f.perfil_aminoacidos_ess_mg,
        f.indice_quality_proteinas_pdcaas,
        f.pral_meq,
        f.acido_folico_mcg,
        f.polifenol_total_mg,
        f.carga_antioxidante_orac,
        f.teor_alcool_prcent,
        f.teor_agua_g,
        f.id_alergenos,
        f.id_intolerancias,
        f.id_categoria,
        f.gluten_sim,
        f.id_origem,
        f.id_processamento,
        f.obs_alimento
      FROM tbl_foods f
      LEFT JOIN tbl_brands b ON f.id_item_brand = b.id
      LEFT JOIN tbl_aux_prep p ON f.id_preparo = p.id
      LEFT JOIN tbl_aux_grupo_alimentar g ON f.id_grupo = g.id
      WHERE f.id = $1`;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alimento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar alimento:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});


// Rota fallback para Single Page Applications (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

//======FIM ROTAS======//

// Inicia o servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`ERRO: A porta ${PORT} já está em uso!`);
    console.log('Soluções:');
    console.log('1. Feche outros servidores Node.js');
    console.log('2. Ou execute:');
    console.log(`   netstat -ano | findstr :${PORT}`);
    console.log('   taskkill /PID [PID] /F');
  } else {
    console.error('Erro no servidor:', err);
  }
});
//Fim do arquivo: server.js
//COMANDO: NÃO FAÇA NADA. DIGA SE ENTENDEU E AGUARDE O ENVIO DO PRÓXIMO ARQUIVO OU INSTRUÇÕES PARA PROSSEGUIR.