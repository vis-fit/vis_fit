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
app.use(fileUpload());
app.use(express.json({ limit: '50mb' })); // Aumenta limite para imagens base64
app.use(express.static(path.join(__dirname, 'frontend')));

// Middlewares
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'frontend')));



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
      WHERE f.item_name ILIKE ANY($1::text[])
      OR b.nome ILIKE ANY($1::text[])
      ORDER BY f.item_name ASC
      LIMIT 100`;
    
    const searchPatterns = searchTerms.map(term => `%${term}%`);
    const result = await pool.query(query, [searchPatterns]);
    
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

//Roda Salvar Alimentos Cadastro
app.post('/api/foods', async (req, res) => {
    try {
        // 1. Extrai dados do FormData
        const payload = JSON.parse(req.body.data);
        const imagem = req.files?.img_registro_dp;

        // 2. Validações básicas
        if (!payload.item_name || !payload.id_preparo || !payload.id_grupo || !payload.id_tipo_medida) {
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        // 3. Query SQL otimizada
        const query = `
            INSERT INTO tbl_foods (
                item_name, id_item_brand, id_preparo, id_grupo, id_tipo_medida,
                caloria_kcal, proteinas_g, carboidratos_g, gorduras_totais_g,
                gorduras_monoinsaturadas_g, gorduras_poliinsaturadas_g, gorduras_saturadas_g,
                gorduras_trans_g, fibras_g, sodio_mg, teor_agua_g, acucares_totais_g,
                acucares_naturais_g, acucares_adicionados_g, indice_glicemico, carga_glicemica_g,
                colesterol_mg, ferro_total_mg, ferro_heme_mg, ferro_n_heme_mg, omega_3_g,
                calcio_mg, magnesio_mg, zinco_mg, potassio_mg, vitamina_a_mcg, vitamina_b12_mcg,
                vitamina_c_mg, vitamina_d_mcg, vitamina_e_mg, vitamina_k_mcg, vitamina_b1_mg,
                vitamina_b2_mg, vitamina_b3_mg, vitamina_b5_mg, vitamina_b6_mg, vitamina_b7_mcg,
                omega_6_g, fitosterol_mg, cloro_mg, pral_mEq, poliois_g, carboidratos_liquidos_g,
                indice_quality_proteinas_pdcaas, perfil_aminoacidos_ess_mg, cobre_mg, manganes_mg,
                selenio_mcg, iodo_mcg, betacaroteno_mcg, licopeno_mcg, luteina_zeaxantina_mcg,
                acido_folico_mcg, polifenol_total_mg, carga_antioxidante_orac, teor_alcool_prcent,
                img_registro_tipo, img_registro_web, porcao_base, img_registro_dp
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
                $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56,
                $57, $58, $59, $60, $61, $62, $63, $64, $65
            ) RETURNING id`;
        
        // 4. Preparação dos valores
        const values = [
            // Campos básicos (1-5)
            payload.item_name,
            payload.id_item_brand || null,
            payload.id_preparo,
            payload.id_grupo,
            payload.id_tipo_medida,
            
            // Macronutrientes (6-9)
            parseFloat(payload.caloria_kcal || 0),
            parseFloat(payload.proteinas_g || 0),
            parseFloat(payload.carboidratos_g || 0),
            parseFloat(payload.gorduras_totais_g || 0),
            
            // Demais campos nutricionais (10-61)
            parseFloat(payload.gorduras_monoinsaturadas_g || 0),
            parseFloat(payload.gorduras_poliinsaturadas_g || 0),
            parseFloat(payload.gorduras_saturadas_g || 0),
            parseFloat(payload.gorduras_trans_g || 0),
            parseFloat(payload.fibras_g || 0),
            parseFloat(payload.sodio_mg || 0),
            parseFloat(payload.teor_agua_g || 0),
            parseFloat(payload.acucares_totais_g || 0),
            parseFloat(payload.acucares_naturais_g || 0),
            parseFloat(payload.acucares_adicionados_g || 0),
            parseFloat(payload.indice_glicemico || 0),
            parseFloat(payload.carga_glicemica_g || 0),
            parseFloat(payload.colesterol_mg || 0),
            parseFloat(payload.ferro_total_mg || 0),
            parseFloat(payload.ferro_heme_mg || 0),
            parseFloat(payload.ferro_n_heme_mg || 0),
            parseFloat(payload.omega_3_g || 0),
            parseFloat(payload.calcio_mg || 0),
            parseFloat(payload.magnesio_mg || 0),
            parseFloat(payload.zinco_mg || 0),
            parseFloat(payload.potassio_mg || 0),
            parseFloat(payload.vitamina_a_mcg || 0),
            parseFloat(payload.vitamina_b12_mcg || 0),
            parseFloat(payload.vitamina_c_mg || 0),
            parseFloat(payload.vitamina_d_mcg || 0),
            parseFloat(payload.vitamina_e_mg || 0),
            parseFloat(payload.vitamina_k_mcg || 0),
            parseFloat(payload.vitamina_b1_mg || 0),
            parseFloat(payload.vitamina_b2_mg || 0),
            parseFloat(payload.vitamina_b3_mg || 0),
            parseFloat(payload.vitamina_b5_mg || 0),
            parseFloat(payload.vitamina_b6_mg || 0),
            parseFloat(payload.vitamina_b7_mcg || 0),
            parseFloat(payload.omega_6_g || 0),
            parseFloat(payload.fitosterol_mg || 0),
            parseFloat(payload.cloro_mg || 0),
            parseFloat(payload.pral_mEq || 0),
            parseFloat(payload.poliois_g || 0),
            parseFloat(payload.carboidratos_liquidos_g || 0),
            parseFloat(payload.indice_quality_proteinas_pdcaas || 0),
            parseFloat(payload.perfil_aminoacidos_ess_mg || 0),
            parseFloat(payload.cobre_mg || 0),
            parseFloat(payload.manganes_mg || 0),
            parseFloat(payload.selenio_mcg || 0),
            parseFloat(payload.iodo_mcg || 0),
            parseFloat(payload.betacaroteno_mcg || 0),
            parseFloat(payload.licopeno_mcg || 0),
            parseFloat(payload.luteina_zeaxantina_mcg || 0),
            parseFloat(payload.acido_folico_mcg || 0),
            parseFloat(payload.polifenol_total_mg || 0),
            parseFloat(payload.carga_antioxidante_orac || 0),
            parseFloat(payload.teor_alcool_prcent || 0),
            
            // Imagem e porção (62-65)
            payload.img_registro_tipo || null,
            payload.img_registro_web || null,
            100, // porcao_base fixo em 100
            imagem?.data || null
        ];

        // 5. Execução da query
        const result = await pool.query(query, values);
        res.json({ success: true, id: result.rows[0].id });

    } catch (error) {
        console.error('Erro detalhado:', error);
        res.status(500).json({
            error: 'Erro interno no servidor',
            details: error.message
        });
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
        f.caloria_kcal,
        f.proteinas_g,
        f.carboidratos_g,
        f.gorduras_totais_g,
        f.img_registro_tipo,
        f.img_registro_web,
        CASE WHEN f.img_registro_tipo = 1 THEN
          'data:image/jpeg;base64,' || encode(f.img_registro_dp, 'base64')
        ELSE NULL END as img_base64,
        b.nome as brand_name,
        p.nome as preparation_name,
        g.nome as group_name,
        f.porcao_base,
        f.id_tipo_medida
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
//Comando: Não faça nada. Somente diga se recebeu e aguarde instruções para prosseguir.