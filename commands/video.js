const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

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

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

// EliteProTech API - Primary
async function getEliteProTechVideoByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return {
            download: res.data.downloadURL,
            title: res.data.title
        };
    }
    throw new Error('EliteProTech ytdown returned no download');
}

async function getYupraVideoByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
        return {
            download: res.data.data.download_url,
            title: res.data.data.title,
            thumbnail: res.data.data.thumbnail
        };
    }
    throw new Error('Yupra returned no download');
}

async function getOkatsuVideoByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.mp4) {
        return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu ytmp4 returned no mp4');
}

async function videoCommand(sock, chatId, message) {
    try {
        // 🔄 Processing reaction
        await addReaction(sock, message, '🔄');

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, { 
                text: `🎬 *Video Downloader*\n\n` +
                      `Usage:\n` +
                      `.video [song name / link]\n\n` +
                      `Example:\n` +
                      `.video Atif Aslam songs\n` +
                      `.video https://youtu.be/xxxxx`
            }, { quoted: message });
            return;
        }

        // Determine if input is a YouTube link
        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            // Search YouTube for the video
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await addReaction(sock, message, '❌');
                await sock.sendMessage(chatId, { 
                    text: `❌ *No Videos Found*\n\n` +
                          `No results found for: *${searchQuery}*`
                }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        // Send thumbnail with styled message
        try {
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : undefined);
            const captionTitle = videoTitle || searchQuery;
            
            if (thumb) {
                const styledCaption = `
╔══════════════════════════════╗
║        🎬 𝗩𝗶𝗱𝗲𝗼 𝗙𝗼𝘂𝗻𝗱
╠══════════════════════════════╣
║ 📌 𝗧𝗶𝘁𝗹𝗲 : ${captionTitle.substring(0, 30)}${captionTitle.length > 30 ? '...' : ''}
║ ⏳ 𝗦𝘁𝗮𝘁𝘂𝘀 : Downloading...
╚══════════════════════════════╝
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗠𝗨𝗭𝗔𝗠𝗜𝗟-𝗫𝗗`;

                await sock.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: styledCaption
                }, { quoted: message });
            }
        } catch (e) { 
            console.error('[VIDEO] thumb error:', e?.message || e); 
        }

        // Validate YouTube URL
        let urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urls) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, { 
                text: `❌ *Invalid Link*\n\n` +
                      `This is not a valid YouTube link.`
            }, { quoted: message });
            return;
        }

        // Try multiple APIs
        let videoData;
        let downloadSuccess = false;
        
        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechVideoByUrl(videoUrl) },
            { name: 'Yupra', method: () => getYupraVideoByUrl(videoUrl) },
            { name: 'Okatsu', method: () => getOkatsuVideoByUrl(videoUrl) }
        ];
        
        for (const apiMethod of apiMethods) {
            try {
                videoData = await apiMethod.method();
                const videoUrl_check = videoData.download || videoData.dl || videoData.url;
                
                if (!videoUrl_check) {
                    console.log(`${apiMethod.name} returned no download URL, trying next API...`);
                    continue;
                }
                
                downloadSuccess = true;
                break;
            } catch (apiErr) {
                console.log(`${apiMethod.name} API failed:`, apiErr.message);
                continue;
            }
        }
        
        if (!downloadSuccess || !videoData) {
            await addReaction(sock, message, '❌');
            throw new Error('All download sources failed.');
        }

        // Send video
        await sock.sendMessage(chatId, {
            video: { url: videoData.download || videoData.dl || videoData.url },
            mimetype: 'video/mp4',
            fileName: `${(videoData.title || videoTitle || 'video').replace(/[^\w\s-]/g, '')}.mp4`,
            caption: `
╔══════════════════════════════╗
║        🎬 𝗩𝗶𝗱𝗲𝗼 𝗥𝗲𝗮𝗱𝘆!
╠══════════════════════════════╣
║ 📌 ${(videoData.title || videoTitle || 'Video').substring(0, 35)}${(videoData.title || videoTitle || 'Video').length > 35 ? '...' : ''}
║ ✅ 𝗦𝘁𝗮𝘁𝘂𝘀 : Downloaded
╚══════════════════════════════╝
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗠𝗨𝗭𝗔𝗠𝗜𝗟-𝗫𝗗`
        }, { quoted: message });

        // ✅ Done reaction
        await addReaction(sock, message, '✅');

    } catch (error) {
        console.error('[VIDEO] Command Error:', error?.message || error);
        await addReaction(sock, message, '❌');
        
        let errorMessage = `❌ *Failed to download video.*\n\n`;
        if (error.message && error.message.includes('blocked')) {
            errorMessage += `🔴 Content may be unavailable in your region.`;
        } else if (error.response?.status === 451 || error.status === 451) {
            errorMessage += `🔴 Content unavailable (451). Legal restrictions.`;
        } else if (error.message && error.message.includes('All download sources failed')) {
            errorMessage += `🔴 All download sources failed. Try again later.`;
        } else {
            errorMessage += `🔴 ${error.message || 'Unknown error'}`;
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMessage
        }, { quoted: message });
    }
}

module.exports = videoCommand;
