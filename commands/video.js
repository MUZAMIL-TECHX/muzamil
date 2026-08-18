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
        await addReaction(sock, message, '🔄');

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        if (!searchQuery) {
            await addReaction(sock, message, '❌');
            await sock.sendMessage(chatId, { 
                text: `
╭━━━〔 🎬 *VIDEO DOWNLOADER* 〕━━━┈⊷
┃ ❍ Usage : .video [name/link]
┃ ❍ Example 1 : .video Atif Aslam
┃ ❍ Example 2 : .video https://youtu.be/xxxxx
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            return;
        }

        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await addReaction(sock, message, '❌');
                await sock.sendMessage(chatId, { 
                    text: `
╭━━━〔 ❌ *NO VIDEOS FOUND* 〕━━━┈⊷
┃ ❍ No results for: ${searchQuery}
┃ ❍ Try different keywords
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
                }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        // Send thumbnail
        try {
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : undefined);
            const captionTitle = videoTitle || searchQuery;
            
            if (thumb) {
                await sock.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: `
╭━━━〔 🎬 *VIDEO FOUND* 〕━━━┈⊷
┃ ❍ Title : ${captionTitle.substring(0, 30)}${captionTitle.length > 30 ? '...' : ''}
┃ ❍ Status : Downloading...
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
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
                text: `
╭━━━〔 ❌ *INVALID LINK* 〕━━━┈⊷
┃ ❍ Not a valid YouTube link
┃ ❍ Please check and try again
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            return;
        }

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
            await sock.sendMessage(chatId, { 
                text: `
╭━━━〔 ❌ *DOWNLOAD FAILED* 〕━━━┈⊷
┃ ❍ All sources failed
┃ ❍ Try again later
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
            }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, {
            video: { url: videoData.download || videoData.dl || videoData.url },
            mimetype: 'video/mp4',
            fileName: `${(videoData.title || videoTitle || 'video').replace(/[^\w\s-]/g, '')}.mp4`,
            caption: `
╭━━━〔 ✅ *VIDEO READY* 〕━━━┈⊷
┃ ❍ Title : ${(videoData.title || videoTitle || 'Video').substring(0, 30)}${(videoData.title || videoTitle || 'Video').length > 30 ? '...' : ''}
┃ ❍ Status : Downloaded ✅
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
        }, { quoted: message });

        await addReaction(sock, message, '✅');

    } catch (error) {
        console.error('[VIDEO] Command Error:', error?.message || error);
        await addReaction(sock, message, '❌');
        
        let errorMsg = 'Unknown error';
        if (error.message && error.message.includes('blocked')) errorMsg = 'Content blocked in your region.';
        else if (error.response?.status === 451) errorMsg = 'Content unavailable (451).';
        else if (error.message && error.message.includes('All download sources failed')) errorMsg = 'All sources failed. Try again.';
        else errorMsg = error.message || 'Unknown error';
        
        await sock.sendMessage(chatId, { 
            text: `
╭━━━〔 ❌ *ERROR* 〕━━━┈⊷
┃ ❍ ${errorMsg}
┃ ❍ Please try again later
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
        }, { quoted: message });
    }
}

module.exports = videoCommand;
