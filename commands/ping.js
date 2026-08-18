const settings = require('../settings.js');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

async function addReaction(sock, message, emoji) {
    try {
        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        });
    } catch (error) {}
}

async function pingCommand(sock, chatId, message) {
    try {
        await addReaction(sock, message, '🏓');

        const start = Date.now();
        const pingMsg = await sock.sendMessage(chatId, { 
            text: '🏓 *Pinging...*' 
        }, { quoted: message });
        
        const end = Date.now();
        const ping = Math.round((end - start) / 2);
        const uptimeFormatted = formatTime(process.uptime());

        // SIRF 3 LINES
        const botInfo = `
┏━━━━━━━━━━━━━━━━━━━┓
┃ 🏓 𝗣𝗶𝗻𝗴   : ${ping} ms
┃ ⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲 : ${uptimeFormatted}
┃ 🔖 𝗩𝗲𝗿    : v${settings.version}
┗━━━━━━━━━━━━━━━━━━━┛
     𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗠𝗨𝗭𝗔𝗠𝗜𝗟-𝗫𝗗`;

        try {
            await sock.sendMessage(chatId, {
                delete: { 
                    remoteJid: chatId, 
                    fromMe: true, 
                    id: pingMsg.key.id 
                }
            });
        } catch (e) {}

        await sock.sendMessage(chatId, { 
            text: botInfo 
        }, { quoted: message });

        await addReaction(sock, message, '✅');

    } catch (error) {
        await addReaction(sock, message, '❌');
        await sock.sendMessage(chatId, { 
            text: `❌ Error: ${error.message || 'Unknown'}` 
        }, { quoted: message });
    }
}

module.exports = pingCommand;
