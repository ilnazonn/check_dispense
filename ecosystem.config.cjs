module.exports = {
    apps: [
        {
            name: 'checkdispense',                // Имя приложения
            script: './check_dispense.js',            // Точка входа в ваше приложение
            cwd: './check_dispense/',
            env_production: {
                NODE_ENV: process.env.NODE_ENV,
                TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
                TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
                CLIENTID: process.env.CLIENTID,
                CLIENTSECRET: process.env.CLIENTSECRET,
                USERNME: process.env.USERNME,
                PASSWORD: process.env.PASSWORD,
                VM_ID: process.env.VM_ID,
                BASE_URL: process.env.BASE_URL,
                VENDISTA_LOGIN: process.env.VENDISTA_LOGIN,
                VENDISTA_PASSWORD: process.env.VENDISTA_PASSWORD,
                VENDISTA_ID: process.env.VENDISTA_ID
            }
        }
    ]
};