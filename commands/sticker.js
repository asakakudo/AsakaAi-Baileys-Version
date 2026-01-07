import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import twemoji from 'twemoji';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegPath from 'ffmpeg-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set Path FFmpeg
process.env.FFMPEG_PATH = ffmpegPath;

// Registrasi Font
try {
    const fontPath = path.join(__dirname, '../assets/fonts/impact.ttf');
    if (GlobalFonts.registerFromPath(fontPath, 'ImpactMeme')) {
        console.log('[INFO] Font Impact berhasil dimuat.');
    }
} catch (e) {
    console.error('[WARN] Font Impact tidak ditemukan.');
}

const emojiCache = new Map();

async function loadEmojiImage(emoji) {
    if (emojiCache.has(emoji)) return emojiCache.get(emoji);
    const parsed = twemoji.parse(emoji, { folder: '72x72', ext: '.png' });
    const match = parsed.match(/src="([^"]+)"/);
    if (!match) return null;
    try {
        const res = await fetch(match[1]);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const img = await loadImage(buffer);
        if (emojiCache.size > 100) emojiCache.clear();
        emojiCache.set(emoji, img);
        return img;
    } catch (e) { return null; }
}

function splitTextAndEmoji(text) {
    const emojiRegex = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{200D}]+/gu;
    const emojis = text.match(emojiRegex) || [];
    const cleanText = text.replace(emojiRegex, '').trim();
    return { cleanText, emojis };
}

function getRawMessage(content) {
    if (content.viewOnceMessage) return getRawMessage(content.viewOnceMessage.message);
    if (content.viewOnceMessageV2) return getRawMessage(content.viewOnceMessageV2.message);
    return content;
}

export default {
    name: '!sticker',
    aliases: ['!s', '!stiker'], 
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const text = args.join(' ');

        try {
            const content = msg.message;
            const isQuoted = content.extendedTextMessage?.contextInfo?.quotedMessage;
            
            let targetMsg = isQuoted ? content.extendedTextMessage.contextInfo.quotedMessage : content;
            targetMsg = getRawMessage(targetMsg);
            
            const type = Object.keys(targetMsg)[0];
            const isImage = type === 'imageMessage';
            const isVideo = type === 'videoMessage';
            const isSticker = type === 'stickerMessage';

            // === MODE 1: MEME (GAMBAR + TEKS) ===
            if (isImage && text) {
                const buffer = await downloadMediaMessage(
                    { key: { remoteJid: jid, id: 'meme' }, message: targetMsg },
                    'buffer', {}, { logger: null }
                );

                const canvas = createCanvas(512, 512);
                const ctx = canvas.getContext('2d');
                const img = await loadImage(buffer);
                ctx.drawImage(img, 0, 0, 512, 512);

                await drawTextOverlay(ctx, text);

                const sticker = new Sticker(canvas.toBuffer('image/png'), {
                    pack: 'MemePack', author: 'AsakaAi',
                    type: StickerTypes.FULL, quality: 50
                });

                await sock.sendMessage(jid, await sticker.toMessage(), { quoted: msg });
                return;
            }

            // === MODE 2: MEDIA POLOS (GAMBAR/VIDEO/GIF) ===
            // --- INI BAGIAN YANG DIUPDATE UNTUK AUTO-COMPRESS ---
            if (isImage || isVideo || isSticker) {
                const buffer = await downloadMediaMessage(
                    { key: { remoteJid: jid, id: 'media' }, message: targetMsg },
                    'buffer', {}, { logger: null }
                );

                // 1. Settingan Awal (Kualitas Tinggi Sesuai Keinginanmu)
                let quality = isVideo ? 50 : 70; // Video start 50, Gambar start 70
                let fps = 30; // FPS start 30 (Smooth)

                const createSticker = (q, f) => {
                    return new Sticker(buffer, {
                        pack: 'AsakaPack', 
                        author: 'AsakaAi',
                        type: StickerTypes.FULL,
                        quality: q,
                        fps: isVideo ? f : undefined // FPS hanya efek ke video
                    });
                };

                let sticker = createSticker(quality, fps);
                let stickerBuffer = await sticker.toBuffer();

                // 2. Loop Cek Ukuran File (Max 1MB / 1.000.000 bytes)
                const MAX_SIZE = 1000000;
                
                while (stickerBuffer.length > MAX_SIZE && quality > 10) {
                    // Jika kegedean, kurangi kualitas
                    quality -= 10;
                    
                    // Jika video dan masih kegedean, kurangi FPS juga biar ukuran drop drastis
                    if (isVideo && fps > 15) {
                        fps -= 5;
                    }

                    // console.log(`[COMPRESS] Size: ${stickerBuffer.length} > 1MB. Retrying with Q:${quality} FPS:${fps}`);
                    
                    sticker = createSticker(quality, fps);
                    stickerBuffer = await sticker.toBuffer();
                }

                // 3. Kirim Buffer yang sudah lolos seleksi
                await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
                return;
            }

            // === MODE 3: TEKS SAJA ===
            if (text) {
                const canvas = createCanvas(512, 512);
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, 512, 512);
                
                await drawTextOverlay(ctx, text);

                const sticker = new Sticker(canvas.toBuffer('image/png'), {
                    pack: 'TextPack', author: 'AsakaAi',
                    type: StickerTypes.FULL, quality: 70
                });

                await sock.sendMessage(jid, await sticker.toMessage(), { quoted: msg });
                return;
            }

            await sock.sendMessage(jid, { text: 'Kirim gambar/video/gif dengan caption *!s*' }, { quoted: msg });

        } catch (err) {
            console.error('[STICKER ERROR]', err);
            await sock.sendMessage(jid, { text: 'Gagal: ' + err.message }, { quoted: msg });
        }
    }
};

async function drawTextOverlay(ctx, text) {
    const { cleanText, emojis } = splitTextAndEmoji(text);
    
    // Setting Font
    const fontSize = 70;
    const lineHeight = fontSize + 10;
    ctx.font = `${fontSize}px "ImpactMeme", "Arial", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'white';
    ctx.lineJoin = 'round';

    const x = 256;
    const y = 492;

    let lines = []; 

    // Render Teks
    if (cleanText) {
        const words = cleanText.toUpperCase().split(' ');
        let line = '';
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 480 && n > 0) { 
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        lines.reverse().forEach((l, i) => {
            const currentY = y - (i * lineHeight);
            ctx.strokeText(l.trim(), x, currentY);
            ctx.fillText(l.trim(), x, currentY);
        });
    }

    // Render Emoji
    if (emojis.length > 0) {
        const emojiSize = 70;
        let emojiX, emojiY;

        if (lines.length > 0) {
            const lastLine = lines[0].trim();
            const metrics = ctx.measureText(lastLine);
            const textWidth = metrics.width;
            emojiX = 256 + (textWidth / 2) + 12;
            emojiY = y - emojiSize - 12; 
        } else {
            emojiX = 256 - (emojiSize / 2);
            emojiY = 256 - (emojiSize / 2);
        }

        for (const emoji of emojis) {
            const img = await loadEmojiImage(emoji);
            if (img) {
                ctx.drawImage(img, emojiX, emojiY, emojiSize, emojiSize);
                emojiX += emojiSize + 5;
            }
        }
    }
}