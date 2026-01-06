import axios from 'axios';

export default {
    name: '!pinterest',
    aliases: ['!pin', '!pindl'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link Pinterest-nya? Contoh: *!pinterest https://pin.it/xxxxx*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil media dari Pinterest..._' }, { quoted: m });

            // 1. Request ke API Ryzumi sesuai dokumentasi curl kamu
            const API_ENDPOINT = 'https://api.ryzumi.vip/api/downloader/pinterest';
            const response = await axios.get(API_ENDPOINT, {
                params: { url: url }
            });

            const res = response.data;

            // 2. Validasi respon berdasarkan JSON dokumentasi
            if (!res || res.success !== true || !res.media || res.media.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Media Pinterest tidak ditemukan.' }, { quoted: m });
            }

            // 3. Cari kualitas terbaik (biasanya yang berlabel 'original')
            const bestMedia = res.media.find(m => m.quality === 'original') || res.media[0];
            const mediaUrl = bestMedia.url;
            const extension = bestMedia.extension || 'jpg';

            // 4. Download Media menjadi Buffer
            const bufferResponse = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const mediaBuffer = Buffer.from(bufferResponse.data);

            // 5. Kirim ke WhatsApp berdasarkan ekstensinya
            // Pinterest bisa berupa gambar (jpg/png) atau video (mp4)
            if (extension === 'mp4') {
                await sock.sendMessage(jid, { 
                    video: mediaBuffer, 
                    caption: `✅ *Pinterest Video Success*` 
                }, { quoted: m });
            } else {
                await sock.sendMessage(jid, { 
                    image: mediaBuffer, 
                    caption: `✅ *Pinterest Image Success*` 
                }, { quoted: m });
            }

        } catch (err) {
            console.error('=== ERROR PINTEREST ===', err.message);
            await sock.sendMessage(jid, { text: 'Gagal mengambil media Pinterest. Pastikan link valid.' }, { quoted: m });
        }
    }
};