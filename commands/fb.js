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

            // 1. Request ke API Ryzumi
            const API_ENDPOINT = 'https://api.ryzumi.vip/api/downloader/fbdl';
            const response = await axios.get(API_ENDPOINT, { params: { url } });

            const res = response.data;

            // 2. Validasi
            if (!res || res.status !== true || !res.data || res.data.length === 0) {
                return await sock.sendMessage(jid, { text: 'Gagal: Video Facebook tidak ditemukan. Pastikan link publik.' }, { quoted: m });
            }

            // 3. Sorting Kualitas Terbaik (Prioritas HD/720p, lalu SD)
            // Ryzumi biasanya mengembalikan array, kita cari yang ada label 'HD' atau resolusi tertinggi
            const videoData = res.data.find(i => i.resolution && i.resolution.includes('HD')) || 
                              res.data.find(i => i.resolution && i.resolution.includes('720p')) || 
                              res.data[0];

            const videoUrl = videoData.url;
            
            // Mengambil detail metadata (Title/Author) tapi MENGABAIKAN caption postingan
            const title = res.title || 'Facebook Video'; // Judul video (bukan caption user)
            const author = res.author || '-'; // Nama pengupload (jika ada)
            const quality = videoData.resolution || 'Standard';

            if (!videoUrl) {
                throw new Error('URL video tidak valid.');
            }

            // 4. Download Video menjadi Buffer
            const bufferResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const videoBuffer = Buffer.from(bufferResponse.data);

            // 5. Susun Caption WhatsApp (Tanpa deskripsi/caption postingan FB)
            const msgCaption = `✅ *Facebook Video Success*\n\n` +
                               `📝 *Title:* ${title}\n` +
                               `👤 *Author:* ${author}\n` +
                               `⚙️ *Quality:* ${quality}`;

            // 6. Kirim ke WhatsApp
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