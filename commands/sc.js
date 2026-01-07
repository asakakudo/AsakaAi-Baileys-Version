import axios from 'axios';

export default {
    name: '!soundcloud',
    aliases: ['!scdl', '!sc', '!scloud'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) {
            return await sock.sendMessage(jid, { text: 'Mana link SoundCloud-nya? Contoh: *!soundcloud https://soundcloud.com/xxxxx*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil audio dari SoundCloud..._' }, { quoted: m });

            const API_ENDPOINT = 'https://api.ryzumi.vip/api/downloader/soundcloud';
            const response = await axios.get(API_ENDPOINT, {
                params: { url: url }
            });

            const res = response.data;

            if (!res || !res.download_url) {
                return await sock.sendMessage(jid, { text: 'Gagal: Audio SoundCloud tidak ditemukan atau API sedang bermasalah.' }, { quoted: m });
            }

            const downloadUrl = res.download_url; 
            const title = res.title || 'SoundCloud Audio';

            const audioBufferRes = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const audioBuffer = Buffer.from(audioBufferRes.data);

            await sock.sendMessage(jid, { 
                audio: audioBuffer, 
                mimetype: 'audio/mp4', 
                fileName: `${title}.mp3`
            }, { quoted: m });

            console.log(`[SC] Berhasil mengirim: ${title}`);

        } catch (err) {
            console.error('=== ERROR SOUNDCLOUD ===', err.message);
            await sock.sendMessage(jid, { text: 'Gagal mengambil audio SoundCloud. Pastikan link valid.' }, { quoted: m });
        }
    }
};