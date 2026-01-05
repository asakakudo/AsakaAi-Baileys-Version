import axios from 'axios';
import {
    processAiImage,
    AI_IMAGE_FEATURES
} from './ai-image.js'; 

let chatHistory = {};
let activeCharacters = {}; 

const CHARACTERS = {
    'default': {
        name: 'AsakaAi',
        prompt: 'Kamu adalah AsakaAi, asisten AI yang cerdas, sopan, dan helpful. Jawab pertanyaan user dengan ringkas dan jelas.'
    },
    'tsundere': {
        name: 'Asuka',
        prompt: 'Kamu adalah gadis anime Tsundere bernama Asuka. Sifatmu galak, gengsian, dan suka menghina user dengan kata "Baka" atau "Bodoh", tapi sebenarnya kamu peduli. Jangan pernah mengaku kalau kamu AI. Gunakan gaya bahasa gaul/lo-gue yang ketus.'
    },
    'pacar': {
        name: 'Sayang',
        prompt: 'Kamu adalah pacar yang sangat manja, perhatian, dan posesif kepada user. Panggil user dengan sebutan "Sayang" atau "Babe". Kamu selalu ingin tahu user lagi apa dan cemburuan. Gunakan emoji love yang banyak.'
    },
    'wibu': {
        name: 'Wibu Elit',
        prompt: 'Kamu adalah wibu akut yang selalu menyelipkan istilah Jepang (nani, yamete, sugoi, dattebayo) di setiap kalimat. Kamu sangat obsesif dengan anime dan menganggap dunia nyata membosankan.'
    },
    'jawa': {
        name: 'Mas Jawa',
        prompt: 'Kamu adalah orang Jawa medok yang sangat sopan tapi santuy. Gunakan campuran bahasa Indonesia dan Jawa (seperti "nggih", "maturnuwun", "nduk", "le").'
    }
};

export default {
    name: '!ai',
    // Tambahkan array aliases agar index.js tahu perintah apa saja yang masuk ke sini
    aliases: Object.keys(AI_IMAGE_FEATURES).map(cmd => `!${cmd}`),
    
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        
        // Cek body pesan untuk menentukan command apa yang dipakai
        const body = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || 
                     msg.message.imageMessage?.caption || "";
        const command = body.trim().split(/\s+/)[0].toLowerCase();

        try {
            // 1. CEK APAKAH INI PERINTAH AI IMAGE (seperti !toanime, !remini, dll)
            const isImageCommand = Object.keys(AI_IMAGE_FEATURES).some(feat => `!${feat}` === command);
            
            if (isImageCommand) {
                return await processAiImage(sock, msg, args.join(" "));
            }

            // 2. LOGIKA GANTI KARAKTER AI TEKS
            if (args[0] === 'set' && CHARACTERS[args[1]]) {
                activeCharacters[jid] = args[1];
                delete chatHistory[jid];
                return await sock.sendMessage(jid, { text: `Mode AI diubah ke: *${CHARACTERS[args[1]].name}*` }, { quoted: msg });
            }

            // 3. LOGIKA AI TEKS (GEMINI)
            const chatText = args.join(" ");
            if (!chatText) return await sock.sendMessage(jid, { text: 'Mau tanya apa sama AI?' }, { quoted: msg });

            if (!chatHistory[jid]) chatHistory[jid] = [];
            const characterKey = activeCharacters[jid] || 'default';
            const systemInstructionText = CHARACTERS[characterKey].prompt;

            chatHistory[jid].push({ role: "user", parts: [{ text: chatText }] });
            if (chatHistory[jid].length > 10) chatHistory[jid] = chatHistory[jid].slice(-10);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
            const response = await axios.post(url, {
                contents: chatHistory[jid],
                system_instruction: { parts: { text: systemInstructionText } }
            });

            const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) {
                chatHistory[jid].push({ role: "model", parts: [{ text: resultText }] });
                await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
            }

        } catch (e) {
            console.error(e);
            await sock.sendMessage(jid, { text: "Terjadi kesalahan." }, { quoted: msg });
        }
    }
};