import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const agent = new https.Agent({
    rejectUnauthorized: false
});

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Connection': 'keep-alive'
};

export const AI_IMAGE_FEATURES = {
    toanime: 'toanime',
    tofigure: 'tofigure',
    tohijab: 'tohijab',
    hitamkan: 'hitamkan',
    waifu2x: 'waifu2x',
    removebg: 'removebg',
    colorize: 'colorize',
    edit: 'edit'
};

const AI_MESSAGES = {
    toanime: () => '🎨 Foto kamu berhasil diubah jadi anime!',
    tofigure: () => '🤖 Foto ini sekarang jadi figur action!',
    tohijab: () => '🧕 Foto berhasil dipakaikan hijab.',
    hitamkan: () => '🖤 KARAKTER BERHASIL DIHITAMKAN🔥🔥.',
    waifu2x: () => '✨ Resolusi foto berhasil ditingkatkan (Waifu2x).',
    upscaler: () => '🔍 Foto berhasil di-upscale (HD).',
    removebg: () => '✂️ Background foto berhasil dihapus.',
    colorize: () => '🌈 Foto hitam-putih berhasil diberi warna.',
    remini: () => '🪄 Foto berhasil diperjelas (Ultra HD).',
    edit: (prompt) => `🎨 Prompt digunakan:\n"${prompt}"`
};

async function uploadImage(buffer) {
    try {
        const bodyForm = new FormData();
        bodyForm.append("fileToUpload", buffer, "image.png");
        bodyForm.append("reqtype", "fileupload");

        const res = await axios.post("https://catbox.moe/user/api.php", bodyForm, {
            headers: { ...bodyForm.getHeaders(), ...COMMON_HEADERS },
            httpsAgent: agent
        });
        return res.data;
    } catch (e) {
        throw new Error("Gagal upload gambar ke server.");
    }
}

export async function getImageBuffer(msg) {
    if (msg.message?.imageMessage) {
        return await downloadMediaMessage(msg, 'buffer', {});
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const quotedMsg = { message: msg.message.extendedTextMessage.contextInfo.quotedMessage };
        return await downloadMediaMessage(quotedMsg, 'buffer', {});
    }
    return null;
}

async function processAiImage(sock, msg, text) {
    const jid = msg.key.remoteJid;
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
    const args = body.trim().split(/\s+/);
    const command = args[0].toLowerCase().replace('!', '');
    
    let scale = args[1] === '4' ? '4' : '2';

    if (command === 'remini' || command === 'hd' || command === 'upscaler') {
        const buffer = await getImageBuffer(msg);
        if (!buffer) return await sock.sendMessage(jid, { text: '⚠️ Kirim/Reply gambar untuk di-HD-kan!' }, { quoted: msg });
        
        await sock.sendMessage(jid, { text: `🪄 _Sedang memperjelas foto (Siputzx AI x${scale})..._` }, { quoted: msg });

        try {
            const imageUrl = await uploadImage(buffer);
            let finalBuffer = null;
            const apiUrl = `https://api.siputzx.my.id/api/iloveimg/upscale?image=${imageUrl}&scale=${scale}`; 
            
            const response = await axios.get(apiUrl, { 
                responseType: 'arraybuffer', 
                headers: COMMON_HEADERS, 
                httpsAgent: agent,
                timeout: 120000 
            });

            const firstChar = response.data.toString('utf8', 0, 1);
            if (firstChar === '{') {
                const jsonRes = JSON.parse(response.data.toString());
                const downloadUrl = jsonRes.url || jsonRes.data?.url || jsonRes.result;
                
                if (!downloadUrl) throw new Error('API Siputzx tidak memberikan link download.');
                
                const imgRes = await axios.get(downloadUrl, { 
                    responseType: 'arraybuffer',
                    headers: COMMON_HEADERS 
                });
                finalBuffer = imgRes.data;
            } else {
                finalBuffer = response.data;
            }

            await sock.sendMessage(jid, { 
                document: finalBuffer, 
                mimetype: 'image/png', 
                fileName: `AsakaAi-HD-${Date.now()}.png`,
                caption: `✅ Berhasil diperjelas (HD Mode)` 
            }, { quoted: msg });

        } catch (e) {
            console.error('HD Error:', e.message);
            await sock.sendMessage(jid, { text: '❌ Gagal. Server Siputzx sedang sibuk atau timeout.' }, { quoted: msg });
        }
        return;
    }

    const endpoint = AI_IMAGE_FEATURES[command];
    if (!endpoint) return;

    try {
        const buffer = await getImageBuffer(msg);
        if (!buffer) return await sock.sendMessage(jid, { text: `Kirim/balas gambar dengan *!${command}*` }, { quoted: msg });
        await sock.sendMessage(jid, { text: '_Sedang memproses gambar..._' }, { quoted: msg });

        const imageUrl = await uploadImage(buffer);
        const response = await axios.get(`https://api.ryzumi.vip/api/ai/${endpoint}`, {
            params: { imageUrl: imageUrl, prompt: text },
            responseType: 'arraybuffer',
            httpsAgent: agent,
            timeout: 60000
        });

        if (response.headers['content-type']?.includes('application/json')) {
             throw new Error("API Ryzumi Error (Response is JSON)");
        }

        if (command === 'removebg') {
            await sock.sendMessage(jid, { 
                document: Buffer.from(response.data),
                mimetype: 'image/png', 
                fileName: `AsakaAi-${command}-${Date.now()}.png`,
                caption: AI_MESSAGES[command] ? AI_MESSAGES[command]() : 'Selesai.'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, { 
                image: Buffer.from(response.data),
                caption: AI_MESSAGES[command] ? AI_MESSAGES[command]() : 'Selesai.'
            }, { quoted: msg });
        }
    } catch (e) {
        console.error(`AI Image Error (${command}):`, e.message);
        await sock.sendMessage(jid, { text: '❌ Gagal. Fitur mungkin sedang maintenance.' }, { quoted: msg });
    }
}

export default {
    name: 'AI Image Tools',
    aliases: [
        '!remini', '!hd', 
        '!upscaler', '!removebg', 
        '!toanime', '!tofigure', '!tohijab', 
        '!hitamkan', '!waifu2x', '!colorize', '!edit'
    ],
    execute: async (sock, msg, args) => {
        const text = args.join(" ");
        await processAiImage(sock, msg, text);
    }
};