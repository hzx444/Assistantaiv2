const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();

// Inicia o bot com o token do Telegram
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Criação ou abertura do banco de dados SQLite para armazenar os e-mails de usuários que pagaram
const db = new sqlite3.Database('./user_emails.db');

// Cria a tabela "users" caso ela não exista
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

// Função para processar os logs de compra recebidos da Kirvano (armazenando os e-mails no banco)
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
  // Inicia o fluxo de coleta de e-mail
  userState[ctx.from.id] = { step: 'waiting_for_email' };
  ctx.reply('Olá! Para acessar o Assistente de IA, por favor, forneça o seu e-mail de compra.');
});

// Comando para verificar o e-mail e liberar o acesso
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const userEmail = ctx.message.text.trim();

  // Verifica se o usuário está no fluxo de espera de e-mail
  if (userState[userId] && userState[userId].step === 'waiting_for_email') {
    // Verifica se o e-mail está registrado
    checkEmail(userEmail, (exists) => {
      if (exists) {
        ctx.reply('Acesso liberado! Agora você pode conversar com o Assistente de IA.');
        userState[userId].step = 'access_granted'; // Alterando o estado para acesso liberado

        // Aqui você pode adicionar a lógica de integração com a OpenAI para começar a conversar
        // Por enquanto, enviaremos uma mensagem de boas-vindas para simular
        ctx.reply('Seja bem-vindo ao Assistente de IA. Como posso ajudá-lo?');
      } else {
        ctx.reply('E-mail não encontrado. Por favor, verifique se você já fez a compra.');
      }
    });
  }
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

// Configuração do webhook da Kirvano para processar eventos de compra e armazenar os e-mails
bot.on('webhook', (ctx) => {
  const event = ctx.update;
  if (event && event.data && event.data.email) {
    const email = event.data.email.trim();
    processKivanoEvent(email);
  }
});

// Configuração do Webhook para produção no Railway
bot.telegram.setWebhook(process.env.WEBHOOK_URL);

// Inicia o bot
console.log('Bot configurado para Webhook!');
