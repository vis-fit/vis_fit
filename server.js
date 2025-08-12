//CONEXÃO COM O BANCO DE DADOS NEON.TECH
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Configuração à prova de falhas
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rota de teste
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicia o servidor com tratamento de erro
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

// Captura erros de porta
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