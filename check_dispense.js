const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

// Твой токен бота от BotFather
const token = process.env.telegram_token;

// Учетные данные для авторизации API
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;
const username = process.env.username;
const password = process.env.password;
const base_url = process.env.base_url;
// Создание экземпляра бота
const bot = new TelegramBot(token, { polling: true });

// Функция для получения авторизационного токена
async function getAuthToken() {
  try {
    const response = await axios.post(`${process.env.base_url}/auth/`, {
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'teleport',
      username: username,
      password: password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.access_token;
  } catch (error) {
    throw new Error(`Ошибка авторизации: ${error.response.data.error_description}`);
  }
}

// Обработчик для команды /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Привет! Введите /check для проверки выдачи.");
});

// Обработчик для команды /check
bot.onText(/\/check/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const token = await getAuthToken();

    const response = await axios.post(`${process.env.base_url}/v2/vending_machines/${process.env.vm_id}/dispense`, {
      number: "106",
      cup: "0",
      sugar: "0",
      discount: "0"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const markdownResponse = `
*Статус код*: \`${response.status}\`
*Ответ от API*:
\`\`\`json
${JSON.stringify(response.data, null, 2)}
\`\`\`
    `;

    bot.sendMessage(chatId, markdownResponse, { parse_mode: 'Markdown' });
  } catch (error) {
    if (error.response) {
      // Сервер ответил с кодом состояния, отличным от 2xx
      const markdownErrorResponse = `
*Ошибка*:
*Статус код*: \`${error.response.status}\`
*Ответ от API*:
\`\`\`json
${JSON.stringify(error.response.data, null, 2)}
\`\`\`
      `;
      bot.sendMessage(chatId, markdownErrorResponse, { parse_mode: 'Markdown' });
    } else if (error.request) {
      // Запрос был сделан, но ответа не получено
      bot.sendMessage(chatId, `Ошибка: запрос был сделан, но ответа не получено`, { parse_mode: 'Markdown' });
    } else {
      // Что-то случилось в настройках запроса
      bot.sendMessage(chatId, `Ошибка: ${error.message}`, { parse_mode: 'Markdown' });
    }
  }
});

// Запуск бота
bot.on('polling_error', (error) => {
  console.log(error);  // Вывод ошибок
});