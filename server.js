//INICIO DO ARQUIVO: server.js
//CONEXÃO COM O BANCO DE DADOS NEON.TECH
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path'); // Adicionado para manipulação de caminhos

const app = express();
const PORT = process.env.PORT || 3000; // Usa a porta do Render ou 3000 local

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware para servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'frontend')));

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

// Adicione rotas para todas as outras páginas seguindo o mesmo padrão...

// Rota de teste do banco de dados (mantida)
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota fallback para Single Page Applications (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

//ROTAS
// Rotas para o módulo de alimentos
app.get('/api/foods/search', async (req, res) => {
  try {
    const { term } = req.query;
    
    if (!term) {
      return res.status(400).json({ error: 'Termo de pesquisa não fornecido' });
    }
    
    // Processar termos de pesquisa
    const searchTerms = term.toLowerCase()
      .split(' ')
      .filter(word => word.length > 2 && !['de', 'do', 'da', 'dos', 'das'].includes(word))
      .map(word => word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    
    if (searchTerms.length === 0) {
      return res.json([]);
    }
    
    // Construir query para contar correspondências
    let query = `
      SELECT f.*, 
             b.nome as brand_name,
             p.nome as preparation_name,
             COUNT(*) OVER() as total_count,
             (
               SELECT COUNT(*) 
               FROM (
                 SELECT unnest(string_to_array(f.key_words, ';')) as word
               ) words
               WHERE `;
    
    const conditions = searchTerms.map((_, i) => 
      `words.word ILIKE $${i + 1}`
    ).join(' OR ');
    
    query += conditions + `
             ) as match_count
      FROM tbl_foods f
      LEFT JOIN tbl_brands b ON f.id_item_brand = b.id
      LEFT JOIN tbl_aux_prep p ON f.id_preparo = p.id
      WHERE `;
    
    // Adicionar condições para cada termo de pesquisa
    const searchPatterns = searchTerms.map(term => `%${term}%`);
    const params = [...searchPatterns];
    
    query += conditions.replace(/\$\d+/g, (match) => {
      const index = parseInt(match.substring(1));
      return `$${index + searchTerms.length}`;
    });
    
    query += `
      GROUP BY f.id, b.nome, p.nome
      ORDER BY match_count DESC, f.item_name ASC
      LIMIT 100`;
    
    // Executar query
    const result = await pool.query(query, [...searchPatterns, ...searchPatterns]);
    
    // Formatar resultados
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
    console.error('Erro na pesquisa de alimentos:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Obter detalhes de um alimento
app.get('/api/foods/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Query principal para obter dados básicos
    const foodQuery = `
      SELECT f.*, 
             b.nome as brand_name,
             p.nome as preparation_name,
             g.nome as group_name,
             o.nome as origin_name,
             pr.nome as processing_name,
             m.nome as measure_name
      FROM tbl_foods f
      LEFT JOIN tbl_brands b ON f.id_item_brand = b.id
      LEFT JOIN tbl_aux_prep p ON f.id_preparo = p.id
      LEFT JOIN tbl_aux_grupo_alimentar g ON f.id_grupo = g.id
      LEFT JOIN tbl_aux_origem_alimentar o ON f.id_origem = o.id
      LEFT JOIN tbl_aux_nvl_processamento pr ON f.id_processamento = pr.id
      LEFT JOIN tbl_aux_tp_medida m ON f.id_tipo_medida = m.id
      WHERE f.id = $1`;
    
    const foodResult = await pool.query(foodQuery, [id]);
    
    if (foodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alimento não encontrado' });
    }
    
    const food = foodResult.rows[0];
    
    // Obter seleções múltiplas
    const [allergens, intolerances, categories] = await Promise.all([
      getAuxItems(food.id_alergenos, 'tbl_aux_alergenos'),
      getAuxItems(food.id_intolerancias, 'tbl_aux_intolerancias'),
      getAuxItems(food.id_categoria, 'tbl_aux_categoria_alimentar')
    ]);
    
    // Formatar resposta
    const response = {
      id: food.id,
      item_name: food.item_name,
      image_url: food.img_registro_tipo === 2 ? food.img_registro_web : 
                (food.img_registro_tipo === 1 ? `/api/foods/${food.id}/image` : null),
      brand: food.brand_name,
      preparation: food.preparation_name,
      food_group: food.group_name,
      base_portion: food.porcao_base,
      measure_type: food.id_tipo_medida,
      calories_kcal: food.caloria_kcal,
      proteins_g: food.proteinas_g,
      carbohydrates_g: food.carboidratos_g,
      total_fats_g: food.gorduras_totais_g,
      fibers_g: food.fibras_g,
      saturated_fats_g: food.gorduras_saturadas_g,
      monounsaturated_fats_g: food.gorduras_monoinsaturadas_g,
      polyunsaturated_fats_g: food.gorduras_poliinsaturadas_g,
      trans_fats_g: food.gorduras_trans_g,
      omega_3_g: food.omega_3_g,
      total_sugars_g: food.acucares_totais_g,
      natural_sugars_g: food.acucares_naturais_g,
      added_sugars_g: food.acucares_adicionados_g,
      glycemic_index: food.indice_glicemico,
      glycemic_load: food.carga_glicemica_g,
      sodium_mg: food.sodio_mg,
      potassium_mg: food.potassio_mg,
      cholesterol_mg: food.colesterol_mg,
      calcium_mg: food.calcio_mg,
      total_iron_mg: food.ferro_total_mg,
      heme_iron_mg: food.ferro_heme_mg,
      non_heme_iron_mg: food.ferro_n_heme_mg,
      vitamin_a_mcg: food.vitamina_a_mcg,
      vitamin_c_mg: food.vitamina_c_mg,
      vitamin_d_mcg: food.vitamina_d_mcg,
      vitamin_b12_mcg: food.vitamina_b12_mcg,
      vitamin_e_mg: food.vitamina_e_mg,
      vitamin_b1_mg: food.vitamina_b1_mg,
      vitamin_b2_mg: food.vitamina_b2_mg,
      vitamin_b3_mg: food.vitamina_b3_mg,
      vitamin_b5_mg: food.vitamina_b5_mg,
      vitamin_b6_mg: food.vitamina_b6_mg,
      vitamin_b7_mcg: food.vitamina_b7_mcg,
      vitamin_k_mcg: food.vitamina_k_mcg,
      chlorine_mg: food.cloro_mg,
      magnesium_mg: food.magnesio_mg,
      zinc_mg: food.zinco_mg,
      copper_mg: food.cobre_mg,
      manganese_mg: food.manganes_mg,
      selenium_mcg: food.selenio_mcg,
      iodine_mcg: food.iodo_mcg,
      betacarotene_mcg: food.betacaroteno_mcg,
      lycopene_mcg: food.licopeno_mcg,
      lutein_zeaxanthin_mcg: food.luteina_zeaxantina_mcg,
      omega_6_g: food.omega_6_g,
      omega6_omega3_ratio: food.om6_x_om3,
      phytosterols_mg: food.fitosterol_mg,
      net_carbs_g: food.carboidratos_liquidos_g,
      polyols_g: food.poliois_g,
      essential_amino_acids_mg: food.perfil_aminoacidos_ess_mg,
      pdcaas_score: food.indice_quality_proteinas_pdcaas,
      pral_meq: food.pral_mEq,
      folic_acid_mcg: food.acido_folico_mcg,
      total_polyphenols_mg: food.polifenol_total_mg,
      antioxidant_capacity_orac: food.carga_antioxidante_orac,
      alcohol_content_percent: food.teor_alcool_prcent,
      water_content_g: food.teor_agua_g,
      contains_gluten: food.gluten_sim,
      intolerances,
      allergens,
      categories,
      origin: food.origin_name,
      processing_level: food.processing_name,
      notes: food.obs_alimento
    };
    
    res.json(response);
  } catch (error) {
    console.error('Erro ao obter detalhes do alimento:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Função auxiliar para obter itens de tabelas auxiliares
async function getAuxItems(ids, tableName) {
  if (!ids) return null;
  
  const idList = ids.split(';').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  if (idList.length === 0) return null;
  
  const query = `
    SELECT nome 
    FROM ${tableName}
    WHERE id = ANY($1::int[])
    ORDER BY nome`;
  
  const result = await pool.query(query, [idList]);
  return result.rows.map(row => row.nome);
}

// Obter imagem do alimento
app.get('/api/foods/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT img_registro_dp FROM tbl_foods WHERE id = $1 AND img_registro_tipo = 1', [id]);
    
    if (result.rows.length === 0 || !result.rows[0].img_registro_dp) {
      return res.status(404).send('Imagem não encontrada');
    }
    
    // Converter buffer para imagem (ajuste conforme o formato da imagem)
    const imageBuffer = result.rows[0].img_registro_dp;
    res.type('image/jpeg').send(imageBuffer);
  } catch (error) {
    console.error('Erro ao obter imagem do alimento:', error);
    res.status(500).send('Erro interno no servidor');
  }
});

// Cadastrar novo alimento
app.post('/api/foods', async (req, res) => {
  try {
    const foodData = req.body;
    
    // Verificar duplicatas
    const duplicateQuery = `
      SELECT id 
      FROM tbl_foods 
      WHERE item_name = $1 
        AND (id_item_brand = $2 OR ($2 IS NULL AND id_item_brand IS NULL))
        AND id_preparo = $3
        AND id_grupo = $4`;
    
    const duplicateParams = [
      foodData.item_name,
      foodData.id_item_brand || null,
      foodData.id_preparo,
      foodData.id_grupo
    ];
    
    const duplicateResult = await pool.query(duplicateQuery, duplicateParams);
    
    if (duplicateResult.rows.length > 0) {
      return res.status(400).json({ error: 'Alimento já cadastrado com esses parâmetros' });
    }
    
    // Inserir novo alimento
    const insertQuery = `
      INSERT INTO tbl_foods (
        item_name, id_item_brand, id_preparo, id_grupo, porcao_base, caloria_kcal,
        proteinas_g, carboidratos_g, gorduras_totais_g, gluten_sim, id_origem,
        id_processamento, obs_alimento, fibras_g, gorduras_saturadas_g,
        gorduras_monoinsaturadas_g, gorduras_poliinsaturadas_g, gorduras_trans_g,
        omega_3_g, acucares_totais_g, acucares_naturais_g, acucares_adicionados_g,
        indice_glicemico, carga_glicemica_g, sodio_mg, potassio_mg, colesterol_mg,
        calcio_mg, ferro_total_mg, ferro_heme_mg, ferro_n_heme_mg, vitamina_a_mcg,
        vitamina_c_mg, vitamina_d_mcg, vitamina_b12_mcg, vitamina_e_mg, vitamina_b1_mg,
        vitamina_b2_mg, vitamina_b3_mg, vitamina_b5_mg, vitamina_b6_mg, vitamina_b7_mcg,
        vitamina_k_mcg, cloro_mg, magnesio_mg, zinco_mg, cobre_mg, manganes_mg,
        selenio_mcg, iodo_mcg, betacaroteno_mcg, licopeno_mcg, luteina_zeaxantina_mcg,
        omega_6_g, om6_x_om3, fitosterol_mg, carboidratos_liquidos_g, poliois_g,
        perfil_aminoacidos_ess_mg, indice_quality_proteinas_pdcaas, pral_mEq,
        acido_folico_mcg, polifenol_total_mg, carga_antioxidante_orac,
        teor_alcool_prcent, teor_agua_g, id_alergenos, id_intolerancias, id_categoria,
        id_tipo_medida
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47,
        $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62,
        $63, $64, $65, $66, $67, $68, $69
      ) RETURNING id`;
    
    // Determinar tipo de medida baseado no grupo alimentar
    const measureType = (foodData.id_grupo === '10' || foodData.id_grupo === '11') ? 5 : 1;
    
    const insertParams = [
      foodData.item_name,
      foodData.id_item_brand || null,
      foodData.id_preparo,
      foodData.id_grupo,
      foodData.porcao_base,
      foodData.caloria_kcal,
      foodData.proteinas_g,
      foodData.carboidratos_g,
      foodData.gorduras_totais_g,
      foodData.gluten_sim,
      foodData.id_origem || null,
      foodData.id_processamento || null,
      foodData.obs_alimento || null,
      foodData.fibras_g || null,
      foodData.gorduras_saturadas_g || null,
      foodData.gorduras_monoinsaturadas_g || null,
      foodData.gorduras_poliinsaturadas_g || null,
      foodData.gorduras_trans_g || null,
      foodData.omega_3_g || null,
      foodData.acucares_totais_g || null,
      foodData.acucares_naturais_g || null,
      foodData.acucares_adicionados_g || null,
      foodData.indice_glicemico || null,
      foodData.carga_glicemica_g || null,
      foodData.sodio_mg || null,
      foodData.potassio_mg || null,
      foodData.colesterol_mg || null,
      foodData.calcio_mg || null,
      foodData.ferro_total_mg || null,
      foodData.ferro_heme_mg || null,
      foodData.ferro_n_heme_mg || null,
      foodData.vitamina_a_mcg || null,
      foodData.vitamina_c_mg || null,
      foodData.vitamina_d_mcg || null,
      foodData.vitamina_b12_mcg || null,
      foodData.vitamina_e_mg || null,
      foodData.vitamina_b1_mg || null,
      foodData.vitamina_b2_mg || null,
      foodData.vitamina_b3_mg || null,
      foodData.vitamina_b5_mg || null,
      foodData.vitamina_b6_mg || null,
      foodData.vitamina_b7_mcg || null,
      foodData.vitamina_k_mcg || null,
      foodData.cloro_mg || null,
      foodData.magnesio_mg || null,
      foodData.zinco_mg || null,
      foodData.cobre_mg || null,
      foodData.manganes_mg || null,
      foodData.selenio_mcg || null,
      foodData.iodo_mcg || null,
      foodData.betacaroteno_mcg || null,
      foodData.licopeno_mcg || null,
      foodData.luteina_zeaxantina_mcg || null,
      foodData.omega_6_g || null,
      foodData.om6_x_om3 || null,
      foodData.fitosterol_mg || null,
      foodData.carboidratos_liquidos_g || null,
      foodData.poliois_g || null,
      foodData.perfil_aminoacidos_ess_mg || null,
      foodData.indice_quality_proteinas_pdcaas || null,
      foodData.pral_mEq || null,
      foodData.acido_folico_mcg || null,
      foodData.polifenol_total_mg || null,
      foodData.carga_antioxidante_orac || null,
      foodData.teor_alcool_prcent || null,
      foodData.teor_agua_g || null,
      foodData.id_alergenos || null,
      foodData.id_intolerancias || null,
      foodData.id_categoria || null,
      measureType
    ];
    
    const insertResult = await pool.query(insertQuery, insertParams);
    
    res.status(201).json({ id: insertResult.rows[0].id });
  } catch (error) {
    console.error('Erro ao cadastrar alimento:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rotas para dados auxiliares
app.get('/api/brands', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_brands ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter marcas:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/preparations', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_prep ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter modos de preparo:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/food-groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_grupo_alimentar ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter grupos alimentares:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/allergens', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_alergenos ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter alérgenos:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/intolerances', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_intolerancias ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter intolerâncias:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/food-categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_categoria_alimentar ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter categorias alimentares:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/food-origins', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_origem_alimentar ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter origens alimentares:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.get('/api/processing-levels', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM tbl_aux_nvl_processamento ORDER BY nome');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter níveis de processamento:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

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
//FIM ROTAS

//FIM DA CONEXÃO COM BANCO DE DADOS
//FIM DO ARQUIVO: server.js
//COMANDO: NÃO FAÇA NADA. DIGA SE ENTENDEU E AGUARDE O ENVIO DO PRÓXIMO ARQUIVO PARA PROSSEGUIR