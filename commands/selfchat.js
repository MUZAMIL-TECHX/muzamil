const axios = require('axios');
const { readSessionJson, writeSessionJson } = require('../lib/session_data');
const isOwnerOrSudo = require('../lib/isOwner');
const aiConfig = require('../lib/ai_config');

const defaults = { enabled: false, scope: 'group', memory: {} };
function config(sock) { return readSessionJson(sock, 'selfchat.json', defaults); }
function save(sock, value) { writeSessionJson(sock, 'selfchat.json', value); }
function textOf(message) {
  return message.message?.conversation || message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption || message.message?.videoMessage?.caption || '';
}
function botIds(sock) {
  const ids = [sock.user?.id, sock.user?.lid].filter(Boolean).map(v => v.split(':')[0].split('@')[0]);
  return new Set(ids);
}
function isRelevant(sock, message, chatId) {
  const ctx = message.message?.extendedTextMessage?.contextInfo || {};
  const mentioned = (ctx.mentionedJid || []).some(j => botIds(sock).has(j.split(':')[0].split('@')[0]));
  const quoted = ctx.participant && botIds(sock).has(ctx.participant.split(':')[0].split('@')[0]);
  return chatId.endsWith('@g.us') ? (mentioned || quoted) : true;
}
async function command(sock, chatId, message, rawText) {
  const sender = message.key.participant || message.key.remoteJid;
  if (!message.key.fromMe && !(await isOwnerOrSudo(sender, sock, chatId))) return sock.sendMessage(chatId, { text: '❌ Only the bot owner can use this command.' }, { quoted: message });
  const args = String(rawText || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const cfg = config(sock);
  if (args[0] === 'on' || args[0] === 'off') cfg.enabled = args[0] === 'on';
  else if (args[0]) return sock.sendMessage(chatId, { text: '⚠️ Use .selfchat on/off' }, { quoted: message });
  save(sock, cfg);
  return sock.sendMessage(chatId, { text: `✅ Self-chat ${cfg.enabled ? 'enabled' : 'disabled'} (${cfg.scope}).` }, { quoted: message });
}
async function scopeCommand(sock, chatId, message, rawText) {
  const sender = message.key.participant || message.key.remoteJid;
  if (!message.key.fromMe && !(await isOwnerOrSudo(sender, sock, chatId))) return sock.sendMessage(chatId, { text: '❌ Only the bot owner can use this command.' }, { quoted: message });
  const scope = String(rawText || '').trim().toLowerCase();
  if (!['group', 'inbox'].includes(scope)) return sock.sendMessage(chatId, { text: '⚠️ Use .selfchatset group/inbox' }, { quoted: message });
  const cfg = config(sock); cfg.scope = scope; save(sock, cfg);
  return sock.sendMessage(chatId, { text: `✅ Self-chat memory scope set to ${scope}.` }, { quoted: message });
}
function apiUrl(prompt) {
  const url = new URL(aiConfig.baseUrl); url.searchParams.set('prompt', prompt); url.searchParams.set('apikey', aiConfig.apiKey); return url.toString();
}
async function ai(prompt) {
  const response = await axios.get(apiUrl(prompt), { timeout: 25000 });
  const data = response.data;
  return String(data?.result || data?.response || data?.answer || data?.text || data?.data || '').trim();
}
async function response(sock, chatId, message, senderId) {
  const cfg = config(sock);
  if (!cfg.enabled || !isRelevant(sock, message, chatId)) return false;
  const scopeKey = cfg.scope === 'group' ? chatId : `inbox:${senderId}`;
  const history = Array.isArray(cfg.memory[scopeKey]) ? cfg.memory[scopeKey] : [];
  const incoming = textOf(message).trim(); if (!incoming || incoming.startsWith('.')) return false;
  history.push(`User: ${incoming}`); while (history.length > 12) history.shift();
  const prompt = `Reply naturally as a helpful WhatsApp user. Keep it concise, use the language of the user, and never claim to be human or hide that you are automated. Conversation history:\n${history.join('\n')}\nAssistant:`;
  try {
    const answer = await ai(prompt);
    if (!answer) return false;
    history.push(`Assistant: ${answer}`); while (history.length > 12) history.shift(); cfg.memory[scopeKey] = history; save(sock, cfg);
    await sock.sendMessage(chatId, { text: answer }, { quoted: message }); return true;
  } catch (error) { console.error('selfchat AI error:', error.message); return false; }
}
module.exports = { command, scopeCommand, response };
