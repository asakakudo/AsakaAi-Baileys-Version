import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const agent = new https.Agent({
    rejectUnauthorized: false
});

// Daftar endpoint API
export const AI_IMAGE_FEATURES = {
    toanime: 'toanime',
    tofigure: 'tofigure',
    tohijab: 'tohijab',
    hitamkan: 'hitamkan',
    waifu2x: 'waifu2x',
    upscaler: 'upscaler',
    removebg: 'removebg',
    colorize: 'colorize',
    remini: 'remini',
    edit: 'edit'
};

// Objek Pesan Berhasil (Custom Captions)
const AI_MESSAGES = {
    toanime: () => '🎨 Foto kamu berhasil diubah jadi anime!',
    tofigure: () => '🤖 Foto ini sekarang jadi figur action!',
    tohijab: () => '🧕 Foto berhasil dipakaikan hijab.',
    hitamkan: () => '🖤 KARAKTER BERHASIL DIHITAMKAN🔥🔥.',
    waifu2x: () => '✨ Resolusi foto berhasil ditingkatkan.',
    upscaler: () => '🔍 Foto berhasil di-upscale.',
    removebg: () => '✂️ Background foto berhasil dihapus.',
    colorize: () => '🌈 Foto hitam-putih berhasil diberi warna.',
    remini: () => '🪄 Foto berhasil diperjelas.',
    edit: (prompt) => `🎨 Prompt digunakan:\n"${prompt}"`
};

async function uploadImage(buffer) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, {
        filename: 'image.png',
        contentType: 'image/png'
    });

    try {
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: { ...form.getHeaders() }
        });
        return res.data.trim();
    } catch (err) {
        throw new Error('Gagal mengunggah gambar ke server.');
    }
}

export async function getImageBuffer(msg) {
    const imageMsg = msg.message?.imageMessage || 
                     msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    
    if (!imageMsg) return null;

    const messageToDownload = msg.message?.imageMessage ? msg : {
        key: msg.key,
        message: msg.message.extendedTextMessage.contextInfo.quotedMessage
    };

    return await downloadMediaMessage(messageToDownload, 'buffer', {}, { logger: null });
}

export async function processAiImage(sock, msg, text) {
    const jid = msg.key.remoteJid;
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
    const command = body.trim().split(/\s+/)[0].toLowerCase().replace('!', '');
    
    const endpoint = AI_IMAGE_FEATURES[command];
    if (!endpoint) return;

    try {
        const buffer = await getImageBuffer(msg);
        if (!buffer) {
            return await sock.sendMessage(jid, { text: `Kirim atau balas gambar dengan perintah *!${command}*` }, { quoted: msg });
        }

        await sock.sendMessage(jid, { text: '_Sedang memproses gambar..._' }, { quoted: msg });

        const imageUrl = await uploadImage(buffer);

        const response = await axios.get(`https://api.ryzumi.vip/api/ai/${endpoint}`, {
            params: { imageUrl: imageUrl, prompt: text }, // text di sini adalah sisa args/prompt
            responseType: 'arraybuffer',
            httpsAgent: agent,
            timeout: 60000
        });

        // Ambil pesan caption dari objek AI_MESSAGES
        const successMessage = AI_MESSAGES[command] ? AI_MESSAGES[command](text) : `Berhasil diproses: ${command}`;

        await sock.sendMessage(jid, { 
            image: Buffer.from(response.data),
            caption: successMessage
        }, { quoted: msg });

    } catch (err) {
        console.error(err);
        await sock.sendMessage(jid, { text: `Gagal memproses gambar: ${err.message}` }, { quoted: msg });
    }
}