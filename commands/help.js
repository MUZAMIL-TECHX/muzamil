const settings = require('../settings');

async function helpCommand(sock, chatId, message) {
    const helpMessage = `
╭━━━〔 👤 *${settings.botName || 'MUZAMIL-XD'}* 〕━━━┈⊷
┃ ❍ Version  : ${settings.version || '3.0.0'}
┃ ❍ Owner    : ${settings.botOwner || 'Muzamil Khan'}
┃ ❍ YouTube  : ${global.ytch || 'MUZAMIL-XD'}
┃ ❍ Commands : All available commands
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🌐 *GENERAL MENU* 〕━━━┈⊷
┃ ❍ .help / .menu
┃ ❍ .ping
┃ ❍ .alive
┃ ❍ .tts [text]
┃ ❍ .owner
┃ ❍ .joke
┃ ❍ .quote
┃ ❍ .fact
┃ ❍ .weather [city]
┃ ❍ .news
┃ ❍ .attp [text]
┃ ❍ .lyrics [song]
┃ ❍ .8ball [question]
┃ ❍ .groupinfo
┃ ❍ .staff / .admins
┃ ❍ .vv
┃ ❍ .trt [text] [lang]
┃ ❍ .ss [link]
┃ ❍ .jid
┃ ❍ .url
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 👮 *ADMIN MENU* 〕━━━┈⊷
┃ ❍ .ban @user
┃ ❍ .promote @user
┃ ❍ .demote @user
┃ ❍ .mute [minutes]
┃ ❍ .unmute
┃ ❍ .delete / .del
┃ ❍ .kick @user
┃ ❍ .warnings @user
┃ ❍ .warn @user
┃ ❍ .antilink
┃ ❍ .antibadword
┃ ❍ .clear
┃ ❍ .tag [message]
┃ ❍ .tagall
┃ ❍ .tagnotadmin
┃ ❍ .hidetag [message]
┃ ❍ .chatbot
┃ ❍ .resetlink
┃ ❍ .antitag [on/off]
┃ ❍ .welcome [on/off]
┃ ❍ .goodbye [on/off]
┃ ❍ .setgdesc [description]
┃ ❍ .setgname [name]
┃ ❍ .setgpp [reply image]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🔒 *OWNER MENU* 〕━━━┈⊷
┃ ❍ .mode [public/private]
┃ ❍ .clearsession
┃ ❍ .antidelete
┃ ❍ .cleartmp
┃ ❍ .update
┃ ❍ .settings
┃ ❍ .setpp [reply image]
┃ ❍ .autoreact [on/off]
┃ ❍ .autostatus [on/off]
┃ ❍ .autostatus react [on/off]
┃ ❍ .autotyping [on/off]
┃ ❍ .autoread [on/off]
┃ ❍ .anticall [on/off]
┃ ❍ .pmblocker [on/off/status]
┃ ❍ .pmblocker setmsg [text]
┃ ❍ .setmention [reply msg]
┃ ❍ .mention [on/off]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎨 *STICKER MENU* 〕━━━┈⊷
┃ ❍ .blur [image]
┃ ❍ .simage [reply sticker]
┃ ❍ .sticker [reply image]
┃ ❍ .removebg
┃ ❍ .remini
┃ ❍ .crop [reply image]
┃ ❍ .tgsticker [link]
┃ ❍ .meme
┃ ❍ .take [packname]
┃ ❍ .emojimix [emj1+emj2]
┃ ❍ .igs [insta link]
┃ ❍ .igsc [insta link]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🖼️ *PIES MENU* 〕━━━┈⊷
┃ ❍ .pies [country]
┃ ❍ .china
┃ ❍ .indonesia
┃ ❍ .japan
┃ ❍ .korea
┃ ❍ .hijab
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎮 *GAME MENU* 〕━━━┈⊷
┃ ❍ .tictactoe @user
┃ ❍ .hangman
┃ ❍ .guess [letter]
┃ ❍ .trivia
┃ ❍ .answer [answer]
┃ ❍ .truth
┃ ❍ .dare
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🤖 *AI MENU* 〕━━━┈⊷
┃ ❍ .gpt [question]
┃ ❍ .gemini [question]
┃ ❍ .imagine [prompt]
┃ ❍ .flux [prompt]
┃ ❍ .sora [prompt]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🎯 *FUN MENU* 〕━━━┈⊷
┃ ❍ .compliment @user
┃ ❍ .insult @user
┃ ❍ .flirt
┃ ❍ .shayari
┃ ❍ .goodnight
┃ ❍ .roseday
┃ ❍ .character @user
┃ ❍ .wasted @user
┃ ❍ .ship @user
┃ ❍ .simp @user
┃ ❍ .stupid @user [text]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🔤 *TEXTMAKER MENU* 〕━━━┈⊷
┃ ❍ .metallic [text]
┃ ❍ .ice [text]
┃ ❍ .snow [text]
┃ ❍ .impressive [text]
┃ ❍ .matrix [text]
┃ ❍ .light [text]
┃ ❍ .neon [text]
┃ ❍ .devil [text]
┃ ❍ .purple [text]
┃ ❍ .thunder [text]
┃ ❍ .leaves [text]
┃ ❍ .1917 [text]
┃ ❍ .arena [text]
┃ ❍ .hacker [text]
┃ ❍ .sand [text]
┃ ❍ .blackpink [text]
┃ ❍ .glitch [text]
┃ ❍ .fire [text]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 📥 *DOWNLOADER MENU* 〕━━━┈⊷
┃ ❍ .play [song]
┃ ❍ .song [song]
┃ ❍ .spotify [query]
┃ ❍ .instagram [link]
┃ ❍ .facebook [link]
┃ ❍ .tiktok [link]
┃ ❍ .video [name]
┃ ❍ .ytmp4 [link]
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🧩 *MISC MENU* 〕━━━┈⊷
┃ ❍ .heart
┃ ❍ .horny
┃ ❍ .circle
┃ ❍ .lgbt
┃ ❍ .lolice
┃ ❍ .its-so-stupid
┃ ❍ .namecard
┃ ❍ .oogway
┃ ❍ .tweet
┃ ❍ .ytcomment
┃ ❍ .comrade
┃ ❍ .gay
┃ ❍ .glass
┃ ❍ .jail
┃ ❍ .passed
┃ ❍ .triggered
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 🖼️ *ANIME MENU* 〕━━━┈⊷
┃ ❍ .nom
┃ ❍ .poke
┃ ❍ .cry
┃ ❍ .kiss
┃ ❍ .pat
┃ ❍ .hug
┃ ❍ .wink
┃ ❍ .facepalm
╰━━━━━━━━━━━━━━━━┈⊷

╭━━━〔 💻 *GITHUB MENU* 〕━━━┈⊷
┃ ❍ .git
┃ ❍ .github
┃ ❍ .sc
┃ ❍ .script
┃ ❍ .repo
╰━━━━━━━━━━━━━━━━┈⊷

> 𝐂𝐑𝐄𝐀𝐓𝐄𝐑: ${settings.botOwner || 'MUZAMIL-XD'}`;

    try {
        const imageUrl = typeof global.botImageUrl === 'string'
            ? global.botImageUrl.trim()
            : '';

        if (imageUrl) {
            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363426106687970@newsletter',
                        newsletterName: 'MUZAMIL-XD',
                        serverMessageId: -1
                    }
                }
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { 
                text: helpMessage,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363426106687970@newsletter',
                        newsletterName: 'MUZAMIL-XD',
                        serverMessageId: -1
                    } 
                }
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error sending help menu:', error);
        await sock.sendMessage(chatId, { text: helpMessage }, { quoted: message });
    }
}

module.exports = helpCommand;