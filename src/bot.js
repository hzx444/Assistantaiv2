const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Configuração do banco de dados SQLite
const db = new sqlite3.Database('./user_emails.db');

// Usando body-parser para processar os dados do webhook
app.use(bodyParser.json());

// Função para adicionar um e-mail de usuário ao banco de dados
function addUserEmail(email) {
  db.run('INSERT OR IGNORE INTO users (email) VALUES (?)', [email], (err) => {
    if (err) {
      console.error('Erro ao adicionar o e-mail:', err);
    } else {
      console.log('E-mail adicionado com sucesso:', email);
    }
  });
}

// Endpoint para o webhook
app.post('/webhook', (req, res) => {
  // Logs para visualizar a requisição
  console.log('Evento recebido:', req.body);
  
  const { event, customer } = req.body;

  // Verifica se o evento é de venda aprovada
  if (event === 'SALE_APPROVED') {
    // Pega o e-mail do cliente
    const email = customer.email;
    console.log('Compra aprovada para o e-mail:', email);
    
    // Adiciona o e-mail ao banco de dados
    addUserEmail(email);

    // Responde que o evento foi processado corretamente
    res.status(200).send('Evento de compra aprovado recebido');
  } else {
    console.log('Evento não reconhecido:', event);
    res.status(400).send('Evento não reconhecido');
  }
});

// Inicializa o servidor
app.listen(3000, () => {
  console.log('Servidor webhook rodando na porta 3000');
});
