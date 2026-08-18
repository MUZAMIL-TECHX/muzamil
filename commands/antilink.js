const { bots } = require('./antilink');
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

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

// Helper function to send styled message
async function sendStyledMessage(sock, chatId, text, message, emoji = '📌') {
    const styledText = `
╔═══════════════════════════════════════╗
║          ${emoji}  𝗔𝗡𝗧𝗜𝗟𝗜𝗡𝗞 𝗠𝗘𝗡𝗨
╚═══════════════════════════════════════╝

${text}

╔═══════════════════════════════════════╗
║     𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗠𝗨𝗭𝗔𝗠𝗜𝗟-𝗫𝗗
╚═══════════════════════════════════════╝`;

    await sock.sendMessage(chatId, { text: styledText }, { quoted: message });
}

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        // Add reaction based on command
        await addReaction(sock, message, '🔗');

        if (!isSenderAdmin) {
            await addReaction(sock, message, '⛔');
            await sendStyledMessage(sock, chatId, 
                `❌ *For Group Admins Only!*\n\n` +
                `⛔ You don't have permission to use this command.`, 
                message, '⛔'
            );
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      📋 𝗨𝗦𝗔𝗚𝗘 𝗚𝗨𝗜𝗗𝗘
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  🔹 ${prefix}antilink on
┃  🔹 ${prefix}antilink off
┃  🔹 ${prefix}antilink set delete
┃  🔹 ${prefix}antilink set kick
┃  🔹 ${prefix}antilink set warn
┃  🔹 ${prefix}antilink get
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📌 *Commands:*
✅ .antilink on - Enable antilink
❌ .antilink off - Disable antilink
⚙️ .antilink set delete - Delete links
⚙️ .antilink set kick - Kick users
⚙️ .antilink set warn - Warn users
📊 .antilink get - Check status`;

            await sendStyledMessage(sock, chatId, usage, message, '🔗');
            return;
        }

        switch (action) {
            case 'on': {
                await addReaction(sock, message, '✅');
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sendStyledMessage(sock, chatId, 
                        `⚠️ *Antilink is already ON*\n\n` +
                        `🔹 Status: Active\n` +
                        `🔹 Action: ${existingConfig.action || 'delete'}\n\n` +
                        `💡 Use ${prefix}antilink off to disable`, 
                        message, '⚠️'
                    );
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                if (result) {
                    await sendStyledMessage(sock, chatId, 
                        `✅ *Antilink has been turned ON*\n\n` +
                        `🔹 Status: Active\n` +
                        `🔹 Action: Delete\n\n` +
                        `🛡️ All links will be deleted automatically`, 
                        message, '✅'
                    );
                } else {
                    await sendStyledMessage(sock, chatId, 
                        `❌ *Failed to turn on Antilink*\n\n` +
                        `⚠️ Please try again later`, 
                        message, '❌'
                    );
                }
                break;
            }

            case 'off': {
                await addReaction(sock, message, '❌');
                await removeAntilink(chatId, 'on');
                await sendStyledMessage(sock, chatId, 
                    `❌ *Antilink has been turned OFF*\n\n` +
                    `🔹 Status: Inactive\n\n` +
                    `💡 Links are now allowed in this group`, 
                    message, '❌'
                );
                break;
            }

            case 'set': {
                await addReaction(sock, message, '⚙️');
                if (args.length < 2) {
                    await sendStyledMessage(sock, chatId, 
                        `⚙️ *Set Action Required*\n\n` +
                        `Please specify an action:\n\n` +
                        `📌 ${prefix}antilink set delete\n` +
                        `📌 ${prefix}antilink set kick\n` +
                        `📌 ${prefix}antilink set warn`, 
                        message, '⚙️'
                    );
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'kick', 'warn'].includes(setAction)) {
                    await sendStyledMessage(sock, chatId, 
                        `❌ *Invalid Action*\n\n` +
                        `Choose one of these:\n\n` +
                        `📌 delete - Delete the link\n` +
                        `📌 kick - Kick the user\n` +
                        `📌 warn - Warn the user`, 
                        message, '❌'
                    );
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                if (setResult) {
                    const actionEmoji = setAction === 'delete' ? '🗑️' : setAction === 'kick' ? '👢' : '⚠️';
                    await sendStyledMessage(sock, chatId, 
                        `✅ *Action Updated*\n\n` +
                        `${actionEmoji} Action: ${setAction.toUpperCase()}\n\n` +
                        `🛡️ Antilink will now ${setAction} offending messages`, 
                        message, '✅'
                    );
                } else {
                    await sendStyledMessage(sock, chatId, 
                        `❌ *Failed to set action*\n\n` +
                        `⚠️ Please try again later`, 
                        message, '❌'
                    );
                }
                break;
            }

            case 'get': {
                await addReaction(sock, message, '📊');
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                
                const statusEmoji = status?.enabled ? '✅' : '❌';
                const actionEmoji = actionConfig?.action === 'delete' ? '🗑️' : 
                                   actionConfig?.action === 'kick' ? '👢' : '⚠️';
                
                await sendStyledMessage(sock, chatId, 
                    `📊 *Antilink Configuration*\n\n` +
                    `${statusEmoji} Status: ${status?.enabled ? 'ON' : 'OFF'}\n` +
                    `${actionEmoji} Action: ${actionConfig?.action ? actionConfig.action.toUpperCase() : 'Not set'}\n\n` +
                    `┏━━━━━━━━━━━━━━━━━━━━━┓\n` +
                    `┃  💡 Use .antilink help\n` +
                    `┃  🔹 for more commands\n` +
                    `┗━━━━━━━━━━━━━━━━━━━━━┛`, 
                    message, '📊'
                );
                break;
            }

            default: {
                await addReaction(sock, message, '❓');
                await sendStyledMessage(sock, chatId, 
                    `❓ *Unknown Command*\n\n` +
                    `Use ${prefix}antilink for usage guide\n\n` +
                    `📌 Available:\n` +
                    `🔹 on/off\n` +
                    `🔹 set delete/kick/warn\n` +
                    `🔹 get`, 
                    message, '❓'
                );
            }
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await addReaction(sock, message, '❌');
        await sendStyledMessage(sock, chatId, 
            `❌ *Error Processing Command*\n\n` +
            `⚠️ Something went wrong. Please try again.`, 
            message, '❌'
        );
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const antilinkSetting = getAntilinkSetting(chatId);
    if (antilinkSetting === 'off') return;

    console.log(`Antilink Setting for ${chatId}: ${antilinkSetting}`);
    console.log(`Checking message for links: ${userMessage}`);
    
    console.log("Full message object: ", JSON.stringify(message, null, 2));

    let shouldDelete = false;

    const linkPatterns = {
        whatsappGroup: /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/i,
        whatsappChannel: /wa\.me\/channel\/[A-Za-z0-9]{20,}/i,
        telegram: /t\.me\/[A-Za-z0-9_]+/i,
        allLinks: /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i,
    };

    if (antilinkSetting === 'whatsappGroup') {
        console.log('WhatsApp group link protection is enabled.');
        if (linkPatterns.whatsappGroup.test(userMessage)) {
            console.log('Detected a WhatsApp group link!');
            shouldDelete = true;
        }
    } else if (antilinkSetting === 'whatsappChannel' && linkPatterns.whatsappChannel.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'telegram' && linkPatterns.telegram.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'allLinks' && linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (shouldDelete) {
        const quotedMessageId = message.key.id;
        const quotedParticipant = message.key.participant || senderId;

        console.log(`Attempting to delete message with id: ${quotedMessageId} from participant: ${quotedParticipant}`);

        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
            });
            console.log(`Message with ID ${quotedMessageId} deleted successfully.`);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }

        const mentionedJidList = [senderId];
        
        // Get antilink action
        const config = await getAntilink(chatId, 'on');
        const action = config?.action || 'delete';

        let warningMessage = '';
        switch(action) {
            case 'delete':
                warningMessage = `⚠️ *Link Detected!*\n\n` +
                                `@${senderId.split('@')[0]} Links are not allowed here!\n` +
                                `🔹 Message has been deleted.`;
                break;
            case 'kick':
                try {
                    await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                    warningMessage = `👢 *User Kicked!*\n\n` +
                                    `@${senderId.split('@')[0]} was kicked for sending links!\n` +
                                    `🔹 Links are not allowed here.`;
                } catch (e) {
                    warningMessage = `⚠️ *Link Detected!*\n\n` +
                                    `@${senderId.split('@')[0]} Links are not allowed here!\n` +
                                    `🔹 Message has been deleted.`;
                }
                break;
            case 'warn':
                warningMessage = `⚠️ *Warning!*\n\n` +
                                `@${senderId.split('@')[0]} Links are not allowed here!\n` +
                                `🔹 Please don't send links again.`;
                break;
            default:
                warningMessage = `⚠️ *Link Detected!*\n\n` +
                                `@${senderId.split('@')[0]} Links are not allowed here!\n` +
                                `🔹 Message has been deleted.`;
        }

        const styledWarning = `
╔═══════════════════════════════════════╗
║          🛡️ 𝗔𝗡𝗧𝗜𝗟𝗜𝗡𝗞 𝗪𝗔𝗥𝗡𝗜𝗡𝗚
╚═══════════════════════════════════════╝

${warningMessage}

╔═══════════════════════════════════════╗
║     𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗠𝗨𝗭𝗔𝗠𝗜𝗟-𝗫𝗗
╚═══════════════════════════════════════╝`;

        await sock.sendMessage(chatId, { 
            text: styledWarning, 
            mentions: mentionedJidList 
        });
    } else {
        console.log('No link detected or protection not enabled for this type of link.');
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
