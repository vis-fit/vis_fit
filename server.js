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

// Rota para opções de Grupo Alimentar
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
        img_registro_tipo,
        img_registro_web,
        img_registro_dp,
        porcao_base
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 100)
      RETURNING id`;

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