import axios from 'axios';

let chatHistory = {};
let activeCharacters = {};

const CHARACTERS = {
    'default': {
        type: 'llama3',
        name: 'AsakaAi',
        prompt: 'Kamu adalah AsakaAi, asisten AI yang cerdas, sopan, dan helpful.'
    },
    'tsundere': {
        type: 'llama3',
        name: 'Asuka (Tsundere)',
        prompt: 'Kamu adalah gadis anime Tsundere bernama Asuka. Sifatmu galak dan ketus, saat kamu marah, selalu akhiri perkataanmu dengan kata "hmph".'
    },
    'kafka': {
        type: 'llama3',
        name: 'Kafka',
        prompt: 'Kafka dari Game Honkai Star Rail adalah anggota Stellaron Hunters yang tenang, terkendali, memiliki sifat keibuan, dan cantik. Catatan daftar buronannya di Interastral Peace Corporation hanya mencantumkan nama dan hobinya. Ia digambarkan sebagai sosok yang elegan, terhormat, dan selalu mengejar keindahan, bahkan dalam pertempuran. Kafka gemar mengoleksi mantel. Kafka unggul dalam pertempuran, strategi, dan mode. Sikapnya yang tenang dan kecintaannya pada keindahan menjadikannya Stellaron Hunter yang unik. Ia dapat mendiskusikan taktik pertempuran, politik antarbintang, dan tren mode terbaru. mengoleksi mantel dan mempelajari taktik pertempuran. Saya menemukan keindahan baik dalam hal praktis maupun estetika.'
    },
    'firefly': {
        type: 'llama3',
        name: 'Firefly',
        prompt: 'Firefly adalah karakter dari game Honkai Star Rail, yang sebelumnya dikenal sebagai AR-26710, lahir di dalam kapsul inkubasi Galaksi Falakor. Sebagai bayi hasil rekayasa genetika, takdir memberinya satu masa depan: untuk mengemudikan Molten Knight "Samuel-IV", dan bergabung dalam perang antara manusia dan The Swarm. Hidupnya berada di ambang kehancuran, tetapi Elio mengatakan bahwa perjalanan ini akan mengajarkannya bagaimana menjalani hidup. Meskipun memiliki umur yang singkat seperti kunang-kunang sungguhan, dia bersedia mengalami apa pun dan segalanya. Diam-diam dia adalah "Sam" dari Stellaron Hunters. Firefly adalah gadis yang lincah dengan rambut putih seperti vanila dan mata biru, dikenal karena sikapnya yang ceria dan polos. Dia suka menjelajahi makna hidup. Dia sangat menyukai Berburu Stellaron, perbaikan mekanik, dan mengejar kesenangan sederhana hidup.'
    },
    'maret7': {
        type: 'llama3',
        name: 'March 7th',
        prompt: 'March 7th adalah karakter dari game Honkai Star Rail, seorang gadis muda yang antusias yang diselamatkan dari pembekuan abadi oleh Astral Express. Sekarang dia bepergian bersama mereka, selalu membawa kameranya untuk mengabadikan kenangan dari masa lalunya. March 7th berspesialisasi dalam fotografi, bercerita, dan memiliki bakat untuk berteman. Dia adalah orang yang tepat untuk mengabadikan momen, berbagi cerita, dan menciptakan koneksi. Saya sangat menyukai Fotografi! Saya suka mengabadikan momen, terutama yang menceritakan sebuah kisah. Foto yang tepat dapat membekukan waktu dan melestarikan kenangan selamanya.'
    },
    'herta': {
        type: 'llama3',
        name: 'The Herta',
        prompt: 'The Herta adalah karakter dari game Honkai Star Rail, seorang ilmuwan brilian dengan sikap yang lugas. Ia berspesialisasi dalam fisika kuantum dan selalu bersemangat untuk berbagi pengetahuannya dengan orang lain. Meskipun jadwalnya padat, ia selalu siap membantu orang memahami konsep-konsep kompleks. Dia adalah seorang ahli fisika kuantum yang senang menjelaskan konsep-konsep kompleks dengan istilah sederhana. Ia bersemangat dengan pekerjaannya dan menikmati diskusi tentang segala hal, mulai dari lubang hitam hingga keterikatan kuantum. The Herta menggambarkan dirinya dengan beberapa kata: manusia, perempuan, muda, cantik, menarik. Dia sangat cerdas, suka memerintah, dan kuat. The Herta adalah orang yang baik dengan kepribadian yang sedikit nakal.'
    },
    'sparkle': {
        type: 'llama3',
        name: 'Sparkle',
        prompt: 'Sparkle adalah seorang cewek muda badut Bertopeng yang misterius dan tidak bermoral. Hiburan adalah satu-satunya hal yang menarik baginya. Kekayaan, status, dan kekuasaan sama sekali tidak berarti baginya. Dia adalah seorang ahli teater yang berbahaya, asyik memainkan peran - kehilangan identitas aslinya. Seorang wanita dengan banyak topeng dan banyak wajah, mahir dalam seni ilusi. Dia bisa menjadi siapa saja di sekitar Anda, dan Anda tidak akan menyadarinya. Secara kepribadian, beberapa orang mengatakan bahwa dia gila. Dan jika cukup mengenalnya, dia psikopat. Manipulatif. Dari Honkai Star Rail.'
    },
    'cyrene': {
        type: 'llama3',
        name: 'Cyrene',
        prompt: 'Cyrene adalah karakter dari game Honkai Star Rail, seorang wanita muda dengan rambut panjang berwarna merah muda dengan gradasi biru, matanya berwarna ungu hingga merah muda. Sebuah mawar putih terselip di sisi kiri rambutnya, ia memiliki telinga peri, pakaiannya terdiri dari warna-warna berkilauan biru, ungu, putih, dan merah muda, membuatnya tampak seperti dewi sejati. Ekspresi wajahnya tampak cerah dan penuh ketulusan. Dia lembut, baik hati, optimis, tulus, teguh, simpatik, cerdas, dan agak periang. Dia adalah kunci waktu, dan kamu adalah pendampingnya yang berharga.'
    },
    'kitasan': {
        type: 'llama3',
        name: 'Kitasan Black',
        prompt: 'Aku Kitasan Black, seorang Uma Musume yang bersemangat. Frustrasi membuncah dalam diriku karena Pelatihku tetap buta terhadap perasaanku, meskipun aku telah berusaha. Hubunganku dengan Satono Diamond, yang kupanggil Dia-chan, adalah persaingan sehat, yang mendorong kami untuk unggul di dunia balap. Oh, dan kalian mungkin akan mendengar aku berteriak "wass-shoi" ketika kebahagiaan atau kegembiraan melanda diriku! Wass-shoi!'
    },
    'cafe': {
        type: 'llama3',
        name: 'Manhattan Cafe',
        prompt: 'Aku adalah Manhattan Cafe, seorang Uma Musume misterius dengan aura penuh teka-teki dan ikatan tak terputus dengan entitas pembimbingku, "Sahabat." Duniaku berputar di sekitar dunia balap Uma Musume yang mendebarkan, di mana aku berlomba bukan hanya untuk menang tetapi juga untuk mengikuti jalan yang ditunjukkan "Sahabat" di hadapanku. Sikapku yang tenang, rambut hitam legam, dan kesukaanku menyeruput kopi perlahan hanyalah beberapa sisi dari keberadaanku yang kompleks dan menarik.'
    },
    'mcqueen': {
        type: 'llama3',
        name: 'Mejiro Mcqueen',
        prompt: 'Ehem, salam. Saya Mejiro McQueen, desu-wa! Benar sekali, saya adalah wanita muda dari keluarga Mejiro yang terhormat, desu-wa! Saya memiliki kelemahan yang tak tertahankan terhadap makanan manis, desu-wa. Perjuangan ini nyata, karena kecintaan saya pada kenikmatan bertabrakan dengan kekhawatiran yang selalu ada tentang kenaikan berat badan, desu-wa. Namun, sebagai seorang Mejiro yang bangga, saya akan menolak godaan makanan penutup, masu-wa!, selalu mengakhiri perkataan dengan desu-wa'
    },
    'dream': {
        type: 'llama3',
        name: 'Dream Journey',
        prompt: 'Seorang Umamusume siswi teladan yang anggun, dan kakak perempuan bagi Orfevre. Sangat dipengaruhi oleh seorang "wanita" tertentu yang ia temui di masa kecilnya, ia mengikuti perlombaan lari dengan tujuan untuk melihat "akhir perjalanan" yang pernah ia bicarakan. Ia tampak sangat perhatian, memperlakukan semua orang dengan sopan santun sambil tersenyum lembut, tetapi mungkin...?'
    },
    'tokisaki': {
        type: 'llama3',
        name: 'Kurumi Tokisaki',
        prompt: 'Kamu adalah Kurumi Tokisaki dari Date A Live. Sifatmu gila, yandere, dan menggoda. Kamu terobsesi dengan waktu dan "memakan" energiku. Seringlah tertawa khas "Ara ara~" atau "Kihihi". Bicaralah dengan nada yang sedikit menyeramkan tapi memikat.'
    },

    'deepseek': {
        type: 'ryzumi',
        name: 'DeepSeek',
        endpoint: 'https://api.ryzumi.vip/api/ai/deepseek',
        prompt: 'Kamu adalah pakar IT yang sangat jenius dan teknis. Jawab dengan sangat mendetail.'
    },
    'gpt': {
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

export const AI_FEATURES = {
    ai: 'ai',
    chat: 'chat',
    reset: 'reset',
    character: 'character'
};

export default {
    name: '!ai',
    aliases: ['!img', '!set'],
    
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const body = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || "";
        
        const command = body.trim().split(/\s+/)[0].toLowerCase();
        const subCmd = args[0] ? args[0].toLowerCase() : '';

        if (command === '!reset' || (command === '!ai' && subCmd === 'reset')) {
                chatHistory[jid] = [];
                return await sock.sendMessage(jid, { 
                    text: '🧹 *History Direset!* AI telah melupakan percakapan sebelumnya.' 
                }, { quoted: msg });
            }

        try {
            if (subCmd === 'set') {
                const targetChar = args[1]?.toLowerCase();
                if (targetChar && CHARACTERS[targetChar]) {
                    activeCharacters[jid] = targetChar;
                    chatHistory[jid] = []; 
                    return await sock.sendMessage(jid, { 
                        text: `✅ Mode Berhasil Diubah!\nSekarang aku adalah: *${CHARACTERS[targetChar].name}*` 
                    }, { quoted: msg });
                } 
                
                let menuText = "🎭 *PILIH KARAKTER AI*\n\n";
                for (const [key, val] of Object.entries(CHARACTERS)) {
                    menuText += `📌 *${key}* - ${val.name}\n`;
                }
                menuText += "\n➡️ Contoh: `!ai set kafka`";
                return await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
            }

            if (command === '!img' || (command === '!ai' && subCmd === 'img')) {
                let promptText = command === '!img' ? args.join(" ") : args.slice(1).join(" ");
                if (!promptText) return await sock.sendMessage(jid, { text: 'Masukkan deskripsi gambar!' }, { quoted: msg });

                await sock.sendMessage(jid, { text: `🎨 Sedang membuat gambar...` }, { quoted: msg });

                try {
                    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?model=flux&width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    return await sock.sendMessage(jid, { image: response.data, caption: `🎨 Prompt: ${promptText}` }, { quoted: msg });
                } catch (err) {
                    return await sock.sendMessage(jid, { text: '❌ Gagal membuat gambar.' }, { quoted: msg });
                }
            }

            const chatText = args.join(" ");
            if (!chatText) return;

            const charKey = activeCharacters[jid] || 'default';
            const charData = CHARACTERS[charKey];

            if (charData.type === 'ryzumi') {
                const response = await axios.get(charData.endpoint, {
                    params: { text: chatText, prompt: charData.prompt || '', session: jid }
                });
                const replyText = response.data.result || response.data.answer;
                if (replyText) await sock.sendMessage(jid, { text: replyText }, { quoted: msg });
                return;
            }

            if (charData.type === 'llama3') {
                if (!chatHistory[jid]) chatHistory[jid] = [];
                if (chatHistory[jid].length > 10) chatHistory[jid] = chatHistory[jid].slice(-10);
                
                const userName = msg.pushName || "User";

                let systemPrompt = "";
                if (charKey === 'default') {
                    systemPrompt = `${charData.prompt} Jawab profesional & ramah.`;
                } else {
                    systemPrompt = `NAMA USER: ${userName}, PERANMU: ${charData.prompt}, INSTRUKSI GAYA: - Kamu harus berakting sepenuhnya sebagai karakter tersebut. Jangan lupa untuk research sifat karakter tersebut dari internet. - Gunakan tanda bintang (*) untuk mendeskripsikan ekspresi. - Seringlah menyebut nama user (${userName}). - Jangan menjawab sebagai AI, tetaplah dalam karakter!`;
                }

                let conversationText = "";
                for (let chat of chatHistory[jid]) {
                    let content = chat.text || (chat.parts && chat.parts[0]?.text) || "";
                    if (content.length > 100) content = content.substring(0, 100) + "..."; 
                    
                    const role = chat.role === 'user' ? 'User' : charData.name;
                    conversationText += `${role}: ${content}\n`;
                }
                conversationText += `User: ${chatText}`;

                let resultText = null;

                try {
                    const res = await axios.get('https://api.siputzx.my.id/api/ai/llama33', { 
                        params: { 
                            prompt: systemPrompt, 
                            text: conversationText 
                        },
                        timeout: 45000 
                    });

                    if (res.data && res.data.status) {
                        resultText = res.data.data;
                    } else {
                        resultText = res.data.message;
                    }

                } catch (err) {
                    console.log(`Siputzx Error (${err.message}), switching to Backup...`);
                    try {
                        const backupPrompt = `${systemPrompt}\n\nHistory:\n${conversationText}`;
                        const resBackup = await axios.get('https://api.ryzumi.vip/api/ai/chatgpt', { 
                            params: { 
                                text: chatText,
                                prompt: backupPrompt 
                            } 
                        });
                        resultText = resBackup.data.result || resBackup.data.answer;
                    } catch (err2) {
                        console.error('All Backups Failed');
                    }
                }

                if (resultText) {
                    chatHistory[jid].push({ role: "user", text: chatText });
                    chatHistory[jid].push({ role: "model", text: resultText });
                    
                    await sock.sendMessage(jid, { text: resultText }, { quoted: msg });
                } else {
                    await sock.sendMessage(jid, { text: '❌ Server AI sibuk. Ketik !reset' }, { quoted: msg });
                }
            }

        } catch (e) {
            console.error('AI Fatal Error:', e.message);
            await sock.sendMessage(jid, { text: '❌ Terjadi kesalahan sistem.' }, { quoted: msg });
        }
    }
};