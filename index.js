const fs = require('fs');

const options = JSON.parse(fs.readFileSync('/data/options.json', 'utf8'));

const BOTMUX_URL = String(options.botmux_url || '').replace(/\/$/, '');
const TOKEN = options.telegram_bot_token;
const OLLAMA_URL = String(options.ollama_url || '').replace(/\/$/, '') + '/v1/chat/completions';
const MODEL = options.ollama_model || 'llama3.2:latest';
const TRIGGER_PREFIX = options.trigger_prefix || '/ask';
const BOT_USERNAME = options.bot_username || '';
const SYSTEM_PROMPT = options.system_prompt || 'Eres un asistente útil.';

if (!TOKEN) {
  console.error('telegram_bot_token no está configurado. Configuralo en la pestaña Configuration del addon.');
  process.exit(1);
}

const BASE = `${BOTMUX_URL}/tgapi/bot${TOKEN}`;

let offset = 0;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Devuelve el texto de la consulta si el mensaje debe disparar una respuesta,
// o null si el mensaje debe ignorarse.
function extractQuery(text) {
  if (!text) return null;

  if (text.startsWith(TRIGGER_PREFIX)) {
    const rest = text.slice(TRIGGER_PREFIX.length).trim();
    return rest.length > 0 ? rest : null;
  }

  if (BOT_USERNAME && text.includes('@' + BOT_USERNAME)) {
    const rest = text.split('@' + BOT_USERNAME).join(' ').trim();
    return rest.length > 0 ? rest : null;
  }

  return null;
}

async function askOllama(userText) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`Ollama respondió HTTP ${res.status}: ${bodyText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '(el modelo no devolvió texto)';
}

async function sendMessage(chatId, text, replyToId) {
  const body = { chat_id: chatId, text };
  if (replyToId) body.reply_to_message_id = replyToId;

  const res = await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    log('sendMessage falló:', res.status, bodyText);
  }
}

async function pollLoop() {
  log('Iniciando poll loop contra', `${BASE}/getUpdates`);

  while (true) {
    try {
      const url = `${BASE}/getUpdates?offset=${offset}&timeout=60`;
      const res = await fetch(url);

      if (!res.ok) {
        log('getUpdates devolvió HTTP', res.status);
        await sleep(5000);
        continue;
      }

      const data = await res.json();

      if (!data.ok) {
        log('getUpdates: respuesta no ok', JSON.stringify(data));
        await sleep(5000);
        continue;
      }

      for (const update of data.result || []) {
        offset = update.update_id + 1;

        const msg = update.message || update.channel_post;
        if (!msg || !msg.text) continue;

        const query = extractQuery(msg.text);
        if (query === null) continue;

        log('Consulta recibida en chat', msg.chat.id, '->', query);

        try {
          const reply = await askOllama(query);
          await sendMessage(msg.chat.id, reply, msg.message_id);
        } catch (err) {
          log('Error consultando Ollama:', err.message);
          await sendMessage(msg.chat.id, 'Ocurrió un error consultando el modelo. Revisá los logs del addon.', msg.message_id);
        }
      }
    } catch (err) {
      log('Error en el poll loop:', err.message);
      await sleep(5000);
    }
  }
}

pollLoop();
