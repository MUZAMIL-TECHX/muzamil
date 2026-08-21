const {
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');
const crypto = require('crypto');

// Helper function to add reaction
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
    try {
        const stream = await downloadContentFromMessage(media, type);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('Download media error:', error);
        return null;
    }
}

function ownerJid(sock) {
    try {
        // Try to get from settings
        const settings = require('../settings');
        const configured = String(settings?.ownerNumber || '').replace(/[^\d]/g, '');
        const connected = String(sock?.user?.id || '').split(':')[0].replace(/[^\d]/g, '');
        const number = configured || connected;
        return number ? `${number}@s.whatsapp.net` : null;
    } catch (e) {
        const connected = String(sock?.user?.id || '').split(':')[0].replace(/[^\d]/g, '');
        return connected ? `${connected}@s.whatsapp.net` : null;
    }
}

async function sendGroupStatus(sock, groupJid, content) {
    if (!groupJid?.endsWith('@g.us')) {
        throw new Error('This command can only be used in a group.');
    }

    try {
        // Create the message with proper upload function
        const messageSecret = crypto.randomBytes(32);
        const innerMessage = await generateWAMessageContent(content, {
            upload: async (buffer, type) => {
                // Fallback upload if waUploadToServer is not available
                if (typeof sock.waUploadToServer === 'function') {
                    return sock.waUploadToServer(buffer, type);
                }
                // Alternative upload method
                const { upload } = require('@whiskeysockets/baileys');
                return upload(buffer, type);
            }
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

        return true;
    } catch (error) {
        console.error('Send group status error:', error);
        throw new Error(`Failed to post status: ${error.message}`);
    }
}

async function gcstatusCommand(sock, chatId, message) {
    try {
        await addReaction(sock, message, '📡');

        if (!chatId?.endsWith('@g.us')) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ❌ *GROUP ONLY* 〕━━━┈⊷
┃ ❍ This command can only be used in a group
╰━━━━━━━━━━━━━━━━┈⊷

> By; MUZAMIL-XD`
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
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ❌ *NO REPLY* 〕━━━┈⊷
┃ ❍ Reply to an image, video, audio,
┃ ❍ document, or text with .gcstatus
╰━━━━━━━━━━━━━━━━┈⊷

> By; MUZAMIL-XD`
            }, { quoted: message });
            return;
        }

        let statusContent;
        
        try {
            if (quoted.imageMessage) {
                const buffer = await downloadMedia(quoted.imageMessage, 'image');
                if (!buffer) throw new Error('Failed to download image');
                statusContent = {
                    image: buffer,
                    caption: quoted.imageMessage.caption || undefined
                };
            } else if (quoted.videoMessage) {
                const buffer = await downloadMedia(quoted.videoMessage, 'video');
                if (!buffer) throw new Error('Failed to download video');
                statusContent = {
                    video: buffer,
                    caption: quoted.videoMessage.caption || undefined,
                    mimetype: quoted.videoMessage.mimetype || 'video/mp4'
                };
            } else if (quoted.audioMessage) {
                const buffer = await downloadMedia(quoted.audioMessage, 'audio');
                if (!buffer) throw new Error('Failed to download audio');
                statusContent = {
                    audio: buffer,
                    mimetype: quoted.audioMessage.mimetype || 'audio/mpeg',
                    ptt: Boolean(quoted.audioMessage.ptt)
                };
            } else if (quoted.documentMessage) {
                const buffer = await downloadMedia(quoted.documentMessage, 'document');
                if (!buffer) throw new Error('Failed to download document');
                statusContent = {
                    document: buffer,
                    mimetype: quoted.documentMessage.mimetype || 'application/octet-stream',
                    fileName: quoted.documentMessage.fileName || 'status-file'
                };
            } else {
                statusContent = { text: quotedText };
            }
        } catch (downloadError) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ❌ *DOWNLOAD FAILED* 〕━━━┈⊷
┃ ❍ ${downloadError.message || 'Could not download media'}
┃ ❍ Please try again
╰━━━━━━━━━━━━━━━━┈⊷

> By; MUZAMIL-XD`
            }, { quoted: message });
            return;
        }

        // Send to group status
        try {
            await sendGroupStatus(sock, chatId, statusContent);
            await addReaction(sock, message, '✅');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ✅ *STATUS POSTED* 〕━━━┈⊷
┃ ❍ Posted to group status successfully
╰━━━━━━━━━━━━━━━━┈⊷

> By; MUZAMIL-XD`
            }, { quoted: message });
        } catch (sendError) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ❌ *POST FAILED* 〕━━━┈⊷
┃ ❍ ${sendError.message || 'Could not post to group status'}
┃ ❍ Please try again
╰━━━━━━━━━━━━━━━━┈⊷

> By; MUZAMIL-XD`
            }, { quoted: message });
        }

    } catch (error) {
        console.error('GCStatus error:', error);
        await addReaction(sock, message, '❌');
        await sock.sendMessage(chatId, {
            text: `
╭━━━〔 ❌ *ERROR* 〕━━━┈⊷
┃ ❍ ${error.message || 'Something went wrong'}
┃ ❍ Please try again later
╰━━━━━━━━━━━━━━━━┈⊷

> By; MUZAMIL-XD`
        }, { quoted: message });
    }
}

// View Once handler
async function goodCommand(sock, message) {
    try {
        const quoted = quotedMessageOf(message);
        const media = quoted.imageMessage || quoted.videoMessage || quoted.audioMessage;
        if (!media || !media.viewOnce) return false;

        const target = ownerJid(sock);
        if (!target) return true;

        if (quoted.imageMessage) {
            const buffer = await downloadMedia(quoted.imageMessage, 'image');
            if (buffer) {
                await sock.sendMessage(target, {
                    image: buffer,
                    caption: quoted.imageMessage.caption || undefined
                });
            }
        } else if (quoted.videoMessage) {
            const buffer = await downloadMedia(quoted.videoMessage, 'video');
            if (buffer) {
                await sock.sendMessage(target, {
                    video: buffer,
                    caption: quoted.videoMessage.caption || undefined,
                    mimetype: quoted.videoMessage.mimetype || 'video/mp4'
                });
            }
        } else if (quoted.audioMessage) {
            const buffer = await downloadMedia(quoted.audioMessage, 'audio');
            if (buffer) {
                await sock.sendMessage(target, {
                    audio: buffer,
                    mimetype: quoted.audioMessage.mimetype || 'audio/ogg; codecs=opus',
                    ptt: Boolean(quoted.audioMessage.ptt)
                });
            }
        }

        return true;
    } catch (error) {
        console.error('Good command error:', error);
        return false;
    }
}

module.exports = { gcstatusCommand, goodCommand };
