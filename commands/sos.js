const { readSessionJson, writeSessionJson } = require('../lib/session_data');

function cleanJid(jid) {
    return String(jid || '').split(':')[0];
}

function getData(sock) {
    const data = readSessionJson(sock, 'sos.json', { groups: {} });
    if (!data.groups || typeof data.groups !== 'object') data.groups = {};
    return data;
}

function getMentionedJids(message) {
    return message.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
        message.message?.contextInfo?.mentionedJid || [];
}

async function sosCommand(sock, chatId, message, mode) {
    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: 'This command can only be used in a group.' }, { quoted: message });
    }
    const jids = getMentionedJids(message).map(cleanJid).filter(Boolean);
    if (!jids.length) {
        return sock.sendMessage(chatId, { text: `Mention an admin to ${mode === 'add' ? 'add to' : 'remove from'} the SOS list.` }, { quoted: message });
    }

    const data = getData(sock);
    const current = new Set((data.groups[chatId] || []).map(cleanJid));
    jids.forEach(jid => mode === 'add' ? current.add(jid) : current.delete(jid));
    data.groups[chatId] = [...current];
    writeSessionJson(sock, 'sos.json', data);

    const names = jids.map(jid => `@${jid.split('@')[0]}`).join(', ');
    const text = mode === 'add'
        ? `${names} Has Added In SOS List. They Cannot Perform Actions.`
        : `${names} Has Added In White List Now He/she can Perform Actions`;
    return sock.sendMessage(chatId, { text, mentions: jids }, { quoted: message });
}

function isListed(sock, groupId, author) {
    const data = getData(sock);
    const list = data.groups[groupId] || [];
    return list.some(jid => cleanJid(jid) === cleanJid(author));
}

async function handleSosAction(sock, update) {
    const { id, action, author, participants } = update || {};
    if (!id?.endsWith('@g.us') || !author || !['remove', 'demote'].includes(action)) return false;
    if (!isListed(sock, id, author)) return false;

    const botJid = cleanJid(sock.user?.id);
    if (cleanJid(author) === botJid) return false;
    const target = cleanJid(author);
    await sock.sendMessage(id, {
        text: 'You Are On SOS list You Can Not Take Action !You Have Been Remove !',
        mentions: [author]
    });
    try {
        await sock.groupParticipantsUpdate(id, [target], 'remove');
    } catch (error) {
        console.error('SOS removal failed:', error.message);
    }
    return true;
}

module.exports = { sosCommand, handleSosAction };