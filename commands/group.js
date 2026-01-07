// commands/group.js

export default {
    name: 'Group Admin',
    aliases: ['!hidetag', '!ht', '!kick', '!add', '!promote', '!demote', '!link', '!group'],
    
    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;

        // 1. CEK APAKAH INI GRUP?
        if (!jid.endsWith('@g.us')) {
            return await sock.sendMessage(jid, { text: '❌ Fitur ini khusus untuk Grup!' }, { quoted: m });
        }

        try {
            // Ambil Metadata Grup (Daftar member, admin, dll)
            const metadata = await sock.groupMetadata(jid);
            const groupName = metadata.subject;
            const participants = metadata.participants;
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            // Cek Posisi Admin
            const isAdmin = participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
            const isBotAdmin = participants.some(p => p.id === botNumber && (p.admin === 'admin' || p.admin === 'superadmin'));

            // Ambil Command (!kick, !hidetag, dll)
            const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
            const command = body.trim().split(/\s+/)[0].toLowerCase();
            const text = args.join(" ");

            // --- FILTER KEAMANAN ---
            if (!isAdmin) return await sock.sendMessage(jid, { text: '⚠️ *Akses Ditolak!* Lu bukan Admin.' }, { quoted: m });
            
            // --- FITUR HIDETAG (Tag Semua Member) ---
            if (command === '!hidetag' || command === '!ht') {
                if (!isBotAdmin) return await sock.sendMessage(jid, { text: '⚠️ Jadikan bot Admin dulu biar bisa tag all.' }, { quoted: m });
                
                const mentionIds = participants.map(p => p.id);
                const replyMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                
                // Jika me-reply gambar/sticker/video, kirim ulang media tersebut dengan tag all
                if (replyMsg) {
                    const type = Object.keys(replyMsg)[0];
                    const content = replyMsg[type];
                    
                    // Modifikasi viewOnce agar tetap bisa dilihat
                    if (content.viewOnce) content.viewOnce = false;

                    await sock.sendMessage(jid, { 
                        forward: m, 
                        mentions: mentionIds 
                    }, { quoted: m }); // Forwarding pesan yang direply
                } else {
                    // Jika cuma teks
                    await sock.sendMessage(jid, { 
                        text: text || "📢 *PENGUMUMAN GRUP*", 
                        mentions: mentionIds 
                    }, { quoted: m });
                }
                return;
            }

            // --- FITUR LINK GRUP ---
            if (command === '!link') {
                if (!isBotAdmin) return await sock.sendMessage(jid, { text: '⚠️ Bot harus Admin untuk ambil link.' }, { quoted: m });
                const code = await sock.groupInviteCode(jid);
                return await sock.sendMessage(jid, { text: `🔗 *Link Grup ${groupName}:*\nhttps://chat.whatsapp.com/${code}` }, { quoted: m });
            }

            // --- FITUR GROUP SETTING (Open/Close) ---
            if (command === '!group') {
                if (!isBotAdmin) return await sock.sendMessage(jid, { text: '⚠️ Bot harus Admin.' }, { quoted: m });
                if (args[0] === 'open' || args[0] === 'buka') {
                    await sock.groupSettingUpdate(jid, 'not_announcement');
                    return await sock.sendMessage(jid, { text: '🔓 Grup telah *DIBUKA*. Semua member bisa chat.' });
                } else if (args[0] === 'close' || args[0] === 'tutup') {
                    await sock.groupSettingUpdate(jid, 'announcement');
                    return await sock.sendMessage(jid, { text: '🔒 Grup telah *DITUTUP*. Hanya admin yang bisa chat.' });
                } else {
                    return await sock.sendMessage(jid, { text: 'Format: *!group open* atau *!group close*' }, { quoted: m });
                }
            }

            // --- LOGIKA TARGET USER (Untuk Kick/Promote/Demote) ---
            // Target bisa dari: Reply pesan ATAU Mention @user
            let targetUser = m.message?.extendedTextMessage?.contextInfo?.participant; // Dari Reply
            if (!targetUser && m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                targetUser = m.message.extendedTextMessage.contextInfo.mentionedJid[0]; // Dari Mention
            }

            // --- FITUR KICK, PROMOTE, DEMOTE ---
            if (['!kick', '!promote', '!demote', '!add'].includes(command)) {
                if (!isBotAdmin) return await sock.sendMessage(jid, { text: '⚠️ Gagal. Bot bukan Admin.' }, { quoted: m });
                if (!targetUser) return await sock.sendMessage(jid, { text: '⚠️ Reply chat target atau tag orangnya (@user).' }, { quoted: m });

                if (command === '!kick') {
                    await sock.groupParticipantsUpdate(jid, [targetUser], 'remove');
                    await sock.sendMessage(jid, { text: `👋 Sayonara @${targetUser.split('@')[0]}!`, mentions: [targetUser] });
                } 
                else if (command === '!promote') {
                    await sock.groupParticipantsUpdate(jid, [targetUser], 'promote');
                    await sock.sendMessage(jid, { text: `👑 Selamat! @${targetUser.split('@')[0]} sekarang jadi Admin.`, mentions: [targetUser] });
                } 
                else if (command === '!demote') {
                    await sock.groupParticipantsUpdate(jid, [targetUser], 'demote');
                    await sock.sendMessage(jid, { text: `⬇️ Maaf, @${targetUser.split('@')[0]} diturunkan jadi member biasa.`, mentions: [targetUser] });
                }
                else if (command === '!add') {
                    // Note: !add sering gagal karena privasi user (Settings > Groups > My Contacts)
                    try {
                        const res = await sock.groupParticipantsUpdate(jid, [targetUser], 'add');
                        await sock.sendMessage(jid, { text: `✅ Berhasil menambahkan @${targetUser.split('@')[0]}`, mentions: [targetUser] });
                    } catch (e) {
                        await sock.sendMessage(jid, { text: '❌ Gagal menambahkan. User mungkin memprivasi siapa yang bisa menambahkan ke grup.' });
                    }
                }
            }

        } catch (err) {
            console.error('Group Cmd Error:', err);
            await sock.sendMessage(jid, { text: '❌ Terjadi kesalahan pada fitur grup.' }, { quoted: m });
        }
    }
};