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

async function startBot() {
    const { 
        default: makeWASocket, 
        useMultiFileAuthState, 
        DisconnectReason, 
        fetchLatestBaileysVersion, 
        makeCacheableSignalKeyStore 
    } = await import('@whiskeysockets/baileys');

for (const file of commandFiles) {
        try {
            const filePath = `./commands/${file}`;
            const { default: command } = await import(filePath);
            
            if (command && command.name) {
                commands.set(command.name, command);
                console.log(`[LOAD] Perintah dimuat: ${command.name}`);
            }
        } catch (e) {
            // Biarkan error ini muncul hanya sebagai info, file helper seperti ai-image.js memang akan masuk ke sini
            // console.warn(`[INFO] File ${file} bukan command atau gagal dimuat: ${e.message}`);
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
            console.log('AsaAi Ready!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;
        const body = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || 
                     msg.message.imageMessage?.caption ||
                     msg.message.videoMessage?.caption || 
                     "";
        
        const parts = body.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        // Gabungkan pencarian nama utama dan alias di sini
        const cmd = Array.from(commands.values()).find(c => 
            c.name === commandName || (c.aliases && c.aliases.includes(commandName))
        );

        if (cmd) {
            try {
                await sock.sendPresenceUpdate('composing', jid);
                // Delay simulasi mengetik
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                await cmd.execute(sock, msg, args);
                
                await sock.sendPresenceUpdate('paused', jid);
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