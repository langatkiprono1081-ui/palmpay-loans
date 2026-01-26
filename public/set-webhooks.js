require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BOTS_FILE = path.join(__dirname, 'bots.json');
const DOMAIN = process.env.BACKEND_DOMAIN || 'https://zanaco-backend.onrender.com'; // your deployed domain

if (!fs.existsSync(BOTS_FILE)) {
    console.error('❌ bots.json not found!');
    process.exit(1);
}

const bots = JSON.parse(fs.readFileSync(BOTS_FILE, 'utf-8'));

async function setWebhook(bot) {
    try {
        const webhookUrl = `${DOMAIN}/telegram-webhook/${bot.botId}`;
        const resp = await axios.get(`https://api.telegram.org/bot${bot.botToken}/setWebhook?url=${webhookUrl}`);
        console.log(`✅ Webhook set for ${bot.botId}:`, resp.data);
    } catch (err) {
        console.error(`❌ Failed to set webhook for ${bot.botId}:`, err.response?.data || err.message);
    }
}

(async () => {
    console.log(`🚀 Setting webhooks for ${bots.length} bots...`);
    for (const bot of bots) {
        if (!bot.botToken || !bot.botId) {
            console.log(`⚠ Skipping invalid bot entry: ${JSON.stringify(bot)}`);
            continue;
        }
        await setWebhook(bot);
    }
    console.log('🎯 All done!');
})();
