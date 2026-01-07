import 'dotenv/config';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import qrcode from 'qrcode-terminal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = new Map();
const commandPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));

global.db = global.db || {};
const msgStore = {};

async function startBot() {
    const { 
        default: makeWASocket, 
        useMultiFileAuthState, 
        DisconnectReason, 
        fetchLatestBaileysVersion, 
        makeCacheableSignalKeyStore 
    } = await import('@whiskeysockets/baileys');

    // Load semua command dari folder /commands
    for (const file of commandFiles) {
        try {
            const filePath = `./commands/${file}`;
            const { default: command } = await import(filePath);
            
            if (command && command.name) {
                commands.set(command.name, command);
                // Daftarkan aliases juga ke map agar pencarian lebih cepat
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => commands.set(alias, command));
                }
                console.log(`[LOAD] Perintah dimuat: ${command.name}`);
            }
        } catch (e) {
            console.warn(`[SKIP] Gagal memuat command ${file}: ${e.message}`);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger: pino({ level: 'silent' }),
        browser: ['AsakaAi', 'Safari', '3.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('SCAN QR CODE DI BAWAH INI:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus, mencoba menyambung kembali:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('AsakaAi Ready!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        msgStore[msg.key.id] = msg; // Simpan untuk referensi

        const jid = msg.key.remoteJid;
        
        // === PERBAIKAN DI SINI ===
        // Menambahkan videoMessage?.caption agar GIF/Video dengan caption terbaca
        const body = msg.message.conversation || 
                    msg.message.extendedTextMessage?.text || 
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption || 
                    "";

        // --- LOGIKA DETEKSI BALASAN ANGKA (1-5) ---
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
                const ytCmd = commands.get('!yt');
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

                    const fakeMsg = { ...msg, message: { conversation: '!ytmp3' } };
                    await ytCmd.execute(sock, fakeMsg, [targetUrl]);
                    
                    delete global.db[jid]; 
                    return; 
                }
            }
        }

        // 2. LOGIKA AUTO-DOWNLOAD LINK
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
        
        // 3. LOGIKA COMMAND BIASA
        const parts = body.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        // Pencarian command (Support Alias)
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