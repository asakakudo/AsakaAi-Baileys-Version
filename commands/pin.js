import axios from 'axios';

export default {
    name: '!pin',
    aliases: ['pinterest', 'pindl'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const input = args.join(" ");

        if (!input) {
            return await sock.sendMessage(jid, { 
                text: 'Format Salah!\n\n1. *Cari Gambar:* !pin anime wallpaper\n2. *Download Link:* !pin https://pin.it/xxxxx' 
            }, { quoted: m });
        }

        const isUrl = input.startsWith('http') && (input.includes('pinterest.com') || input.includes('pin.it'));

        try {
            if (isUrl) {
                await sock.sendMessage(jid, { text: '_Sabar, lagi ngambil media dari link Pinterest..._' }, { quoted: m });

                const API_DL = 'https://api.ryzumi.vip/api/downloader/pinterest';
                const response = await axios.get(API_DL, { params: { url: input } });
                const res = response.data;

                if (!res || !res.success || !res.media || res.media.length === 0) {
                    throw new Error('Media tidak ditemukan.');
                }

                const bestMedia = res.media.find(m => m.quality === 'original') || res.media[0];
                const mediaUrl = bestMedia.url;
                const isVideo = bestMedia.extension === 'mp4';

                const bufferResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                const mediaBuffer = Buffer.from(bufferResponse.data);

                if (isVideo) {
                    await sock.sendMessage(jid, { video: mediaBuffer, caption: `✅ *Video Berhasil Terunduh*` }, { quoted: m });
                } else {
                    await sock.sendMessage(jid, { image: mediaBuffer, caption: `✅ *Gambar Berhasil Terunduh*` }, { quoted: m });
                }

            } else {
                await sock.sendMessage(jid, { text: `🔍 Mencari gambar *${input}*...` }, { quoted: m });

                const API_SEARCH = 'https://api.ryzumi.vip/api/search/pinterest';
                const response = await axios.get(API_SEARCH, { params: { query: input } });
                const results = response.data; 

                if (!results || results.length === 0) {
                    return await sock.sendMessage(jid, { text: '❌ Gambar tidak ditemukan.' }, { quoted: m });
                }

                const topResults = results.slice(0, 5);

                for (const item of topResults) {
                    await sock.sendMessage(jid, { 
                        image: { url: item.directLink }, 
                        caption: `📌 *Pinterest Search*\n🔗 ${item.link}`
                    });
                }
            }

        } catch (err) {
            console.error('Pinterest Error:', err.message);
            await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` }, { quoted: m });
        }
    }
};