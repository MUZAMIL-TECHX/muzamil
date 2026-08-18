const fs = require('fs');

function readJsonSafe(path, fallback) {
    try {
        const txt = fs.readFileSync(path, 'utf8');
        return JSON.parse(txt);
    } catch (_) {
        return fallback;
    }
}

const isOwnerOrSudo = require('../lib/isOwner');

async function addReaction(sock, message, emoji) {
    try {
        await sock.sendMessage(message.key.remoteJid, {
            react: {
                text: emoji,
                key: message.key
            }
        });
    } catch (error) {
        console.error('Reaction error:', error);
    }
}

async function settingsCommand(sock, chatId, message) {
    try {
        // ⚙️ Reaction
        await addReaction(sock, message, '⚙️');

        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await addReaction(sock, message, '⛔');
            await sock.sendMessage(chatId, { 
                text: `⛔ *Access Denied*\n\n` +
                      `Only bot owner can use this command!`
            }, { quoted: message });
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        const dataDir = './data';

        const mode = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatus = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: false });
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {}
        });
        const autoReaction = Boolean(userGroupData.autoReaction);

        // Per-group features
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const welcomeOn = groupId ? Boolean(userGroupData.welcome && userGroupData.welcome[groupId]) : false;
        const goodbyeOn = groupId ? Boolean(userGroupData.goodbye && userGroupData.goodbye[groupId]) : false;
        const chatbotOn = groupId ? Boolean(userGroupData.chatbot && userGroupData.chatbot[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;

        // Build settings message
        let settingsMsg = `
╔═══════════════════════════════════════╗
║        ⚙️ 𝗕𝗢𝗧 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦
╠═══════════════════════════════════════╣
║ 👑 𝗢𝘄𝗻𝗲𝗿 : ${message.key.fromMe ? 'Bot Owner' : 'Sudo User'}
╚═══════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃        🌐 𝗚𝗟𝗢𝗕𝗔𝗟 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫`;

        // Mode
        const modeEmoji = mode.isPublic ? '🌍' : '🔒';
        const modeStatus = mode.isPublic ? 'Public' : 'Private';
        settingsMsg += `
┃ ${modeEmoji} 𝗠𝗼𝗱𝗲        : ${modeStatus}`;

        // Auto Status
        const asEmoji = autoStatus.enabled ? '✅' : '❌';
        settingsMsg += `
┃ ${asEmoji} 𝗔𝘂𝘁𝗼 𝗦𝘁𝗮𝘁𝘂𝘀 : ${autoStatus.enabled ? 'ON' : 'OFF'}`;

        // Autoread
        const arEmoji = autoread.enabled ? '✅' : '❌';
        settingsMsg += `
┃ ${arEmoji} 𝗔𝘂𝘁𝗼𝗿𝗲𝗮𝗱   : ${autoread.enabled ? 'ON' : 'OFF'}`;

        // Autotyping
        const atEmoji = autotyping.enabled ? '✅' : '❌';
        settingsMsg += `
┃ ${atEmoji} 𝗔𝘂𝘁𝗼𝘁𝘆𝗽𝗶𝗻𝗴 : ${autotyping.enabled ? 'ON' : 'OFF'}`;

        // PM Blocker
        const pmEmoji = pmblocker.enabled ? '✅' : '❌';
        settingsMsg += `
┃ ${pmEmoji} 𝗣𝗠 𝗕𝗹𝗼𝗰𝗸𝗲𝗿 : ${pmblocker.enabled ? 'ON' : 'OFF'}`;

        // Anticall
        const acEmoji = anticall.enabled ? '✅' : '❌';
        settingsMsg += `
┃ ${acEmoji} 𝗔𝗻𝘁𝗶𝗰𝗮𝗹𝗹   : ${anticall.enabled ? 'ON' : 'OFF'}`;

        // Auto Reaction
        const reEmoji = autoReaction ? '✅' : '❌';
        settingsMsg += `
┃ ${reEmoji} 𝗔𝘂𝘁𝗼 𝗥𝗲𝗮𝗰𝘁 : ${autoReaction ? 'ON' : 'OFF'}`;

        settingsMsg += `
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;

        // Group settings
        if (groupId) {
            settingsMsg += `

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃        👥 𝗚𝗥𝗢𝗨𝗣 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫`;

            // Antilink
            if (antilinkOn) {
                const al = userGroupData.antilink[groupId];
                const actionEmoji = al.action === 'delete' ? '🗑️' : al.action === 'kick' ? '👢' : '⚠️';
                settingsMsg += `
┃ 🔗 𝗔𝗻𝘁𝗶𝗹𝗶𝗻𝗸   : ON (${actionEmoji} ${al.action || 'delete'})`;
            } else {
                settingsMsg += `
┃ 🔗 𝗔𝗻𝘁𝗶𝗹𝗶𝗻𝗸   : ❌ OFF`;
            }

            // Antibadword
            if (antibadwordOn) {
                const ab = userGroupData.antibadword[groupId];
                const actionEmoji = ab.action === 'delete' ? '🗑️' : ab.action === 'kick' ? '👢' : '⚠️';
                settingsMsg += `
┃ 🚫 𝗔𝗻𝘁𝗶𝗯𝗮𝗱𝘄𝗼𝗿𝗱 : ON (${actionEmoji} ${ab.action || 'delete'})`;
            } else {
                settingsMsg += `
┃ 🚫 𝗔𝗻𝘁𝗶𝗯𝗮𝗱𝘄𝗼𝗿𝗱 : ❌ OFF`;
            }

            // Welcome
            const wlEmoji = welcomeOn ? '✅' : '❌';
            settingsMsg += `
┃ 👋 𝗪𝗲𝗹𝗰𝗼𝗺𝗲    : ${wlEmoji} ${welcomeOn ? 'ON' : 'OFF'}`;

            // Goodbye
            const gbEmoji = goodbyeOn ? '✅' : '❌';
            settingsMsg += `
┃ 👋 𝗚𝗼𝗼𝗱𝗯𝘆𝗲    : ${gbEmoji} ${goodbyeOn ? 'ON' : 'OFF'}`;

            // Chatbot
            const cbEmoji = chatbotOn ? '✅' : '❌';
            settingsMsg += `
┃ 🤖 𝗖𝗵𝗮𝘁𝗯𝗼𝘁    : ${cbEmoji} ${chatbotOn ? 'ON' : 'OFF'}`;

            // Antitag
            if (antitagCfg && antitagCfg.enabled) {
                const actionEmoji = antitagCfg.action === 'delete' ? '🗑️' : '👢';
                settingsMsg += `
┃ 🏷️ 𝗔𝗻𝘁𝗶𝘁𝗮𝗴    : ON (${actionEmoji} ${antitagCfg.action || 'delete'})`;
            } else {
                settingsMsg += `
┃ 🏷️ 𝗔𝗻𝘁𝗶𝘁𝗮𝗴    : ❌ OFF`;
            }

            settingsMsg += `
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
        } else {
            settingsMsg += `

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃        💡 𝗜𝗡𝗙𝗢
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ℹ️ Group settings will be shown
┃ when used inside a group.
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
        }

        settingsMsg += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗠𝗨𝗭𝗔𝗠𝗜𝗟-𝗫𝗗`;

        await sock.sendMessage(chatId, { 
            text: settingsMsg
        }, { quoted: message });

        // ✅ Done reaction
        await addReaction(sock, message, '✅');

    } catch (error) {
        console.error('Error in settings command:', error);
        await addReaction(sock, message, '❌');
        await sock.sendMessage(chatId, { 
            text: `❌ *Error*\n\nFailed to read settings.\n\n${error.message || 'Unknown error'}`
        }, { quoted: message });
    }
}

module.exports = settingsCommand;
