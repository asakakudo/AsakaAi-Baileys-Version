import axios from 'axios';

export default {
    name: '!fb',
    aliases: ['!fbdl', '!facebook', '!fbvid'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link Facebook-nya? Contoh: *!fb https://www.facebook.com/watch/?v=xxxxx*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil video Facebook..._' }, { quoted: m });

            const API_ENDPOINT = 'https://api.ryzumi.vip/api/downloader/fbdl';
            const response = await axios.get(API_ENDPOINT, { params: { url } });
            const res = response.data;

            if (!res || res.status !== true || !res.data || res.data.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Video Facebook tidak ditemukan. Pastikan link publik.' }, { quoted: m });
            }

            const videoData = res.data.find(i => i.resolution && i.resolution.includes('HD')) || 
                              res.data.find(i => i.resolution && i.resolution.includes('720p')) || 
                              res.data[0];

            const videoUrl = videoData.url;
            
            const title = res.title || 'Facebook Video'; 
            const author = res.author || '-';
            const quality = videoData.resolution || 'Standard';

            if (!videoUrl) {
                throw new Error('URL video tidak valid.');
            }

            const bufferResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const videoBuffer = Buffer.from(bufferResponse.data);

            const msgCaption = `✅ *Facebook Video Success*\n\n` +
                               `📝 *Title:* ${title}\n` +
                               `👤 *Author:* ${author}\n` +
                               `⚙️ *Quality:* ${quality}`;

            await sock.sendMessage(jid, { 
                video: videoBuffer, 
                caption: msgCaption,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } catch (err) {
            console.error('=== ERROR FACEBOOK ===', err.message);
            await sock.sendMessage(jid, { text: 'Gagal mengambil video Facebook. Link mungkin private atau API error.' }, { quoted: m });
        }
    }
};