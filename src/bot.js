const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();

// Inicia o bot com o token do Telegram
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Criação ou abertura do banco de dados SQLite
const db = new sqlite3.Database('./src/user_emails.db');

// Criação da tabela de usuários se não existir
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE
  )`);
});

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

// Função para armazenar o e-mail no banco de dados
function storeEmail(email, callback) {
  db.run('INSERT INTO users (email) VALUES (?)', [email], function(err) {
    if (err) {
      console.error('Erro ao armazenar o e-mail:', err);
      callback(false);
      return;
    }
    callback(true);
  });
}

// Função para processar os logs de compra recebidos da Kivano
function processKivanoEvent(email) {
  storeEmail(email, (success) => {
    if (success) {
      console.log(`E-mail ${email} armazenado com sucesso.`);
    } else {
      console.error(`Erro ao armazenar o e-mail ${email}.`);
    }
  });
}

// Armazenar o estado do fluxo de cada usuário
const userState = {};

// Comando /iniciar
bot.command('iniciar', (ctx) => {
  userState[ctx.from.id] = { step: 'waiting_for_email' };
  ctx.reply('Olá! Para acessar o Assistente de IA, por favor, forneça o seu e-mail de compra.');
});

// Comando para verificar o e-mail e liberar o acesso
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const userEmail = ctx.message.text.trim();

  if (userState[userId] && userState[userId].step === 'waiting_for_email') {
    checkEmail(userEmail, (exists) => {
      if (exists) {
        ctx.reply('Acesso liberado! Agora você pode conversar com o Assistente de IA.');
        userState[userId].step = 'access_granted';
        ctx.reply('Seja bem-vindo ao Assistente de IA. Como posso ajudá-lo?');
      } else {
        ctx.reply('E-mail não encontrado. Por favor, verifique se você já fez a compra.');
      }
    });
  }
});

// Webhook para processar eventos da Kivano
bot.on('webhook', (ctx) => {
  console.log('Webhook da Kivano recebido:', ctx.update); // Log para ver o evento da Kivano
  const event = ctx.update;
  if (event && event.data && event.data.email) {
    const email = event.data.email.trim();
    processKivanoEvent(email);
  } else {
    console.log('Dados de e-mail não encontrados no evento da Kivano');
  }
});

// Configuração do Webhook para produção no Railway
bot.telegram.setWebhook(process.env.WEBHOOK_URL);

// Inicia o bot com Webhook
bot.startWebhook('/webhook', null, process.env.PORT);

console.log('Bot configurado para Webhook!');
