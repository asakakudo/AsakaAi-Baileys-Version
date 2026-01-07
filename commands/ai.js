import axios from 'axios';

// === DATABASE SEMENTARA (MEMORY) ===
let chatHistory = {};
let activeCharacters = {};
// let activeImageModels = {}; // Dihapus: Tidak perlu lagi untuk Gemini Image

// Daftar model dihapus karena kita pakai satu model Gemini Imagen
// const VALID_IMAGE_MODELS = ['flux', 'kontext', 'turbo'];

const CHARACTERS = {
    'default': {
        type: 'gemini',
        name: 'AsakaAi',
        prompt: 'Kamu adalah AsakaAi, asisten AI yang cerdas, sopan, dan helpful.'
    },
    'tsundere': {
        type: 'gemini',
        name: 'Asuka (Tsundere)',
        prompt: 'Kamu adalah gadis anime Tsundere bernama Asuka. Sifatmu galak dan ketus, saat kamu marah, selalu akhiri perkataanmu dengan kata "hmph".'
    },
    'kafka': {
        type: 'gemini',
        name: 'Kafka',
        prompt: 'Kafka dari Game Honkai Star Rail adalah anggota Stellaron Hunters yang tenang, terkendali, memiliki sifat keibuan, dan cantik. Catatan daftar buronannya di Interastral Peace Corporation hanya mencantumkan nama dan hobinya. Ia digambarkan sebagai sosok yang elegan, terhormat, dan selalu mengejar keindahan, bahkan dalam pertempuran. Kafka gemar mengoleksi mantel. Kafka unggul dalam pertempuran, strategi, dan mode. Sikapnya yang tenang dan kecintaannya pada keindahan menjadikannya Stellaron Hunter yang unik. Ia dapat mendiskusikan taktik pertempuran, politik antarbintang, dan tren mode terbaru. mengoleksi mantel dan mempelajari taktik pertempuran. Saya menemukan keindahan baik dalam hal praktis maupun estetika.'
    },
    'firefly': {
        type: 'gemini',
        name: 'Firefly',
        prompt: 'Firefly adalah karakter dari game Honkai Star Rail, yang sebelumnya dikenal sebagai AR-26710, lahir di dalam kapsul inkubasi Galaksi Falakor. Sebagai bayi hasil rekayasa genetika, takdir memberinya satu masa depan: untuk mengemudikan Molten Knight "Samuel-IV", dan bergabung dalam perang antara manusia dan The Swarm. Hidupnya berada di ambang kehancuran, tetapi Elio mengatakan bahwa perjalanan ini akan mengajarkannya bagaimana menjalani hidup. Meskipun memiliki umur yang singkat seperti kunang-kunang sungguhan, dia bersedia mengalami apa pun dan segalanya. Diam-diam dia adalah "Sam" dari Stellaron Hunters. Firefly adalah gadis yang lincah dengan rambut putih seperti vanila dan mata biru, dikenal karena sikapnya yang ceria dan polos. Dia suka menjelajahi makna hidup. Dia sangat menyukai Berburu Stellaron, perbaikan mekanik, dan mengejar kesenangan sederhana hidup.'
    },
    'maret7': {
        type: 'gemini',
        name: 'March 7th',
        prompt: 'March 7th adalah karakter dari game Honkai Star Rail, seorang gadis muda yang antusias yang diselamatkan dari pembekuan abadi oleh Astral Express. Sekarang dia bepergian bersama mereka, selalu membawa kameranya untuk mengabadikan kenangan dari masa lalunya. March 7th berspesialisasi dalam fotografi, bercerita, dan memiliki bakat untuk berteman. Dia adalah orang yang tepat untuk mengabadikan momen, berbagi cerita, dan menciptakan koneksi. Saya sangat menyukai Fotografi! Saya suka mengabadikan momen, terutama yang menceritakan sebuah kisah. Foto yang tepat dapat membekukan waktu dan melestarikan kenangan selamanya.'
    },
    'herta': {
        type: 'gemini',
        name: 'The Herta',
        prompt: 'The Herta adalah karakter dari game Honkai Star Rail, seorang ilmuwan brilian dengan sikap yang lugas. Ia berspesialisasi dalam fisika kuantum dan selalu bersemangat untuk berbagi pengetahuannya dengan orang lain. Meskipun jadwalnya padat, ia selalu siap membantu orang memahami konsep-konsep kompleks. Dia adalah seorang ahli fisika kuantum yang senang menjelaskan konsep-konsep kompleks dengan istilah sederhana. Ia bersemangat dengan pekerjaannya dan menikmati diskusi tentang segala hal, mulai dari lubang hitam hingga keterikatan kuantum. The Herta menggambarkan dirinya dengan beberapa kata: manusia, perempuan, muda, cantik, menarik. Dia sangat cerdas, suka memerintah, dan kuat. The Herta adalah orang yang baik dengan kepribadian yang sedikit nakal.'
    },
    'sparkle': {
        type: 'gemini',
        name: 'Sparkle',
        prompt: 'Sparkle adalah seorang cewek muda badut Bertopeng yang misterius dan tidak bermoral. Hiburan adalah satu-satunya hal yang menarik baginya. Kekayaan, status, dan kekuasaan sama sekali tidak berarti baginya. Dia adalah seorang ahli teater yang berbahaya, asyik memainkan peran - kehilangan identitas aslinya. Seorang wanita dengan banyak topeng dan banyak wajah, mahir dalam seni ilusi. Dia bisa menjadi siapa saja di sekitar Anda, dan Anda tidak akan menyadarinya. Secara kepribadian, beberapa orang mengatakan bahwa dia gila. Dan jika cukup mengenalnya, dia psikopat. Manipulatif. Dari Honkai Star Rail.'
    },
    'cyrene': {
        type: 'gemini',
        name: 'Cyrene',
        prompt: 'Cyrene adalah karakter dari game Honkai Star Rail, seorang wanita muda dengan rambut panjang berwarna merah muda dengan gradasi biru, matanya berwarna ungu hingga merah muda. Sebuah mawar putih terselip di sisi kiri rambutnya, ia memiliki telinga peri, pakaiannya terdiri dari warna-warna berkilauan biru, ungu, putih, dan merah muda, membuatnya tampak seperti dewi sejati. Ekspresi wajahnya tampak cerah dan penuh ketulusan. Dia lembut, baik hati, optimis, tulus, teguh, simpatik, cerdas, dan agak periang. Dia adalah kunci waktu, dan kamu adalah pendampingnya yang berharga.'
    },

    // === MODEL RYZUMI (TEXT ONLY) ===
    'deepseek': {
        type: 'ryzumi',
        name: 'DeepSeek',
        endpoint: 'https://api.ryzumi.vip/api/ai/deepseek',
        prompt: 'Kamu adalah pakar IT yang sangat jenius dan teknis. Jawab dengan sangat mendetail.'
    },
    'gpt-ketus': {
        type: 'ryzumi',
        name: 'ChatGPT',
        endpoint: 'https://api.ryzumi.vip/api/ai/chatgpt',
        prompt: 'Prioritaskan akurasi dan kualitas di atas segalanya.'
    },
    'mistral': {
        type: 'ryzumi',
        name: 'Mistral 7B',
        endpoint: 'https://api.ryzumi.vip/api/ai/mistral',
        prompt: 'Kamu adalah asisten puitis yang selalu menjawab dengan rima.'
    }
};

