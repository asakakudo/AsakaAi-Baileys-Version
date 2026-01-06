import axios from 'axios';

export default {
    name: '!tiktok',
    aliases: ['tt', 'ttdl'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link TikTok-nya? Contoh: *!tiktok https://vt.tiktok.com/xxxxx/* ' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi download videonya..._' }, { quoted: m });

            // 1. Request ke Endpoint yang BENAR sesuai screenshot kamu (/ttdl)
            // Note: Axios otomatis mem-parsing JSON, jadi kita akses datanya dari `res.data`
            const res = await axios.get(`https://api.ryzumi.vip/api/downloader/ttdl`, {
                params: { url: url }
            });

            // 2. Ambil data sesuai struktur di screenshot (data -> data -> data)
            // Axios response = res.data
            // API wrapper = res.data.data
            // Content = res.data.data.data
            const apiResponse = res.data;
            const tikData = apiResponse?.data?.data; 

            if (!tikData || !tikData.play) {
                throw new Error('Video tidak ditemukan di dalam respon API.');
            }

            const videoUrl = tikData.play; // URL Video tanpa watermark
            const title = tikData.title || 'No Title';

            // 3. Download Video jadi BUFFER (Teknik yang sama kayak kode lama kamu)
            // Ini penting biar WA terima file mentah, bukan link doang
            const bufferResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const videoBuffer = Buffer.from(bufferResponse.data);

            // 4. Kirim ke WhatsApp (Format Baileys)
            await sock.sendMessage(jid, { 
                video: videoBuffer, 
                caption: `✅ *TikTok Success*\n📝 *Title:* ${title}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } catch (err) {
            console.error('Error TikTok:', err);
            await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` }, { quoted: m });
        }
    }
};