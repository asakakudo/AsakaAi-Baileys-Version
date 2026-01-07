import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';

// =================================================================
// ⚙️ KONFIGURASI BOT (WAJIB DIISI)
// =================================================================
const usePairingCode = true; // Wajib TRUE untuk Panel
const phoneNumber = '6285129891550'; // ⚠️ GANTI DENGAN NOMOR BOT (Awali 62, jangan 08)
// =================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Commands secara Dinamis
const commands = new Map();
const commandPath = path.join(__dirname, 'commands');

// Perbaikan typo {'' menjadi {
if (fs.existsSync(commandPath)) {
    const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const filePath = `./commands/${file}`;
            const module = await import(filePath);
            const command = module.default || module;

            if (command && command.name) {
                commands.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => commands.set(alias, command));
                }
                console.log(`[LOAD] Perintah dimuat: ${command.name}`);
            }
        } catch (e) {
            console.error(`[ERROR] Gagal memuat ${file}:`, e);
        }
    }
}

// === INISIALISASI DATABASE & STORE ===
global.db = global.db || {};
const msgStore = {}; // ✅ INI YANG HILANG SEBELUMNYA (Penyebab Error)

async function startBot() {
    const { 
        default: makeWASocket, 
        useMultiFileAuthState, 
        DisconnectReason, 
        fetchLatestBaileysVersion, 
        makeCacheableSignalKeyStore 
    } = await import('@whiskeysockets/baileys');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[SYSTEM] Memulai Bot dengan Baileys v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), // Log silent biar panel bersih
        printQRInTerminal: !usePairingCode,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'], // Browser Linux stabil di panel
        defaultQueryTimeoutMs: undefined,
    });

    // =================================================================
    // 🔗 LOGIKA PAIRING CODE (PENTING UNTUK PANEL)
    // =================================================================
    if (usePairingCode && !sock.authState.creds.registered) {
        if (!phoneNumber || phoneNumber.includes('x')) {
            console.log('❌ ERROR FATAL: Nomor HP belum diisi di index.js! Edit baris ke-11.');
            process.exit(1);
        }
        
        console.log(`⏳ Menunggu kode pairing untuk nomor: ${phoneNumber}...`);
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n================================`);
                console.log(`💬 KODE PAIRING ANDA:`);
                console.log(`   ${code}`);
                console.log(`================================\n`);
                console.log(`👉 Masukkan kode ini di WhatsApp: Perangkat Tertaut > Tautkan > Masuk dengan No HP`);
            } catch (err) {
                console.error('Gagal request pairing code:', err);
            }
        }, 3000);
    }

    // =================================================================
    // 🔄 KONEKSI
    // =================================================================
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[KONEKSI] Terputus. Reconnect: ${shouldReconnect}`);
            if (shouldReconnect) startBot();
            else console.log('[KONEKSI] Logout. Hapus folder auth_info_baileys untuk scan ulang.');
        } else if (connection === 'open') {
            console.log('[KONEKSI] ✅ Bot Terhubung!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // =================================================================
    // 📩 MESSAGE HANDLER (LOGIKA UTAMA)
    // =================================================================
    // SAYA TIDAK MENGUBAH LOGIKA DI BAWAH INI SESUAI PERMINTAAN
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        msgStore[msg.key.id] = msg; // ✅ Sekarang aman karena msgStore sudah didefinisikan

        const jid = msg.key.remoteJid;
        
        const body = msg.message.conversation || 
                    msg.message.extendedTextMessage?.text || 
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption || 
                    "";

        // === FITUR SPOTIFY SEARCH SELECTION ===
        const isNumber = /^[1-5]$/.test(body.trim());
        if (isNumber && global.db[jid] && global.db[jid].type === 'spotify_search') {
            const session = global.db[jid];
            const timeElapsed = Date.now() - session.timestamp;

            if (timeElapsed > 5 * 60 * 1000) {
                delete global.db[jid];
                return await sock.sendMessage(jid, { text: '❌ Sesi pencarian sudah habis. Silakan cari lagi.' }, { quoted: msg });
            }

            const selectedIndex = parseInt(body.trim()) - 1;
            const targetUrl = session.results[selectedIndex];
            const meta = session.metadata;

            if (targetUrl) {
                const ytCmd = commands.get('!yt'); // Menggunakan command YT untuk download
                if (ytCmd) {
                    const caption = `🎧 *Spotify Downloader*\n\n` +
                                    `📌 *Judul :* ${meta.title}\n` +
                                    `👤 *Artis :* ${meta.artists}\n` +
                                    `💿 *Album :* ${meta.album}\n` +
                                    `📅 *Rilis :* ${meta.releaseDate}\n` +
                                    `_Sabar ya, audio sedang didownload..._`;

                    try {
                        await sock.sendMessage(jid, { image: { url: meta.thumbnail }, caption: caption }, { quoted: msg });
                    } catch (err) {
                        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
                    }

                    // Fake message agar dibaca sebagai command !ytmp3
                    const fakeMsg = { ...msg, message: { conversation: '!ytmp3' } };
                    await ytCmd.execute(sock, fakeMsg, [targetUrl]);
                    
                    delete global.db[jid]; 
                    return; 
                }
            }
        }

        // === AUTO DOWNLOADER ===
        const urlRegex = /https?:\/\/(www\.)?(tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|threads\.net|pin\.it|pinterest\.com|open\.spotify\.com|spotify\.link)\/\S+/gi;
        const match = body.match(urlRegex);

        if (match && !body.startsWith('!')) {
            const url = match[0];
            console.log(`[AUTO-DL] Mendeteksi link: ${url}`);
            
            const allCmd = commands.get('!all'); 
            if (allCmd) {
                await allCmd.execute(sock, msg, [url]);
                return;
            }
        }
    
        // === COMMAND HANDLER ===
        const parts = body.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        const cmd = commands.get(commandName) || 
                    Array.from(commands.values()).find(c => c.aliases && c.aliases.includes(commandName));

        if (cmd) {
            try {
                await sock.sendPresenceUpdate('composing', jid);
                await cmd.execute(sock, msg, args);
            } catch (error) {
                console.error(error);
                await sock.sendMessage(jid, { text: 'Terjadi kesalahan pada sistem.' });
            }
        }
    });

    process.on('SIGINT', async () => {
        console.log('\nMematikan bot secara aman...');
        await sock.end(undefined);
        process.exit(0);
    });
}

startBot();