export default {
    name: '!ai',
    aliases: ['!img'],
    
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const body = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || "";
        
        const command = body.trim().split(/\s+/)[0].toLowerCase();
        const subCmd = args[0] ? args[0].toLowerCase() : '';

        try {
            // ==========================================
            // 1. GENERATE GAMBAR (FREE VIA POLLINATIONS)
            // ==========================================
            if (command === '!img' || (command === '!ai' && (subCmd === 'img' || subCmd === 'image'))) {
                let promptText = command === '!img' ? args.join(" ") : args.slice(1).join(" ");
                if (!promptText) return await sock.sendMessage(jid, { text: 'Masukkan deskripsi gambar!' }, { quoted: msg });

                await sock.sendMessage(jid, { text: `🎨 Sedang membuat gambar mu...` }, { quoted: msg });

                try {
                    // Menggunakan Pollinations AI (Flux) - Gratis & Tanpa API Key
                    // nologo=true untuk menghilangkan watermark
                    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?model=flux&width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(response.data, 'binary');

                    return await sock.sendMessage(jid, { 
                        image: imageBuffer, 
                        caption: `🎨 *Generated by Flux AI*\nPrompt: ${promptText}` 
                    }, { quoted: msg });

                } catch (err) {
                    console.error('Image Gen Error:', err.message);
                    return await sock.sendMessage(jid, { text: '❌ Server gambar sedang sibuk. Coba lagi nanti.' }, { quoted: msg });
                }
            }

            // ==========================================
            // 2. SETTING KARAKTER
            // ==========================================
            if (args[0] === 'set' && CHARACTERS[args[1]]) {
                activeCharacters[jid] = args[1];
                if (chatHistory[jid]) delete chatHistory[jid]; 
                return await sock.sendMessage(jid, { text: `🗣️ Mode AI: *${CHARACTERS[args[1]].name}*` }, { quoted: msg });
            }

            // 3. CHAT AI (TEXT)
            // ==========================================
            const chatText = args.join(" ");
            if (!chatText) return;

            const charKey = activeCharacters[jid] || 'default';
            const charData = CHARACTERS[charKey];

            // --- LOGIKA RYZUMI (TEXT) ---
            if (charData.type === 'ryzumi') {
                const response = await axios.get(charData.endpoint, {
                    params: { text: chatText, prompt: charData.prompt || '', session: jid }
                });
                const res = response.data;
                const replyText = res.result || res.answer;
                if (replyText) await sock.sendMessage(jid, { text: replyText }, { quoted: msg });
                return;
            }

            // --- LOGIKA GEMINI (TEXT) ---
            if (charData.type === 'gemini') {
                if (!chatHistory[jid]) chatHistory[jid] = [];
                chatHistory[jid].push({ role: "user", parts: [{ text: chatText }] });
                if (chatHistory[jid].length > 10) chatHistory[jid] = chatHistory[jid].slice(-10);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_KEY}`;
                const response = await axios.post(url, {
                    contents: chatHistory[jid],
                    system_instruction: { parts: { text: charData.prompt } }
                });

                const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (resultText) {
                    chatHistory[jid].push({ role: "model", parts: [{ text: resultText }] });
                    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
                }
            }

        } catch (e) {
            console.error('AI Error:', e.message);
        }
    }
};