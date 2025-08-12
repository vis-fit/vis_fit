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

// Inicia o servidor com tratamento de erro
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
//FIM DA CONEXÃO COM BANCO DE DADOS