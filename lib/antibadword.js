const axios = require('axios');
const { setAntiBadword, getAntiBadword, removeAntiBadword, incrementWarningCount, resetWarningCount } = require('./index');
const { readSessionJson } = require('./session_data');
const aiConfig = require('./ai_config');

function load(sock, groupId) { return readSessionJson(sock, 'userGroupData.json', { antibadword: {} }).antibadword?.[groupId] || {}; }
async function handleAntiBadwordCommand(sock, chatId, message, match) {
  const value = String(match || '').trim().toLowerCase();
  if (!value) return sock.sendMessage(chatId, { text: '*ANTIBADWORD SETUP*\n\n.antibadword on\n.antibadword set delete/kick/warn\n.antibadword off' }, { quoted: message });
  if (value === 'on') { await setAntiBadword(chatId, 'on', 'delete', sock); return sock.sendMessage(chatId, { text: '✅ Anti-badword enabled. Default action: delete.' }, { quoted: message }); }
  if (value === 'off') { await removeAntiBadword(chatId, 'on', sock); return sock.sendMessage(chatId, { text: '✅ Anti-badword disabled.' }, { quoted: message }); }
  const matchSet = value.match(/^set\s+(delete|kick|warn)$/);
  if (matchSet) { await setAntiBadword(chatId, 'on', matchSet[1], sock); return sock.sendMessage(chatId, { text: `✅ Anti-badword action set to ${matchSet[1]}.` }, { quoted: message }); }
  return sock.sendMessage(chatId, { text: '❌ Invalid option. Use on, off, or set delete/kick/warn.' }, { quoted: message });
}

const fallbackWords = ['bc'];
function obviousBadWord(text) {
  const clean = String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return fallbackWords.some(word => new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'i').test(clean));
}
function apiUrl(text) {
  const url = new URL(aiConfig.baseUrl);
  url.searchParams.set('prompt', `Analyze only this message for abusive, sexual, hateful, or profane language. Reply with exactly YES or NO. Message: ${text}`);
  url.searchParams.set('apikey', aiConfig.apiKey); return url.toString();
}
async function aiDetect(text) {
  const result = await axios.get(apiUrl(text), { timeout: 12000 });
  const body = result.data;
  const answer = String(body?.result || body?.response || body?.answer || body?.text || body?.data || '').trim().toLowerCase();
  return /^(yes|true|1|bad|contains)/.test(answer);
}
async function handleBadwordDetection(sock, chatId, message, userMessage, senderId) {
  if (!chatId.endsWith('@g.us') || message.key.fromMe) return;
  const cfg = load(sock, chatId); if (!cfg.enabled) return;
  let detected = false;
  try { detected = await aiDetect(userMessage); } catch (error) { console.error('badword AI check failed:', error.message); detected = obviousBadWord(userMessage); }
  if (!detected) return;
  let metadata; try { metadata = await sock.groupMetadata(chatId); } catch { return; }
  const botId = `${sock.user?.id || ''}`.split(':')[0].split('@')[0];
  const bot = metadata.participants.find(p => [p.id, p.phoneNumber, p.lid].some(v => String(v || '').split(':')[0].split('@')[0] === botId));
  if (!bot?.admin) return;
  const participant = metadata.participants.find(p => [p.id, p.phoneNumber, p.lid].some(v => String(v || '').split(':')[0].split('@')[0] === senderId.split(':')[0].split('@')[0]));
  if (participant?.admin) return;
  try { await sock.sendMessage(chatId, { delete: message.key }); } catch (error) { console.error('badword delete failed:', error.message); }
  const mention = `@${senderId.split('@')[0]}`;
  if (cfg.action === 'kick') {
    try { await sock.groupParticipantsUpdate(chatId, [senderId], 'remove'); } catch (error) { console.error('kick failed:', error.message); }
    return sock.sendMessage(chatId, { text: `𝗕𝗮𝗱 𝗪𝗼𝗿𝗱 𝗗𝗲𝘁𝗲𝗰𝘁𝗲𝗱 ⚠️\n${mention} 𝗬𝗼𝘂 𝗛𝗮𝘃𝗲 𝗕𝗲𝗲𝗻 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 ✅\n> 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 : 𝗠𝘂𝘇𝗮𝗺𝗶𝗹-𝗫𝗗`, mentions: [senderId] });
  }
  if (cfg.action === 'warn') {
    const count = await incrementWarningCount(chatId, senderId, sock);
    if (count >= 3) {
      try { await sock.groupParticipantsUpdate(chatId, [senderId], 'remove'); } catch (error) { console.error('warning kick failed:', error.message); }
      await resetWarningCount(chatId, senderId, sock);
      return sock.sendMessage(chatId, { text: `𝗕𝗮𝗱 𝗪𝗼𝗿𝗱 𝗗𝗲𝘁𝗲𝗰𝘁𝗲𝗱 ⚠️\n${mention} 𝗬𝗼𝘂 𝗛𝗮𝘃𝗲 𝗕𝗲𝗲𝗻 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 ✅\n𝗪𝗮𝗿𝗻𝗶𝗻𝗴 3/3 ❗\n> 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 : 𝗠𝘂𝘇𝗮𝗺𝗶𝗹-𝗫𝗗`, mentions: [senderId] });
    }
    return sock.sendMessage(chatId, { text: `𝗕𝗮𝗱 𝗪𝗼𝗿𝗱 𝗗𝗲𝗹𝗲𝘁𝗲𝗱 ⚠️\n${mention} 𝗪𝗮𝗿𝗻𝗶𝗻𝗴 ${count}/3 𝗗𝗼𝗻𝘁 𝗦𝗲𝗻𝗱 𝗔𝗴𝗮𝗶𝗻 𝗢𝘁𝗵𝗲𝗿𝘄𝗶𝘀𝗲 𝗬𝗼𝘂 𝗪𝗶𝗹𝗹 𝗕𝗲 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 ❗\n> 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 : 𝗠𝘂𝘇𝗮𝗺𝗶𝗹-𝗫𝗗`, mentions: [senderId] });
  }
  return sock.sendMessage(chatId, { text: `𝗕𝗮𝗱 𝗪𝗼𝗿𝗱 𝗗𝗲𝗹𝗲𝘁𝗲𝗱 ⚠️\n${mention} 𝗗𝗼𝗻𝘁 𝗦𝗲𝗻𝗱 𝗔𝗴𝗮𝗶𝗻 ❗\n> 𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 : 𝗠𝘂𝘇𝗮𝗺𝗶𝗹-𝗫𝗗`, mentions: [senderId] });
}
module.exports = { handleAntiBadwordCommand, handleBadwordDetection };
