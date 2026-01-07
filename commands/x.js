import axios from 'axios';

export default {
    name: '!twitter',
    aliases: ['!twit', '!twdl', '!x'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link Twitter/X nya? Contoh: *!twitter https://x.com/user/status/xxxxx*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil media dari Twitter/X..._' }, { quoted: m });
            const API_ENDPOINT = 'https://api.ryzumi.vip/api/downloader/twitter';
            const response = await axios.get(API_ENDPOINT, {
                params: { url: url }
            });

            const res = response.data;

            if (!res || res.status !== true || !res.media || res.media.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Media Twitter tidak ditemukan atau link tidak valid.' }, { quoted: m });
            }

            const mediaItem = res.media[res.media.length - 1]; 
            const mediaUrl = mediaItem.url;
            const mediaType = res.type; 
            const bufferResponse = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const mediaBuffer = Buffer.from(bufferResponse.data);

            if (mediaType === 'video') {
                await sock.sendMessage(jid, { 
                    video: mediaBuffer, 
                    caption: `✅ *Twitter Video Success*\n⚙️ *Quality:* ${mediaItem.quality || 'HD'}` 
                }, { quoted: m });
            } else {
                await sock.sendMessage(jid, { 
                    image: mediaBuffer, 
                    caption: `✅ *Twitter Image Success*` 
                }, { quoted: m });
            }

        } catch (err) {
            console.error('=== ERROR TWITTER ===', err.message);
            await sock.sendMessage(jid, { text: 'Gagal mengambil media Twitter. Pastikan link valid.' }, { quoted: m });
        }
    }
};