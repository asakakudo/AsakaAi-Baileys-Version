export default {
    name: 'Group Admin',
    aliases: ['!hidetag', '!ht', '!kick', '!add', '!promote', '!demote', '!link', '!group'],

    execute: async (sock, m, args) => {
        const jid = m.key.remoteJid;

        if (!jid.endsWith('@g.us')) {
            return await sock.sendMessage(
                jid,
                { text: '❌ Fitur ini khusus untuk Grup!' },
                { quoted: m }
            );
        }

        try {
            const metadata = await sock.groupMetadata(jid);
            const groupName = metadata.subject;
            const participants = metadata.participants;

            const normalizeId = (id = '') =>
                id.split('@')[0].split(':')[0];

            const senderRaw = m.key.participant;
            const senderId = normalizeId(senderRaw);

            const rawBotLid = sock.authState?.creds?.me?.lid;
            const botId = normalizeId(rawBotLid);

            const adminList = participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => normalizeId(p.id));

            const isAdmin = adminList.includes(senderId);

            const isBotAdmin = participants.some(p =>
                normalizeId(p.id) === botId &&
                (p.admin === 'admin' || p.admin === 'superadmin')
            );

            if (!isAdmin) {
                return await sock.sendMessage(
                    jid,
                    { text: '⚠️ Akses ditolak. Kamu bukan admin grup.' },
                    { quoted: m }
                );
            }

            const body =
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                '';

            const command = body.trim().split(/\s+/)[0].toLowerCase();
            const text = args.join(' ');

            if (command === '!hidetag' || command === '!ht') {
                if (!isBotAdmin) {
                    return await sock.sendMessage(
                        jid,
                        { text: '⚠️ Bot belum jadi admin.' },
                        { quoted: m }
                    );
                }

                const mentionIds = participants.map(p => p.id);

                await sock.sendMessage(
                    jid,
                    {
                        text: text || '📢 *PENGUMUMAN GRUP*',
                        mentions: mentionIds
                    },
                    { quoted: m }
                );
                return;
            }

            if (command === '!link') {
                if (!isBotAdmin) {
                    return await sock.sendMessage(
                        jid,
                        { text: '⚠️ Bot harus admin.' },
                        { quoted: m }
                    );
                }

                const code = await sock.groupInviteCode(jid);
                return await sock.sendMessage(
                    jid,
                    {
                        text: `🔗 *Link Grup ${groupName}:*\nhttps://chat.whatsapp.com/${code}`
                    },
                    { quoted: m }
                );
            }

            if (command === '!group') {
                if (!isBotAdmin) {
                    return await sock.sendMessage(
                        jid,
                        { text: '⚠️ Bot harus admin.' },
                        { quoted: m }
                    );
                }

                if (args[0] === 'open' || args[0] === 'buka') {
                    await sock.groupSettingUpdate(jid, 'not_announcement');
                    return await sock.sendMessage(jid, { text: '🔓 Grup dibuka.' });
                }

                if (args[0] === 'close' || args[0] === 'tutup') {
                    await sock.groupSettingUpdate(jid, 'announcement');
                    return await sock.sendMessage(jid, { text: '🔒 Grup ditutup.' });
                }

                return await sock.sendMessage(
                    jid,
                    { text: 'Format: !group open / close' },
                    { quoted: m }
                );
            }

            let targetUser =
                m.message?.extendedTextMessage?.contextInfo?.participant ||
                m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

            if (['!kick', '!promote', '!demote', '!add'].includes(command)) {
                if (!isBotAdmin) {
                    return await sock.sendMessage(
                        jid,
                        { text: '⚠️ Bot harus admin.' },
                        { quoted: m }
                    );
                }

                if (!targetUser && command !== '!add') {
                    return await sock.sendMessage(
                        jid,
                        { text: '⚠️ Reply atau tag target.' },
                        { quoted: m }
                    );
                }

                if (command === '!add' && args[0]) {
                    targetUser =
                        args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                }

                if (command === '!kick') {
                    await sock.groupParticipantsUpdate(jid, [targetUser], 'remove');
                    await sock.sendMessage(jid, { text: `👋 Sayonara!`, mentions: [targetUser] });
                } 
                else if (command === '!promote') {
                    await sock.groupParticipantsUpdate(jid, [targetUser], 'promote');
                    await sock.sendMessage(jid, { text: `👑 User sekarang Admin.`, mentions: [targetUser] });
                } 
                else if (command === '!demote') {
                    await sock.groupParticipantsUpdate(jid, [targetUser], 'demote');
                    await sock.sendMessage(jid, { text: `⬇️ User turun jabatan.`, mentions: [targetUser] });
                }
                else if (command === '!add') {
                    try {
                        await sock.groupParticipantsUpdate(jid, [targetUser], 'add');
                        await sock.sendMessage(jid, { text: `✅ Berhasil menambahkan.`, mentions: [targetUser] });
                    } catch (e) {
                        await sock.sendMessage(jid, { text: '❌ Gagal menambahkan (Cek Privasi User).' });
                    }
                }

                return;
            }

        } catch (err) {
            console.error('[GROUP ERROR]', err);
            await sock.sendMessage(
                jid,
                { text: '❌ Terjadi error pada fitur grup.' },
                { quoted: m }
            );
        }
    }
};
