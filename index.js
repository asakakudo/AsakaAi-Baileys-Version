import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';

const usePairingCode = true; 
const phoneNumber = '6285129891550';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commands = new Map();
const commandPath = path.join(__dirname, 'commands');

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

global.db = global.db || {};
const msgStore = {}; 

const sleep = (min, max) => {
    const ms = max ? Math.floor(Math.random() * (max - min + 1)) + min : min;
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function startBot() {
    const BOOT_TIME = Math.floor(Date.now() / 1000);

    const { 
        default: makeWASocket, 
        useMultiFileAuthState, 
        DisconnectReason, 
        fetchLatestBaileysVersion, 
        makeCacheableSignalKeyStore 
    } = await import('@whiskeysockets/baileys');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[SYSTEM] Memulai Bot v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !usePairingCode,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        defaultQueryTimeoutMs: undefined,
    });

    if (usePairingCode && !sock.authState.creds.registered) {
        if (!phoneNumber) process.exit(1);
        console.log(`⏳ Menunggu kode pairing untuk ${phoneNumber}...`);
        await sleep(3000); 
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n================================`);
            console.log(`💬 KODE PAIRING ANDA:`);
            console.log(`   ${code}`);
            console.log(`================================\n`);
        } catch (err) {
            console.error('Gagal request pairing code:', err);
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[KONEKSI] Terputus. Reconnect: ${shouldReconnect}`);
            if (shouldReconnect) {
                await sleep(2000); 
                startBot();
            } else {
                console.log('[KONEKSI] Logout. Hapus folder auth.');
            }
        } else if (connection === 'open') {
            console.log('[KONEKSI] ✅ Bot Terhubung!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const msgTime = msg.messageTimestamp;
        if (msgTime && msgTime < BOOT_TIME) {
            console.log(`[IGNORE] Skip pesan lama: ${msgTime}`);
            return;
        }
        msgStore[msg.key.id] = msg; 

        const jid = msg.key.remoteJid;
        const body = msg.message.conversation || 
                    msg.message.extendedTextMessage?.text || 
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption || "";

        const isNumber = /^[1-5]$/.test(body.trim());
        if (isNumber && global.db[jid] && global.db[jid].type === 'spotify_search') {
            const session = global.db[jid];
            if ((Date.now() - session.timestamp) > 5 * 60 * 1000) {
                delete global.db[jid];
                return await sock.sendMessage(jid, { text: '❌ Sesi pencarian sudah habis.' }, { quoted: msg });
            }

            const selectedIndex = parseInt(body.trim()) - 1;
            const targetUrl = session.results[selectedIndex];
            const meta = session.metadata;

            if (targetUrl) {
                const ytCmd = commands.get('!yt');
                if (ytCmd) {
                    await sock.readMessages([msg.key]);
                    await sock.sendPresenceUpdate('composing', jid);
                    
                    const caption = `🎧 *Spotify Downloader*\n\n` +
                                    `📌 *Judul :* ${meta.title}\n` +
                                    `👤 *Artis :* ${meta.artists}\n` +
                                    `💿 *Album :* ${meta.album}\n` +
                                    `📅 *Rilis :* ${meta.releaseDate}\n`;
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

        const urlRegex = /https?:\/\/(www\.)?(tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|threads\.net|pin\.it|pinterest\.com|open\.spotify\.com|spotify\.link)\/\S+/gi;
        const match = body.match(urlRegex);

        if (match && !body.startsWith('!')) {
            const url = match[0];
            console.log(`[AUTO-DL] Mendeteksi link: ${url}`);
            
            const allCmd = commands.get('!all'); 
            if (allCmd) {
                await sleep(1000, 2000); 
                await sock.readMessages([msg.key]); 
                
                await sleep(500, 1000);
                await sock.sendPresenceUpdate('composing', jid); 
                await sleep(1500, 3000); 

                await allCmd.execute(sock, msg, [url]);
                return;
            }
        }
    
        const parts = body.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        const cmd = commands.get(commandName) || 
                    Array.from(commands.values()).find(c => c.aliases && c.aliases.includes(commandName));

        if (cmd) {
            try {

                await sleep(1000, 2000); 
                await sock.readMessages([msg.key]); 

                await sleep(1000, 2000);
                await sock.sendPresenceUpdate('composing', jid);
                await sleep(2000, 4000);

                await cmd.execute(sock, msg, args);
            } catch (error) {
                console.error(error);
                await sock.sendMessage(jid, { text: 'Terjadi kesalahan pada sistem.' });
            }
        }
    });
}

startBot();