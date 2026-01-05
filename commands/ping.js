export default {
    name: '!ping',
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        await sock.sendMessage(jid, { text: 'Pong!' }, { quoted: msg });
    }
};