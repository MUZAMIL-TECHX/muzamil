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

async function videoCommand(sock, chatId, message) {
    try {
        await addReaction(sock, message, '🎬');

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
        let videoDuration = '';

        // Check if input is a link or search query
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            if (ytId) {
                videoThumbnail = `https://i.ytimg.com/vi/${ytId}/sddefault.jpg`;
            }
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
            const vid = videos[0];
            videoUrl = vid.url;
            videoTitle = vid.title;
            videoThumbnail = vid.thumbnail;
            videoDuration = vid.timestamp || 'Unknown';
        }

        // Send preview with thumbnail
        if (videoThumbnail) {
            try {
                await sock.sendMessage(chatId, {
                    image: { url: videoThumbnail },
                    caption: `
╭━━━〔 🎬 *VIDEO FOUND* 〕━━━┈⊷
┃ ❍ Title : ${(videoTitle || searchQuery).substring(0, 30)}${(videoTitle || searchQuery).length > 30 ? '...' : ''}
┃ ❍ Duration : ${videoDuration}
┃ ❍ Status : Downloading...
╰━━━━━━━━━━━━━━━━┈⊷

> By; Muzamil-XD`
                }, { quoted: message });
            } catch (e) {
                console.error('Thumbnail error:', e);
            }
        }

        // Validate YouTube URL
        const urlMatch = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urlMatch) {
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

        // Try APIs in sequence
        let videoData = null;
        const apis = [
            { name: 'Arslan', fn: () => getArslanVideo(videoUrl) },
            { name: 'EliteProTech', fn: () => getEliteProTechVideo(videoUrl) },
            { name: 'Yupra', fn: () => getYupraVideo(videoUrl) }
        ];

        for (const api of apis) {
            try {
                videoData = await api.fn();
                if (videoData && videoData.download) {
                    console.log(`✅ ${api.name} API success`);
                    break;
                }
            } catch (err) {
                console.log(`❌ ${api.name} API failed:`, err.message);
            }
        }

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
            return;
        }

        // Send the video
        await sock.sendMessage(chatId, {
            video: { url: videoData.download },
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
        console.error('Video command error:', error);
        await addReaction(sock, message, '❌');
        
        let errorMsg = error.message || 'Unknown error';
        if (error.message?.includes('blocked')) errorMsg = 'Content blocked in your region.';
        else if (error.response?.status === 451) errorMsg = 'Content unavailable (451).';
        else if (error.message?.includes('All sources failed')) errorMsg = 'All sources failed. Try again.';
        
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
