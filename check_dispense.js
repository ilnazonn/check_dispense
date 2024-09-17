import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Твой токен бота от BotFather
const token = process.env.telegram_token;

// Учетные данные для авторизации API
const clientId = process.env.clientId;
const clientSecret = process.env.clientSecret;
const username = process.env.usernme;
const password = process.env.password;
const base_url = process.env.base_url;

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

    // Переместите return внутрь try-блока
    return response.data.access_token;
  } catch (error) {
    // Исправьте синтаксис здесь
    throw new Error(`Ошибка авторизации: ${error.response.data.error_description}`);
  }
}

// Функция для получения статуса аппарата
async function getMachineStatus() {
  try {
    const response = await axios.get(`${process.env.BASE_URL}/v2/vending_machines/${process.env.vm_id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });

    const state = response.data.state;

    switch (state) {
      case 0:
      case null:
        return `${state} - неизвестно`;
      case 1:
        return `${state} - работает`;
      case 2:
        return `${state} - не работает`;
      case 3:
        return `${state} - нет GSM-связи`;
      default:
        return `${state} - неизвестное состояние`;
    }
  } catch (error) {
    return `Ошибка получения статуса: ${error.message}`;
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

    const status = await getMachineStatus();

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
*Статус аппарата*: \`${status}\`
*Статус код*: \`${response.status}\`
*Ответ от API*:
\`\`\`json
${JSON.stringify(response.data, null, 2)}
\`\`\`
    `;

    bot.sendMessage(chatId, markdownResponse, { parse_mode: 'Markdown' });
  } catch (error) {
    const status = await getMachineStatus();
    if (error.response) {
      // Сервер ответил с кодом состояния, отличным от 2xx
      const markdownErrorResponse = `
*Статус аппарата*: \`${status}\`
*Статус код*: \`${error.response.status}\`
*Ответ от API*:
\`\`\`json
${JSON.stringify(error.response.data, null, 2)}
\`\`\`
      `;
      bot.sendMessage(chatId, markdownErrorResponse, { parse_mode: 'Markdown' });
    } else if (error.request) {
      // Запрос был сделан, но ответа не получено
      bot.sendMessage(chatId, `Ошибка: запрос был сделан, но ответа не получено\n*Статус аппарата*: \`${status}\``, { parse_mode: 'Markdown' });
    } else {
      // Что-то случилось в настройках запроса
      bot.sendMessage(chatId, `Ошибка. ${error.message}\n*Статус аппарата*: \`${status}\``, { parse_mode: 'Markdown' });
    }
  }
});

// Функция для получения токена от Vendista
async function getVendistaToken() {
  try {
    const response = await axios.get(`https://api.vendista.ru:99/token?login=${process.env.VENDISTA_LOGIN}&password=${process.env.VENDISTA_PASSWORD}`);
    return response.data.token;
  } catch (error) {
    throw new Error(`Ошибка получения токена Vendista: ${error.message}`);
  }
}

// Функция для выполнения команды перезагрузки
async function sendRebootCommand(token) {
  try {
    const response = await axios.post(
        `https://api.vendista.ru:99/terminals/${process.env.VENDISTA_ID}/commands/?token=${token}`,
        {
          command_id: "2"
        },
        {
          headers: {
            Authorization: `Bearer ${token}` // Используем Bearer токен для авторизации
          }
        }
    );

    return response.data;
  } catch (error) {
    throw new Error(`Ошибка выполнения команды перезагрузки: ${error.message}`);
  }
}


// Обработчик для команды /reboot
bot.onText(/\/reboot/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const vendistaToken = await getVendistaToken();
    const rebootResponse = await sendRebootCommand(vendistaToken);

    const markdownResponse = `
Команда перезагрузки отправлена успешно.
Ответ от API:
\`\`\`json
${JSON.stringify(rebootResponse, null, 2)}
\`\`\`
    `;

    bot.sendMessage(chatId, markdownResponse, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, `Ошибка при отправке команды перезагрузки: ${error.message}`, { parse_mode: 'Markdown' });
  }
});

// Запуск проверки удаленной выдачи
async function sendRequest() {
  const token = await getAuthToken();

  const response = await fetch(`${process.env.BASE_URL}/v2/vending_machines/${process.env.VM_ID}/dispense`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      number: "106",
      cup: "0",
      sugar: "0",
      discount: "0"
    })
  });

  const data = await response.json();

  // Отправка уведомления в телеграмм, если статус не равен 200
  if (response.status !== 200) {
    const status = await getMachineStatus(); // Предположим, что getMachineStatus() — это функция, возвращающая статус аппарата.

    const message = `
*Статус аппарата*: \`${status}\`
*Запрос завершился ошибкой*: ${response.status}
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
    `;

    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {parse_mode: 'Markdown'});
  }
}

// Функция для запуска периодического выполнения запроса
function startInterval() {
  setInterval(sendRequest, 2 * 60 * 1000);
}

// Запускаем интервал
startInterval();


// Запуск бота
bot.on('polling_error', (error) => {
  console.log(error);  // Вывод ошибок
});

