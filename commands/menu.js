import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatDateTime() {
    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Makassar' 
    });
    const waktu = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Makassar'
    });
    return { tanggal, waktu };
}

export default {
    name: '!menu',
    aliases: ['!help', '.menu', '!list'],
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const name = m.pushName || 'User';
        const { tanggal, waktu } = formatDateTime();
        const imageDir = path.join(__dirname, '../assets/menu');
        let menuImage = { url: 'https://files.catbox.moe/k9d6l3.jpg' };

        try {
            if (fs.existsSync(imageDir)) {
                const images = fs.readdirSync(imageDir).filter(file => /\.(png|jpe?g|webp)$/i.test(file));
                if (images.length > 0) {
                    const randomImage = images[Math.floor(Math.random() * images.length)];
                    menuImage = fs.readFileSync(path.join(imageDir, randomImage));
                }
            }
        } catch (err) {
            console.error('[MENU ERROR]', err.message);
        }

        const menuText = `
✨ *Halo, ${name}!* ✨
Selamat datang di **AsakaAi**

"ga tau gabut aja gw bikin ginian"

📅 *Tanggal:* ${tanggal}
⏰ *Waktu:* ${waktu}

━━━━━━━━━━━━━━━━━━━
     🛠️ **DASHBOARD MENU**
━━━━━━━━━━━━━━━━━━━

🚀 **Main Dashboard**
├ !menu - Menampilkan daftar ini
└ !ping - Cek status bot

🤖 **Artificial Intelligence**
├ !ai [pertanyaan] - Chat dengan Gemini
├ !ai set [nama] - Ganti karakter AI
└ !img [prompt] - Generate Gambar (Flux)

🎨 **AI Image Tools**
_(Reply/Kirim gambar dengan caption)_
├ !upscaler - Upscale gambar
├ !tofigure - Ubah foto jadi Figure
├ !tohijab - Ubah foto jadi Berhijab
├ !hitamkan - PENGHITAMAN MASSAL🔥
├ !colorize - Warnai foto jadul
├ !waifu2x - HD-kan gambar anime
├ !remini - HD-kan Gambar
├ !removebg - Hapus background
└ !edit [prompt] - Edit gambar via teks

📥 **Downloader & Search**
├ !all [link] - Universal Downloader
├ !tt [link] - TikTok No WM
├ !fb [link] - Facebook Video
├ !ig [link] - Instagram Post/Reels
├ !thr [link] - Threads Media
├ !spotify [link] - Downloader Lagu
├ !sc [link] - Download Lagu SoundCloud
├ !pin [link] - Download dari Pinterest
└ !x [link] - Twitter Downloader

🛠️ **Tools**
├ !s [text] - Buat stikermu sendiri 
└ !pin [query] - Cari di Pinterest

👥 **Group Management** (Admin Only)
├ !hidetag [teks] - Tag all member
├ !kick @tag - Keluarkan member
├ !promote @tag - Jadikan Admin
├ !link - Link Invite Grup
└ !group open/close - Buka/Tutup grup

━━━━━━━━━━━━━━━━━━━
_⚡ Powered by *AsakaProject*_
`;

        await sock.sendMessage(jid, {
            image: menuImage,
            caption: menuText
        }, { quoted: m });
    }
};