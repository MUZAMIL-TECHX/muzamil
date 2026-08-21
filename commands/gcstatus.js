const {
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');
const crypto = require('crypto');

function unwrapMessage(message) {
    let current = message;
    while (current?.ephemeralMessage?.message) current = current.ephemeralMessage.message;
    while (current?.viewOnceMessage?.message) current = current.viewOnceMessage.message;
    while (current?.viewOnceMessageV2?.message) current = current.viewOnceMessageV2.message;
    while (current?.viewOnceMessageV2Extension?.message) current = current.viewOnceMessageV2Extension.message;
    return current || {};
}

function quotedMessageOf(message) {
    return unwrapMessage(message?.message?.extendedTextMessage?.contextInfo?.quotedMessage);
}

async function downloadMedia(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

function ownerJid(sock) {
    const configured = String(sock?.ownerNumber || '').replace(/[^\d]/g, '');
    const connected = String(sock?.user?.id || '').split(':')[0].replace(/[^\d]/g, '');
    const number = configured || connected;
    return number ? `${number}@s.whatsapp.net` : null;
}

async function gcstatusCommand(sock, chatId, message) {
    if (!chatId?.endsWith('@g.us')) {
        await sock.sendMessage(chatId, {
            text: '❌ This command can only be used in a group.'
        }, { quoted: message });
        return;
    }

    const quoted = quotedMessageOf(message);
    const media = quoted.imageMessage || quoted.videoMessage || quoted.audioMessage || quoted.documentMessage;
    const quotedText = quoted.conversation ||
        quoted.extendedTextMessage?.text ||
        quoted.imageMessage?.caption ||
        quoted.videoMessage?.caption ||
        '';

    if (!media && !quotedText) {
        await sock.sendMessage(chatId, {
            text: '❌ Reply to an image, video, audio, document, or text with .gcstatus.'
        }, { quoted: message });
        return;
    }

    let statusContent;
    if (quoted.imageMessage) {
        statusContent = {
            image: await downloadMedia(quoted.imageMessage, 'image'),
            caption: quoted.imageMessage.caption || undefined
        };
    } else if (quoted.videoMessage) {
        statusContent = {
            video: await downloadMedia(quoted.videoMessage, 'video'),
            caption: quoted.videoMessage.caption || undefined,
            mimetype: quoted.videoMessage.mimetype || 'video/mp4'
        };
    } else if (quoted.audioMessage) {
        statusContent = {
            audio: await downloadMedia(quoted.audioMessage, 'audio'),
            mimetype: quoted.audioMessage.mimetype || 'audio/mpeg',
            ptt: Boolean(quoted.audioMessage.ptt)
        };
    } else if (quoted.documentMessage) {
        statusContent = {
            document: await downloadMedia(quoted.documentMessage, 'document'),
            mimetype: quoted.documentMessage.mimetype || 'application/octet-stream',
            fileName: quoted.documentMessage.fileName || 'status-file'
        };
    } else {
        statusContent = { text: quotedText };
    }

    await sendGroupStatus(sock, chatId, statusContent);
    await sock.sendMessage(chatId, { text: '✅ Posted to this group status.' }, { quoted: message });
}

/**
 * WhatsApp group status is a different message type from a regular
 * status@broadcast. The payload must be wrapped as groupStatusMessageV2
 * and relayed to the actual group JID.
 */
async function sendGroupStatus(sock, groupJid, content) {
    if (!groupJid?.endsWith('@g.us')) {
        throw new Error('This command can only be used in a group.');
    }
    if (typeof sock.waUploadToServer !== 'function') {
        throw new Error('WhatsApp media upload is unavailable on this session.');
    }

    const messageSecret = crypto.randomBytes(32);
    const innerMessage = await generateWAMessageContent(content, {
        upload: sock.waUploadToServer
    });

    const wrapped = generateWAMessageFromContent(groupJid, {
        messageContextInfo: { messageSecret },
        groupStatusMessageV2: {
            message: {
                ...innerMessage,
                messageContextInfo: { messageSecret }
            }
        }
    }, {});

    await sock.relayMessage(groupJid, wrapped.message, {
        messageId: wrapped.key.id
    });
}

async function goodCommand(sock, message) {
    const quoted = quotedMessageOf(message);
    const media = quoted.imageMessage || quoted.videoMessage || quoted.audioMessage;
    if (!media || !media.viewOnce) return false;

    const target = ownerJid(sock);
    if (!target) return true;

    if (quoted.imageMessage) {
        await sock.sendMessage(target, {
            image: await downloadMedia(quoted.imageMessage, 'image'),
            caption: quoted.imageMessage.caption || undefined
        });
    } else if (quoted.videoMessage) {
        await sock.sendMessage(target, {
            video: await downloadMedia(quoted.videoMessage, 'video'),
            caption: quoted.videoMessage.caption || undefined,
            mimetype: quoted.videoMessage.mimetype || 'video/mp4'
        });
    } else {
        await sock.sendMessage(target, {
            audio: await downloadMedia(quoted.audioMessage, 'audio'),
            mimetype: quoted.audioMessage.mimetype || 'audio/ogg; codecs=opus',
            ptt: Boolean(quoted.audioMessage.ptt)
        });
    }

    // Deliberately do not reply in the source chat.
    return true;
}

module.exports = { gcstatusCommand, goodCommand };