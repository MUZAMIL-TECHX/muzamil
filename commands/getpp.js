const fs = require('fs');
const path = require('path');
const axios = require('axios');
const isOwnerOrSudo = require('../lib/isOwner');

function quotedContext(message) {
  return message.message?.extendedTextMessage?.contextInfo ||
    message.message?.imageMessage?.contextInfo ||
    message.message?.videoMessage?.contextInfo || {};
}

function targetFromCommand(message, rawText) {
  const ctx = quotedContext(message);
  if (ctx.participant) return ctx.participant;
  const mention = (ctx.mentionedJid || [])[0];
  if (mention) return mention;
  const arg = String(rawText || '').trim().split(/\s+/)[1] || '';
  const digits = arg.replace(/[^0-9]/g, '');
  return digits ? `${digits}@s.whatsapp.net` : null;
}

async function getProfilePicture(sock, chatId, message, rawText) {
  try {
    const sender = message.key.participant || message.key.remoteJid;
    if (!message.key.fromMe && !(await isOwnerOrSudo(sender, sock, chatId))) {
      return sock.sendMessage(chatId, { text: '❌ Only the bot owner can use .getpp.' }, { quoted: message });
    }
    const target = targetFromCommand(message, rawText);
    if (!target) {
      return sock.sendMessage(chatId, { text: '⚠️ Use .getpp 923xxxxxxxxx or reply to a person’s message.' }, { quoted: message });
    }
    const imageUrl = await sock.profilePictureUrl(target, 'image').catch(() => null);
    if (!imageUrl) return sock.sendMessage(chatId, { text: '❌ This person has no accessible profile picture.' }, { quoted: message });

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const dir = path.join(sock.sessionDir || process.cwd(), 'saved-profile-pictures');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${target.split('@')[0]}-${Date.now()}.jpg`);
    fs.writeFileSync(file, response.data);
    const displayName = sock.store?.contacts?.[target]?.name || `@${target.split('@')[0]}`;
    await sock.sendMessage(chatId, {
      image: { url: file },
      caption: `𝗣𝗿𝗼𝗳𝗶𝗹𝗲 𝗣𝗶𝗰𝘁𝘂𝗿𝗲 𝗦𝗮𝘃𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 ✅\n@${target.split('@')[0]}\n> 𝗕𝘆 : 𝗠𝘂𝘇𝗮𝗺𝗶𝗹-𝗫𝗗`,
      mentions: [target]
    }, { quoted: message });
    setTimeout(() => fs.unlink(file, () => {}), 60_000);
  } catch (error) {
    console.error('getpp error:', error.message);
    await sock.sendMessage(chatId, { text: '❌ Profile picture could not be saved.' }, { quoted: message });
  }
}
module.exports = getProfilePicture;
