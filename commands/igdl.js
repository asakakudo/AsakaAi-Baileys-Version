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

            // 1. Request ke API Ryzumi
            const response = await axios.get(`https://api.ryzumi.vip/api/downloader/igdl`, {
                params: { url: url }
            });

            const res = response.data;

            // 2. Perbaikan Validasi: Cek res.status dan res.data sesuai dokumentasi
            if (!res || res.status !== true || !res.data || res.data.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Media Instagram tidak ditemukan atau akun diprivate.' }, { quoted: m });
            }

            // 3. Loop melalui array res.data
            for (const item of res.data) {
                const mediaUrl = item.url;
                const mediaType = item.type; // "video" atau "image"

                // Download Media menjadi Buffer
                const bufferResponse = await axios.get(mediaUrl, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                const mediaBuffer = Buffer.from(bufferResponse.data);

                // 4. Kirim berdasarkan tipe media yang diberikan API
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