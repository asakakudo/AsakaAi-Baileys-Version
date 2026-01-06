import axios from 'axios';

export default {
    name: '!fb',
    aliases: ['!fbdl', '!facebook'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link Facebook-nya? Contoh: *!fb https://www.facebook.com/watch/?v=xxxxx*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil video Facebook..._' }, { quoted: m });

            // Request ke API Ryzumi sesuai dokumentasi terbaru
            const API_ENDPOINT = 'https://api.ryzumi.vip/api/downloader/fbdl';
            const response = await axios.get(API_ENDPOINT, { params: { url } });

            const res = response.data;

            // Validasi status dan data berdasarkan JSON dokumentasi
            if (!res || res.status !== true || !res.data || res.data.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Video Facebook tidak ditemukan. Pastikan link bersifat publik.' }, { quoted: m });
            }

            // Ambil media dengan tipe video (biasanya urutan pertama adalah kualitas tertinggi)
            const videoData = res.data.find(item => item.type === 'video') || res.data[0];
            const videoUrl = videoData.url;

            if (!videoUrl) {
                throw new Error('URL video tidak ditemukan dalam respon API.');
            }

            // Download media menjadi Buffer agar file terkirim utuh (bukan link)
            const bufferResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const videoBuffer = Buffer.from(bufferResponse.data);

            // Kirim ke WhatsApp (Format Baileys)
            await sock.sendMessage(jid, { 
                video: videoBuffer, 
                caption: `✅ *Facebook Success*\n📝 *Resolution:* ${videoData.resolution || 'HD'}` 
            }, { quoted: m });

        } catch (err) {
            console.error('=== ERROR FACEBOOK ===', err.message);
            await sock.sendMessage(jid, { text: 'Gagal mengambil video Facebook. Link mungkin tidak valid atau API sedang gangguan.' }, { quoted: m });
        }
    }
};