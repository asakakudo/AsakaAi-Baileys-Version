import axios from 'axios';

export default {
    name: '!all',
    aliases: ['!dl', '!down'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) return await sock.sendMessage(jid, { text: 'Mana link-nya?' }, { quoted: m });

        try {
            await sock.sendMessage(jid, { text: '_Sedang diproses..._' }, { quoted: m });

            // 1. JALUR KHUSUS SPOTIFY
            if (url.includes('spotify.com') || url.includes('spotify.link')) {
                const spotRes = await axios.get(`https://api.ryzumi.vip/api/downloader/spotify`, { params: { url } });
                if (spotRes.data.success) {
                    const { title, artists } = spotRes.data.metadata;
                    const cleanQuery = `${title} ${artists}`.replace(/[^\w\s]/gi, '');

                    const searchRes = await axios.get(`https://api.siputzx.my.id/api/s/youtube`, { 
                        params: { query: cleanQuery } 
                    });
                    const results = searchRes.data.data ? searchRes.data.data.slice(0, 5) : [];

                if (results.length > 0) {
                    const timeoutLimit = 5 * 60 * 1000;
                    const meta = spotRes.data.metadata;
                    const backupThumb = results[0]?.thumbnails?.[0]?.url || results[0]?.thumbnail;
                    global.db[jid] = {
                        type: 'spotify_search',
                        results: results.map(v => v.url),
                        metadata: {
                            title: meta.title,
                            artists: meta.artists,
                            album: meta.album || '-',
                            releaseDate: meta.releaseDate || '-',
                            // Ganti ke link yang pasti aktif ini
                            thumbnail: meta.thumbnail || backupThumb || 'https://cdn-icons-png.flaticon.com/512/2111/2111624.png' 
                        },
                        timestamp: Date.now()
                    };

                    setTimeout(() => {
                        if (global.db[jid] && global.db[jid].type === 'spotify_search') {
                            console.log(`[CLEANUP] Menghapus sesi Spotify untuk: ${jid}`);
                            delete global.db[jid];
                        }
                    }, timeoutLimit);

                        let listText = `🎧 *Spotify Matcher*\nLagu: *${title}*\n\n`;
                        results.forEach((v, i) => {
                            // Perbaikan: Tambahkan fallback jika duration undefined
                            const dur = v.duration?.timestamp || '??:??';
                            listText += `${i + 1}. ${v.title} (${dur})\n`;
                        });
                        listText += `\n_Balas dengan angka *1-5* untuk mendownload._`;

                        return await sock.sendMessage(jid, { text: listText }, { quoted: m });
                    }
                }
            }

            const response = await axios.get(`https://api.ryzumi.vip/api/downloader/all-in-one`, { 
                params: { url: url },
                timeout: 30000 
            });
            const res = response.data;

            let filteredMedias = [];
            if (res.medias && res.medias.length > 0) {
                // Perbaikan: Tambahkan filter 'audio' untuk SoundCloud
                const audios = res.medias.filter(media => media.type === 'audio');
                const videos = res.medias.filter(media => media.type === 'video');
                const images = res.medias.filter(media => media.type === 'image');

                if (audios.length > 0) {
                    filteredMedias = [audios[0]]; // Utamakan audio jika ada (SoundCloud)
                } else if (videos.length > 0) {
                    filteredMedias = [videos[0]]; 
                } else {
                    filteredMedias = images;
                }
            } else if (res.url || res.link) {
                filteredMedias = [{ url: res.url || res.link, type: 'video' }];
            }

            if (filteredMedias.length === 0) throw new Error('Media tidak ditemukan.');

            for (const media of filteredMedias) {
            // ... di dalam loop for (const media of filteredMedias) ...
            const bufferResponse = await axios.get(media.url, { responseType: 'arraybuffer', timeout: 60000 });
            const mediaBuffer = Buffer.from(bufferResponse.data);

            // Buat dekorasi teks
            const detailText = `📁 *Media Downloader*\n\n` +
                            `📌 *Judul :* ${res.title?.substring(0, 150) || '-'}\n` +
                            `🌐 *Sumber :* ${url.split('/')[2]}\n` +
                            `✅ *Status :* Sukses Terunduh\n\n` +
                            `_AsakaAiThoughtPartner_`;

            if (media.type === 'audio') {
                // Kirim detail dulu (Thumbnail + Teks) agar tidak sepi
                await sock.sendMessage(jid, { 
                    image: { url: res.thumbnail || 'https://cdn-icons-png.flaticon.com/512/2111/2111624.png' }, 
                    caption: detailText 
                }, { quoted: m });

                // Kirim Audio
                await sock.sendMessage(jid, { 
                    audio: mediaBuffer, 
                    mimetype: 'audio/mp4',
                    fileName: `${res.title || 'audio'}.mp3`
                }, { quoted: m });
            } else if (media.type === 'video') {
                // Kirim Video beserta detailnya di CAPTION
                await sock.sendMessage(jid, { 
                    video: mediaBuffer, 
                    caption: detailText,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } else {
                // Untuk Gambar
                await sock.sendMessage(jid, { image: mediaBuffer, caption: detailText }, { quoted: m });
            }
            }
        } catch (err) {
            console.error('=== ERROR ALL-DL ===', err.message);
            await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` }, { quoted: m });
        }
    }
};