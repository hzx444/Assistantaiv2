const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Inicia o bot com o token do Telegram
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Criação do banco de dados SQLite para armazenar os e-mails de usuários que pagaram
const db = new sqlite3.Database('./user_emails.db');

// Função para verificar o e-mail no banco de dados
function checkEmail(email, callback) {
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('Erro ao verificar o e-mail:', err);
      callback(false);
      return;
    }
    callback(row ? true : false);
  });
}

// Comando /iniciar
bot.command('iniciar', (ctx) => {
  ctx.reply('Para acessar o Assistente de IA, por favor, forneça o seu e-mail de compra.');
});

// Comando para verificar o e-mail e liberar o acesso
bot.on('text', (ctx) => {
  const userEmail = ctx.message.text.trim();
  
  // Verifica se o e-mail está registrado
  checkEmail(userEmail, (exists) => {
    if (exists) {
      ctx.reply('Acesso liberado! Agora você pode conversar com o Assistente de IA.');
      // Aqui você pode adicionar a lógica de integração com a OpenAI para começar a conversar
    } else {
      ctx.reply('E-mail não encontrado. Por favor, verifique se você já fez a compra.');
    }
  });
});

// Conecta com a API da OpenAI (GPT-4) para gerar respostas
async function getGpt4Response(userInput) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userInput }]
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Inicia o bot
bot.launch().then(() => {
  console.log('Bot está funcionando!');
});
