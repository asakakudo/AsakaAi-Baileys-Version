import axios from 'axios';

export default {
    name: '!threads',
    aliases: ['!threadsdl', '!thread'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link Threads-nya? Contoh: *!threads https://www.threads.net/@user/post/xxxxx*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil media dari Threads..._' }, { quoted: m });

            const API_ENDPOINT = 'https://api.ryzumi.vip/api/downloader/threads';
            const response = await axios.get(API_ENDPOINT, {
                params: { url: url }
            });

            const res = response.data;

            if (!res || res.status !== true || !res.data || res.data.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Media Threads tidak ditemukan. Pastikan link valid dan publik.' }, { quoted: m });
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
                        caption: `✅ *Threads Video Success*` 
                    });
                } else {
                    await sock.sendMessage(jid, { 
                        image: mediaBuffer, 
                        caption: `✅ *Threads Image Success*` 
                    });
                }
            }

        } catch (err) {
            console.error('=== ERROR THREADS ===', err.message);
            await sock.sendMessage(jid, { text: 'Gagal mengambil media Threads. Pastikan link valid atau layanan sedang bermasalah.' }, { quoted: m });
        }
    }
};