import axios from 'axios';

export default {
    name: '!ig',
    aliases: ['!igdl', '!reels', '!igvideo'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link Instagram-nya?' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil media Instagram..._' }, { quoted: m });

            const response = await axios.get(`https://api.ryzumi.vip/api/downloader/igdl`, {
                params: { url: url }
            });

            const res = response.data;

            if (!res || res.status !== true || !res.data || res.data.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Media Instagram tidak ditemukan atau akun diprivate.' }, { quoted: m });
            }

            for (const item of res.data) {
                const mediaUrl = item.url;
                const mediaType = item.type; 

                const bufferResponse = await axios.get(mediaUrl, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                const mediaBuffer = Buffer.from(bufferResponse.data);

                if (mediaType === 'video') {
                    await sock.sendMessage(jid, { 
                        video: mediaBuffer, 
                        caption: `✅ *Instagram Video Success*` 
                    });
                } else {
                    await sock.sendMessage(jid, { 
                        image: mediaBuffer, 
                        caption: `✅ *Instagram Image Success*` 
                    });
                }
            }

        } catch (err) {
            console.error('=== ERROR INSTAGRAM ===', err.message);
            await sock.sendMessage(jid, { text: 'Gagal mengambil media Instagram. Layanan mungkin sedang bermasalah.' }, { quoted: m });
        }
    }
};