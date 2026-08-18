const axios = require('axios');
const yts = require('yt-search');

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

// Store active searches for reply handling
const activeSearches = new Map();

// API Functions
async function getArslanVideo(youtubeUrl) {
    const api = `https://arslan-apis-v2.vercel.app/download/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(api, { timeout: 60000 });
    if (res?.data?.status && res?.data?.result?.download?.url) {
        return {
            download: res.data.result.download.url,
            title: res.data.result.metadata?.title || 'Video'
        };
    }
    throw new Error('Arslan API failed');
}

async function getEliteProTechVideo(youtubeUrl) {
    const api = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4`;
    const res = await axios.get(api, {
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    if (res?.data?.success && res?.data?.downloadURL) {
        return {
            download: res.data.downloadURL,
            title: res.data.title || 'Video'
        };
    }
    throw new Error('EliteProTech API failed');
}

async function getYupraVideo(youtubeUrl) {
    const api = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await axios.get(api, {
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    if (res?.data?.success && res?.data?.data?.download_url) {
        return {
            download: res.data.data.download_url,
            title: res.data.data.title || 'Video'
        };
    }
    throw new Error('Yupra API failed');
}

async function tryDownloadApis(youtubeUrl) {
    const apis = [
        { name: 'Arslan', fn: () => getArslanVideo(youtubeUrl) },
        { name: 'EliteProTech', fn: () => getEliteProTechVideo(youtubeUrl) },
        { name: 'Yupra', fn: () => getYupraVideo(youtubeUrl) }
    ];

    for (const api of apis) {
        try {
            const data = await api.fn();
            if (data && data.download) {
                console.log(`✅ ${api.name} API success`);
                return data;
            }
        } catch (err) {
            console.log(`❌ ${api.name} API failed:`, err.message);
        }
    }
    return null;
}

// Main YTS Command
async function ytsCommand(sock, chatId, message) {
    try {
        await addReaction(sock, message, '🔍');

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 🔍 *YTS SEARCH* 〕━━━┈⊷
┃ ❍ Usage : .yts [song/name]
┃ ❍ Example : .yts Atif Aslam
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            return;
        }

        // Search YouTube
        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ❌ *NO RESULTS* 〕━━━┈⊷
┃ ❍ No videos found for: ${searchQuery}
┃ ❍ Try different keywords
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            return;
        }

        // Get top 5 videos
        const topVideos = videos.slice(0, 5);
        
        // Store search results with unique ID
        const searchId = message.key.id;
        activeSearches.set(searchId, {
            videos: topVideos,
            chatId: chatId,
            sender: message.key.participant || message.key.remoteJid,
            timestamp: Date.now()
        });

        // Clean up old searches after 5 minutes
        setTimeout(() => {
            activeSearches.delete(searchId);
        }, 5 * 60 * 1000);

        // Build result message
        let resultText = `
╭━━━〔 🔍 *SEARCH RESULTS* 〕━━━┈⊷
┃ ❍ Query : ${searchQuery}
┃ ❍ Found : ${topVideos.length} videos
╰━━━━━━━━━━━━━━━━┈⊷

`;

        topVideos.forEach((video, index) => {
            const num = index + 1;
            const title = video.title || 'Unknown';
            const duration = video.timestamp || 'Unknown';
            const url = video.url || '#';
            
            resultText += `
╭━━━〔 🎬 *${num}* 〕━━━┈⊷
┃ ❍ Title : ${title.substring(0, 40)}${title.length > 40 ? '...' : ''}
┃ ❍ Duration : ${duration}
┃ ❍ Link : ${url}
╰━━━━━━━━━━━━━━━━┈⊷
`;
        });

        resultText += `

╭━━━〔 💡 *HOW TO DOWNLOAD* 〕━━━┈⊷
┃ ❍ Reply with number 1 to 5
┃ ❍ To download the video
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`;

        await sock.sendMessage(chatId, {
            text: resultText
        }, { quoted: message });

        await addReaction(sock, message, '✅');

    } catch (error) {
        console.error('YTS command error:', error);
        await addReaction(sock, message, '❌');
        await sock.sendMessage(chatId, {
            text: `
╭━━━〔 ❌ *ERROR* 〕━━━┈⊷
┃ ❍ ${error.message || 'Something went wrong'}
┃ ❍ Please try again later
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
        }, { quoted: message });
    }
}

// Process reply messages (called from main.js)
async function processYtsReply(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Check if it's a reply to a message
        if (!quotedMessage || !text) return false;

        // Get the quoted message ID
        const quotedMsgId = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
        if (!quotedMsgId) return false;

        // Check if this is a YTS search result
        if (!activeSearches.has(quotedMsgId)) return false;

        // Check if reply is a number 1-5
        const num = parseInt(text.trim());
        if (isNaN(num) || num < 1 || num > 5) return false;

        const searchData = activeSearches.get(quotedMsgId);
        if (!searchData || !searchData.videos || searchData.videos.length === 0) {
            activeSearches.delete(quotedMsgId);
            return false;
        }

        // Check if the reply is from the same user who requested the search
        const sender = message.key.participant || message.key.remoteJid;
        if (sender !== searchData.sender) {
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ⛔ *NOT YOUR SEARCH* 〕━━━┈⊷
┃ ❍ This search was requested by someone else
┃ ❍ Please use .yts to search yourself
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            return true;
        }

        const videos = searchData.videos;
        if (num > videos.length) {
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ❌ *INVALID NUMBER* 〕━━━┈⊷
┃ ❍ Only ${videos.length} videos available
┃ ❍ Reply with number 1 to ${videos.length}
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            return true;
        }

        const selectedVideo = videos[num - 1];
        const videoUrl = selectedVideo.url;
        const videoTitle = selectedVideo.title || 'Video';

        await addReaction(sock, message, '📥');

        // Send download status
        await sock.sendMessage(chatId, {
            text: `
╭━━━〔 📥 *DOWNLOADING* 〕━━━┈⊷
┃ ❍ Video : ${videoTitle.substring(0, 30)}${videoTitle.length > 30 ? '...' : ''}
┃ ❍ Status : Processing...
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
        }, { quoted: message });

        // Try to download the video
        const videoData = await tryDownloadApis(videoUrl);

        if (!videoData || !videoData.download) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, {
                text: `
╭━━━〔 ❌ *DOWNLOAD FAILED* 〕━━━┈⊷
┃ ❍ All sources failed
┃ ❍ Try again later
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            
            activeSearches.delete(quotedMsgId);
            return true;
        }

        // Send the video
        await sock.sendMessage(chatId, {
            video: { url: videoData.download },
            mimetype: 'video/mp4',
            fileName: `${videoTitle.replace(/[^\w\s-]/g, '')}.mp4`,
            caption: `
╭━━━〔 ✅ *VIDEO READY* 〕━━━┈⊷
┃ ❍ Title : ${videoTitle.substring(0, 30)}${videoTitle.length > 30 ? '...' : ''}
┃ ❍ Status : Downloaded ✅
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
        }, { quoted: message });

        await addReaction(sock, message, '✅');

        activeSearches.delete(quotedMsgId);
        return true;

    } catch (error) {
        console.error('YTS reply processor error:', error);
        await addReaction(sock, message, '❌');
        return false;
    }
}

module.exports = {
    ytsCommand,
    processYtsReply
};
