const fs = require('fs');
const path = require('path');

const AUTOFOLLOW_OWNER = '923433740855';
const AUTOFOLLOW_FILE = path.join(__dirname, '..', 'data', 'autofollow.json');

function ensureFile() {
    const dataDir = path.dirname(AUTOFOLLOW_FILE);
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(AUTOFOLLOW_FILE)) {
        fs.writeFileSync(AUTOFOLLOW_FILE, '[]');
    }
}

function readChannels() {
    ensureFile();
    try {
        const value = JSON.parse(fs.readFileSync(AUTOFOLLOW_FILE, 'utf8'));
        return Array.isArray(value) ? value : [];
    } catch (_) {
        return [];
    }
}

function writeChannels(channels) {
    ensureFile();
    const temporary = `${AUTOFOLLOW_FILE}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(channels, null, 2));
    fs.renameSync(temporary, AUTOFOLLOW_FILE);
}

function cleanSenderNumber(senderId) {
    return String(senderId || '').split(':')[0].split('@')[0].replace(/\D/g, '');
}

function isAuthorized(senderId, message) {
    // WhatsApp can expose the account's own messages with an @lid sender
    // instead of the phone number. `fromMe` is safe here because it can only
    // be produced by this linked bot account.
    return Boolean(message?.key?.fromMe) || cleanSenderNumber(senderId) === AUTOFOLLOW_OWNER;
}

function extractInviteCode(value) {
    const input = String(value || '').trim();
    const match = input.match(/^https?:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]+)(?:[/?#].*)?$/i);
    return match ? match[1] : null;
}

async function addAutofollowCommand(sock, chatId, message, rawArgument, senderId) {
    if (!isAuthorized(senderId, message)) {
        await sock.sendMessage(chatId, {
            text: 'U R not Muzamil 😤',
        }, { quoted: message });
        return;
    }

    const channelLink = String(rawArgument || '').trim();
    const inviteCode = extractInviteCode(channelLink);
    if (!inviteCode) {
        await sock.sendMessage(chatId, {
            text: 'Usage: .addautofollow https://whatsapp.com/channel/XXXXXXXX',
        }, { quoted: message });
        return;
    }

    if (typeof sock.newsletterMetadata !== 'function' || typeof sock.newsletterFollow !== 'function') {
        await sock.sendMessage(chatId, {
            text: '❌ This Baileys version does not support WhatsApp Channel following.',
        }, { quoted: message });
        return;
    }

    try {
        const metadata = await sock.newsletterMetadata('invite', inviteCode);
        const newsletterJid = metadata?.id || metadata?.jid;
        if (!newsletterJid || !newsletterJid.endsWith('@newsletter')) {
            throw new Error('Could not resolve channel metadata');
        }

        const channels = readChannels();
        const alreadyAdded = channels.some(channel => channel.jid === newsletterJid);
        if (!alreadyAdded) {
            channels.push({
                url: channelLink,
                jid: newsletterJid,
                name: metadata?.name || '',
                addedAt: new Date().toISOString()
            });
            writeChannels(channels);
        }

        // Follow immediately for the current bot, then repeat automatically
        // for every bot session when it connects.
        await sock.newsletterFollow(newsletterJid);
        await sock.sendMessage(chatId, {
            text: alreadyAdded
                ? '✅ Ye channel pehle se autofollow list mein tha; current bot ne follow kar liya.'
                : `✅ Channel autofollow mein add ho gaya.\n\n${channelLink}\n\nAb jo bot connect hoga, ye channel automatically follow karega.`,
        }, { quoted: message });
    } catch (error) {
        console.error('Autofollow add error:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Channel add/follow nahi ho saka. Link check karein aur dobara try karein.',
        }, { quoted: message });
    }
}

async function listAutofollowCommand(sock, chatId, message) {
    const channels = readChannels();
    if (!channels.length) {
        await sock.sendMessage(chatId, {
            text: '📋 Autofollow list empty hai.',
        }, { quoted: message });
        return;
    }

    const lines = channels.map((channel, index) =>
        `${index + 1}. ${channel.url}${channel.name ? `\n   ${channel.name}` : ''}`
    );
    await sock.sendMessage(chatId, {
        text: `📋 *Autofollow Channels (${channels.length})*\n\n${lines.join('\n\n')}`,
    }, { quoted: message });
}

async function followSavedChannels(sock) {
    if (typeof sock.newsletterFollow !== 'function') return;
    const channels = readChannels();
    for (const channel of channels) {
        if (!channel.jid) continue;
        try {
            await sock.newsletterFollow(channel.jid);
            console.log(`✅ Autofollowed channel ${channel.jid} for session ${sock.sessionKey || 'default'}`);
        } catch (error) {
            console.warn(`⚠️ Could not autofollow ${channel.jid}: ${error.message}`);
        }
    }
}

module.exports = {
    addAutofollowCommand,
    listAutofollowCommand,
    followSavedChannels,
};