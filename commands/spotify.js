import axios from 'axios';

export default {
    name: '!spotify',
    aliases: ['!sp', '!spotdl'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const url = args[0];

        if (!url) return await sock.sendMessage(jid, { text: 'Mana link Spotify-nya?' }, { quoted: m });

        try {
            await sock.sendMessage(jid, { text: '_Mencari kecocokan lagu..._' }, { quoted: m });

            const spotRes = await axios.get(`https://api.ryzumi.vip/api/downloader/spotify`, { params: { url } });
            if (!spotRes.data.success) throw new Error('Link Spotify tidak valid.');

            const { title, artists } = spotRes.data.metadata;
            const cleanQuery = `${title} ${artists}`.replace(/[^\w\s]/gi, '');

            const searchRes = await axios.get(`https://api.siputzx.my.id/api/s/youtube`, { 
                params: { query: cleanQuery } 
            });
            const results = searchRes.data.data ? searchRes.data.data.slice(0, 5) : [];

            if (results.length === 0) throw new Error('Lagu tidak ditemukan.');

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
                listText += `${i + 1}. ${v.title} (${v.duration.timestamp})\n`;
            });
            listText += `\n_Balas dengan angka *1-5* untuk mendownload._`;

            await sock.sendMessage(jid, { text: listText }, { quoted: m });

        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal: ${err.message}` }, { quoted: m });
        }
    }
};