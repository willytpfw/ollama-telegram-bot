# Ollama Telegram Bot (addon para Home Assistant)

Responde mensajes de Telegram usando un modelo de Ollama, escuchando updates
a través del proxy `/tgapi/` de BotMux (no usa el LLM Router integrado de
BotMux, que solo sirve para rutear entre bots).

## Cómo funciona

1. Hace `getUpdates` (long polling) contra el proxy de BotMux:
   `{botmux_url}/tgapi/bot{token}/getUpdates`
2. Si el mensaje empieza con `trigger_prefix` (por defecto `/ask`) o
   menciona `@{bot_username}`, le pasa el texto a Ollama.
3. Manda la respuesta de vuelta con `sendMessage`, también a través del
   proxy de BotMux (para que quede registrada en el feed de mensajes).

Mensajes que no cumplen ninguna de esas dos condiciones se ignoran.

## Instalación en Home Assistant

1. Subí este repo a GitHub como `willytpfw/ollama-telegram-bot` (público o
   privado, ambos funcionan con Supervisor).
2. En Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
   y agregá: `https://github.com/willytpfw/ollama-telegram-bot`
3. El addon **Ollama Telegram Bot** debería aparecer en la lista. Instalalo.
4. Andá a la pestaña **Configuration** del addon y completá:
   - `botmux_url`: `http://homeassistanttpfw.local:8080` (puerto directo
     de BotMux, confirmado que responde con `curl .../api/health`)
   - `telegram_bot_token`: el token de `willytpfwbot`
   - `ollama_url`: `http://192.168.0.160:11434`
   - `ollama_model`: `llama3.2:latest` (o el que uses)
   - `trigger_prefix`: `/ask` (dejalo así o cambialo)
   - `bot_username`: `willytpfwbot`
   - `system_prompt`: ya viene con un default conversacional razonable
5. Guardá, andá a **Info**, y dale **Start**.
6. Revisá el **Log** del addon — debería mostrar
   `Iniciando poll loop contra http://homeassistanttpfw.local:8080/tgapi/bot.../getUpdates`

## Probarlo

En el chat de Telegram donde está `willytpfwbot`, mandá:

```
/ask qué día es hoy
```

o mencioná al bot:

```
@willytpfwbot qué día es hoy
```

El bot debería responder usando el modelo configurado en Ollama.

## Notas

- No depende del **LLM Router** integrado de BotMux — ese campo de
  configuración en BotMux podés dejarlo como esté, no interfiere.
- Si Ollama tarda mucho en la primera respuesta (modelo recién cargado en
  memoria), es normal — no hay timeout agresivo en este backend, usa el
  timeout por defecto de `fetch`.
- Los logs completos (requests recibidos, errores de Ollama, etc.) se ven
  en la pestaña **Log** del addon en Home Assistant.
