import axios from 'axios';

export default {
    name: '!yt',
    aliases: ['!ytmp3', '!ytmp4', '!play', '!video', '!shorts', '!music'], 
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const input = args.join(' ').trim();
        
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const commandUsed = msgText.split(' ')[0].toLowerCase().replace('!', '');

        if (!input) {
            return await sock.sendMessage(jid, { text: 'Masukkan link YouTube yang valid!' }, { quoted: m });
        }

        const isAudio = commandUsed.includes('mp3') || commandUsed.includes('play') || commandUsed.includes('music');

        console.log(`[YT] Memproses ${isAudio ? 'Audio' : 'Video'} dari: ${input}`);
        await sock.sendMessage(jid, { text: `_Sedang memproses ${isAudio ? 'Audio' : 'Video'} (Mohon tunggu, proses ini butuh waktu)..._` }, { quoted: m });

        try {
            let downloadUrl = null;
            let title = 'YouTube Media';

            // --- SERVER 1: RYZUMI (Timeout 30 detik!) ---
            try {
                console.log('[YT] Mencoba Server 1 (Ryzumi)...');
                const endpoint = isAudio ? 'ytmp3' : 'ytmp4';
                const res = await axios.get(`https://api.ryzumi.vip/api/downloader/${endpoint}`, {
                    params: { url: input },
                    timeout: 30000 // Kita kasih waktu 30 detik biar Ryzumi nggak timeout
                });

                if (res.data.url && !res.data.url.includes('Unknown Download URL')) {
                    downloadUrl = res.data.url;
                    title = res.data.title || title;
                    console.log('[YT] Sukses via Ryzumi.');
                } else {
                    throw new Error('Ryzumi Zonk (Unknown URL)');
                }
            } catch (e) {
                console.warn(`[YT] Server 1 Gagal/Timeout: ${e.message}`);
                
                // --- SERVER 2: ITZPIRE (Backup Super Stabil) ---
                try {
                    console.log('[YT] Mencoba Server 2 (Itzpire)...');
                    const res = await axios.get(`https://itzpire.com/download/ytdl?url=${input}`, {
                        timeout: 20000
                    });

                    if (res.data.status === 'success' && res.data.data) {
                        const itzData = res.data.data;
                        downloadUrl = isAudio ? itzData.audio : itzData.video;
                        title = itzData.title || title;
                        console.log('[YT] Sukses via Itzpire.');
                    } else {
                        throw new Error('Itzpire Gagal');
                    }
                } catch (e2) {
                    console.warn(`[YT] Server 2 Gagal: ${e2.message}`);

                    // --- SERVER 3: SIPUTZX (Endpoint Baru) ---
                    try {
                        console.log('[YT] Mencoba Server 3 (Siputzx)...');
                        const siputEndpoint = isAudio ? 'ytmp3' : 'ytmp4';
                        const res = await axios.get(`https://api.siputzx.my.id/api/d/${siputEndpoint}`, {
                            params: { url: input },
                            timeout: 20000
                        });

                        if (res.data.status && res.data.data.dl) {
                            downloadUrl = res.data.data.dl;
                            title = res.data.data.title || title;
                            console.log('[YT] Sukses via Siputzx.');
                        } else {
                            throw new Error('Semua server gagal.');
                        }
                    } catch (e3) {
                        throw new Error('Maaf, semua server (Ryzumi, Itzpire, Siputzx) sedang gangguan.');
                    }
                }
            }

            if (!downloadUrl) throw new Error('Gagal mendapatkan link download.');

            // --- DOWNLOAD BUFFER ---
            const bufferRes = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' 
                },
                timeout: 60000 // Untuk download file besar, kasih waktu 1 menit
            });

            const finalBuffer = Buffer.from(bufferRes.data);

            // --- KIRIM KE WA ---
            if (isAudio) {
                await sock.sendMessage(jid, { 
                    audio: finalBuffer, 
                    mimetype: 'audio/mp4', 
                    fileName: `${title}.mp3`
                }, { quoted: m });
            } else {
                await sock.sendMessage(jid, { 
                    video: finalBuffer, 
                    caption: `✅ *YouTube Download Success*\n📝 *Title:* ${title}`,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            }

        } catch (err) {
            console.error('[YT Final Error]:', err.message);
            await sock.sendMessage(jid, { text: `❌ *Gagal Mendownload*\nSebab: ${err.message}` }, { quoted: m });
        }
    }
};