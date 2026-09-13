const { readSessionJson, writeSessionJson } = require('../lib/session_data');
const isOwnerOrSudo = require('../lib/isOwner');

function getConfig(sock) {
  return readSessionJson(sock, 'indicators.json', { enabled: false, mode: 'null' });
}

async function indicatorsCommand(sock, chatId, message, rawText) {
  const sender = message.key.participant || message.key.remoteJid;
  if (!message.key.fromMe && !(await isOwnerOrSudo(sender, sock, chatId))) {
    return sock.sendMessage(chatId, { text: '❌ Only the bot owner can use this command.' }, { quoted: message });
  }
  const args = String(rawText || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const cfg = getConfig(sock);
  if (args[0] === 'on' || args[0] === 'off') cfg.enabled = args[0] === 'on';
  else if (args[0]) return sock.sendMessage(chatId, { text: '⚠️ Use .indicator on/off' }, { quoted: message });
  writeSessionJson(sock, 'indicators.json', cfg);
  return sock.sendMessage(chatId, { text: `✅ Indicators ${cfg.enabled ? 'enabled' : 'disabled'}.` }, { quoted: message });
}

async function indicatorSetCommand(sock, chatId, message, rawText) {
  const sender = message.key.participant || message.key.remoteJid;
  if (!message.key.fromMe && !(await isOwnerOrSudo(sender, sock, chatId))) {
    return sock.sendMessage(chatId, { text: '❌ Only the bot owner can use this command.' }, { quoted: message });
  }
  const mode = String(rawText || '').trim().toLowerCase();
  if (!['null', 'white', 'blue'].includes(mode)) {
    return sock.sendMessage(chatId, { text: '⚠️ Use .indicatorset null/white/blue' }, { quoted: message });
  }
  const cfg = getConfig(sock); cfg.mode = mode; writeSessionJson(sock, 'indicators.json', cfg);
  return sock.sendMessage(chatId, { text: `✅ Indicator mode set to ${mode}.` }, { quoted: message });
}

async function handleIndicators(sock, message) {
  const cfg = getConfig(sock);
  if (!cfg.enabled || message?.key?.fromMe || !message?.key?.id || !message?.key?.remoteJid) return;
  // null/white intentionally leave the message at WhatsApp's delivered state;
  // only blue explicitly asks Baileys to send a read receipt.
  if (cfg.mode !== 'blue') return;
  if (typeof sock.readMessages !== 'function') return;
  try {
    // Baileys/WhatsApp decides the actual receipt color from account privacy and chat state.
    // Calling readMessages is the supported best-effort way to produce a read receipt.
    await sock.readMessages([{ remoteJid: message.key.remoteJid, id: message.key.id, participant: message.key.participant }]);
  } catch (error) { console.error('indicator receipt skipped:', error.message); }
}
module.exports = { indicatorsCommand, indicatorSetCommand, handleIndicators };
