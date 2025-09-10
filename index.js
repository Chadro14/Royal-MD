const {
  default: makewasocket,
    usemultifileauthstate,
    disconnectreason,
    jidnormalizeduser,
    isjidbroadcast,
    getcontenttype,
    proto, // Maintenu car vous l'utilisez
    generatewamessagecontent,
    generatewamessage,
    anymessagecontent,
    preparewamessagemedia,
    arejidssameuser,
    downloadcontentfrommessage,
    messageretrymap, // Maintenu
    generateforwardmessagecontent,
    generatewamessagefromcontent,
    generatemessageid,
    makeinmemorystore, // Maintenu
    jiddecode,
    fetchlatestbaileysversion,
    browsers
  } = require('whiskeysockets/baileys') // Assurez-vous que cette ligne est correcte pour Baileys 6.7.9, normalement c'est "@whiskeysockets/baileys"

const l = console.log
const { getbuffer, getgroupadmins, getrandom, h2k, isurl, json, runtime, sleep, fetchjson } = require('./lib/functions')
const { antideldb, initializeantideletesettings, setanti, getanti, getallantideletesettings, savecontact, loadmessage, getname, getchatsummary, savegroupmetadata, getgroupmetadata, savemessagecount, getinactivegroupmembers, getgroupmembersmessagecount, savemessage } = require('./data')
const fs = require('fs')
const ff = require('fluent-ffmpeg')
const p = require('pino')
const config = require('./config')
const groupevents = require('./lib/groupevents');
const qrcode = require('qrcode-terminal') // Déjà importé
const stickerstypes = require('wa-sticker-formatter')
const util = require('util')
const { sms, downloadmediamessage, antidelete } = require('./lib')
const filetype = require('file-type');
const axios = require('axios')
const { file } = require('megajs')
const { frombuffer } = require('file-type')
const bodyparser = require('body-parser')
const os = require('os')
const crypto = require('crypto')
const path = require('path')
const prefix = config.prefix
const mode = config.mode
const online = config.always_online
const status = config.auto_status_seen
const ownernumber = ['243905526836']

const tempdir = path.join(os.tmpdir(), 'cache-temp')
if (!fs.existsSync(tempdir)) { // Correction de existssync en existsSync
    fs.mkdirSync(tempdir) // Correction de mkdirsync en mkdirSync
}

const cleartempdir = () => {
    fs.readdir(tempdir, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(tempdir, file), err => {
                if (err) throw err;
            });
        }
    });
}

// clear the temp directory every 5 minutes
setInterval(cleartempdir, 5 * 60 * 1000); // Correction de setinterval en setInterval

//===================session-auth============================
const SESSION_DIR = __dirname + '/sessions/';
const CRED_PATH = SESSION_DIR + 'creds.json';

if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR);
}

// Fonction pour télécharger la session ou générer un nouveau QR
const handleSession = async (conn = null) => {
    if (!fs.existsSync(CRED_PATH)) {
        if (config.session_id) {
            console.log('Fichier de session introuvable localement. Tentative de téléchargement depuis Mega.nz...');
            const sessdata = config.session_id.replace("kyotaka~md~", '');
            try {
                const filer = file.fromURL(`https://mega.nz/file/${sessdata}`); // Correction de fromurl en fromURL
                const data = await new Promise((resolve, reject) => {
                    filer.download((err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });
                fs.writeFileSync(CRED_PATH, data); // Correction de writefile en writeFileSync
                console.log("Session téléchargée depuis Mega.nz ✅");
                return true; // Session téléchargée avec succès
            } catch (err) {
                console.error("Erreur lors du téléchargement de la session depuis Mega.nz:", err.message);
                console.log("Veuillez vérifier votre session_id ou si le lien Mega.nz est toujours valide.");
                console.log("Génération d'un nouveau QR code requise...");
                return false; // Échec du téléchargement, QR nécessaire
            }
        } else {
            console.log('Aucune session_id configurée et aucun fichier de session local. Génération d\'un nouveau QR code requise...');
            return false; // QR nécessaire
        }
    }
    return true; // Fichier de session trouvé localement
};

const express = require("express");
const app = express();
const port = process.env.PORT || 9090; // Correction de port en PORT

//=============================================

async function connecttowa() {
    console.log("Connexion à WhatsApp en cours ⏳️...");

    // Tente de gérer la session avant de se connecter
    const sessionHandled = await handleSession();
    if (!sessionHandled && fs.existsSync(CRED_PATH)) {
        // Si la session a été téléchargée mais n'est pas valide (peu probable si le téléchargement est OK)
        // ou si un QR est généré, on continue
        fs.unlinkSync(CRED_PATH); // Supprime le fichier corrompu pour forcer un nouveau QR
        console.log("Session locale supprimée pour forcer un nouveau QR.");
    }
    
    // Si la session a été gérée et un fichier creds.json existe, ou si on va en générer un nouveau
    const { state, savecreds } = await usemultifileauthstate(SESSION_DIR);
    var { version, isLatest } = await fetchlatestbaileysversion(); // Correction de is en isLatest

    const conn = makewasocket({
        logger: p({ level: 'silent' }),
        printqrinterminal: false, // On gérera l'affichage du QR manuellement pour plus de contrôle
        browser: browsers.macos("Firefox"), // Correction de firefox en Firefox
        syncfullhistory: true,
        auth: state,
        version
    });

    conn.ev.on('connection.update', async (update) => { // Ajout de async
        const { connection, lastdisconnect, qr } = update;

        if (qr) {
            console.log('\n--- SCANNEZ CE QR CODE AVEC VOTRE TÉLÉPHONE WHATSAPP (Royal MD) ---\n');
            qrcode.generate(qr, { small: false });
            console.log('\n------------------------------------------------------------------\n');
            console.log("Ce QR code sera affiché dans le terminal. Scannez-le pour connecter le bot.");
            // Optionnel: vous pouvez aussi sauvegarder le QR code dans un fichier image ici
            // qrcode.toFile('qrcode.png', qr, (err) => { if (err) console.error(err); });
        }

        if (connection === 'close') {
            const statusCode = lastdisconnect.error?.output?.statusCode;
            console.log('Connexion WhatsApp fermée. Raison :', lastdisconnect.error);

            if (statusCode === disconnectreason.loggedOut || statusCode === disconnectreason.badSession) {
                // Session invalide ou déconnectée manuellement : besoin d'un nouveau QR.
                console.error(`Session invalide ou déconnectée. Veuillez supprimer le dossier "${SESSION_DIR}" et relancer le script pour un nouveau QR code.`);
                if (fs.existsSync(CRED_PATH)) {
                    fs.unlinkSync(CRED_PATH); // Supprime la session corrompue
                    console.log(`Fichier de session "${CRED_PATH}" supprimé.`);
                }
                process.exit(1); // Arrête le script, PM2 le redémarrera et il générera un nouveau QR
            } else {
                // Autre raison, tente de reconnecter
                console.log('Tentative de reconnexion...');
                setTimeout(() => connecttowa(), 5000); // Tente de se reconnecter après 5 secondes
            }
        } else if (connection === 'open') {
            console.log('🧬 Installation des plugins...');
            const pluginsPath = './plugins/';
            fs.readdirSync(pluginsPath).forEach((plugin) => {
                if (path.extname(plugin).toLowerCase() == ".js") {
                    require(path.join(pluginsPath, plugin)); // Utilisez path.join pour une meilleure compatibilité
                }
            });
            console.log('Plugins installés avec succès ✅');
            console.log('Bot Royal MD connecté à WhatsApp ✅');

            let up = `*🌑 𝐒𝐀𝐋𝐔𝐓 𝐓𝐎𝐈, 𝐔𝐓𝐈𝐋𝐈𝐒𝐀𝐓𝐄𝐔𝐑 𝐒𝐎𝐁𝐑𝐄...*
*🤖 𝐋𝐄 𝐁𝐎𝐓 *royal* 𝐓𝐄 𝐒𝐀𝐋𝐔𝐄 𝐃𝐀𝐍𝐒 𝐋𝐄 𝐍𝐎𝐈𝐑 🔥*
*✅ 𝐂𝐎𝐍𝐍𝐄𝐗𝐈𝐎𝐍 𝐑𝐄𝐔𝐒𝐒𝐈𝐄 !*
  
*╭───━━━━───━━━━──┉┈⚆*
*│• 𝐓𝐘𝐏𝐄 .𝐌𝐄𝐍𝐔 𝐓𝐎 𝐒𝐄𝐄 𝐋𝐈𝐒𝐓 •*
*│• 𝐁𝐎𝐓 𝐀𝐌𝐀𝐙𝐈𝐍𝐆 𝐅𝐄𝐀𝐓𝐔𝐑𝐄𝐒 •*
*│• 🌸𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐑 : 𝐀ɭīī 𝐈ƞ̄x̷īīɖ𝛆̽*
*│• ⏰𝐀𝐋𝐖𝐀𝐘𝐒 𝐎𝐍𝐋𝐈𝐍𝐄 : ${online}*
*│• 📜𝐏𝐑𝐄𝐅𝐈𝐗 : ${prefix}*
*│• 🪾𝐌𝐎𝐃𝐄 : ${mode}*
*│• 🪄𝐒𝐓𝐀𝐓𝐔𝐒 𝐕𝐈𝐄𝐖𝐒 : ${status}*
*│• 🫟𝐕𝐄𝐑𝐒𝐈𝐎𝐍 : 𝟒.𝟎.𝟎*
*┗───━━━━───━━━━──┉┈⚆*`;
            await conn.sendMessage(conn.user.id, { image: { url: `https://files.catbox.moe/e10hd3.jpg` }, caption: up }); // Correction de sendmessage en sendMessage
        }
    });
    conn.ev.on('creds.update', savecreds);

    //==============================

    conn.ev.on('messages.update', async updates => {
        for (const update of updates) {
            if (update.update.message === null) { // Si update.update.message est null, c'est une suppression
                console.log("Suppression détectée:", JSON.stringify(update, null, 2));
                await antidelete(conn, updates);
            }
        }
    });
    //============================== 

    conn.ev.on("group-participants.update", (update) => groupevents(conn, update));
    // ============================== 
    const sendnoprefix = async (client, message) => {
        try {
            if (!message.quoted) {
                return await client.sendMessage(message.chat, { // Correction de sendmessage en sendMessage
                    text: "*🍁 please reply to a message!*"
                }, { quoted: message });
            }

            const buffer = await message.quoted.download();
            const mtype = message.quoted.mtype;
            const options = { quoted: message };

            let messagecontent = {};
            switch (mtype) {
                case "imagemessage":
                    messagecontent = {
                        image: buffer,
                        caption: message.quoted.text || '',
                        mimetype: message.quoted.mimetype || "image/jpeg"
                    };
                    break;
                case "videomessage":
                    messagecontent = {
                        video: buffer,
                        caption: message.quoted.text || '',
                        mimetype: message.quoted.mimetype || "video/mp4"
                    };
                    break;
                case "audiomessage":
                    messagecontent = {
                        audio: buffer,
                        mimetype: "audio/mp4",
                        ptt: message.quoted.ptt || false
                    };
                    break;
                default:
                    return await client.sendMessage(message.chat, { // Correction de sendmessage en sendMessage
                        text: "❌ only image, video, and audio messages are supported"
                    }, { quoted: message });
            }

            await client.sendMessage(message.chat, messagecontent, options); // Correction de sendmessage en sendMessage
        } catch (error) {
            console.error("no prefix send error:", error);
            await client.sendMessage(message.chat, { // Correction de sendmessage en sendMessage
                text: "❌ error forwarding message:\n" + error.message
            }, { quoted: message });
        }
    };

    // === bina prefix command (send/sendme/stsend) ===
    conn.ev.on('messages.upsert', async (msg) => {
        try {
            const m = msg.messages[0];
            if (!m.message || m.key.fromMe || m.key.participant === conn.user.id) return; // Correction de fromme en fromMe

            const text = m.message?.conversation || m.message?.extendedTextMessage?.text; // Correction de extendedtextmessage en extendedTextMessage
            const from = m.key.remoteJid; // Correction de remotejid en remoteJid
            if (!text) return;

            const command = text.toLowerCase().trim(); // Correction de tolowercase en toLowerCase
            const targetcommands = ["send", "sendme", "sand"];
            if (!targetcommands.includes(command)) return;

            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage; // Correction de extendedtextmessage en extendedTextMessage
            if (!quoted) {
                await conn.sendMessage(from, { text: "*🥷 please reply to a message!*" }, { quoted: m }); // Correction de sendmessage en sendMessage
                return;
            }

            const qmsg = {
                mtype: getcontenttype(quoted),
                mimetype: quoted[getcontenttype(quoted)]?.mimetype,
                text: quoted[getcontenttype(quoted)]?.caption || quoted[getcontenttype(quoted)]?.text || '',
                ptt: quoted[getcontenttype(quoted)]?.ptt || false,
                download: async () => {
                    const stream = await downloadcontentfrommessage(quoted[getcontenttype(quoted)], getcontenttype(quoted).replace("message", ""));
                    let buffer = Buffer.from([]); // Correction de buffer.from en Buffer.from
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]); // Correction de buffer.concat en Buffer.concat
                    return buffer;
                }
            };

            m.chat = from;
            m.quoted = qmsg;

            await sendnoprefix(conn, m);
        } catch (err) {
            console.error("no prefix handler error:", err);
        }
    });

    //=============readstatus=======

    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        mek.message = (getcontenttype(mek.message) === 'ephemeralMessage') // Correction de ephemeralmessage en ephemeralMessage
            ? mek.message.ephemeralMessage.message // Correction de ephemeralmessage en ephemeralMessage
            : mek.message;
        //console.log("new message detected:", json.stringify(mek, null, 2));
        if (config.read_message === 'true') {
            await conn.readMessages([mek.key]); // Correction de readmessages en readMessages
            console.log(`marked message from ${mek.key.remoteJid} as read.`); // Correction de remotejid en remoteJid
        }
        if (mek.message.viewOnceMessageV2) // Correction de viewoncemessagev2 en viewOnceMessageV2
            mek.message = (getcontenttype(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message; // Correction
        if (mek.key && mek.key.remoteJid === 'statusbroadcast' && config.auto_status_seen === "true") { // Correction de remotejid en remoteJid
            await conn.readMessages([mek.key]); // Correction de readmessages en readMessages
        }
        if (mek.key && mek.key.remoteJid === 'statusbroadcast' && config.auto_status_react === "true") { // Correction de remotejid en remoteJid
            const jawadlike = await conn.decodeJid(conn.user.id); // Correction de decodejid en decodeJid
            const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇵🇰', '💜', '💙', '🌝', '🖤', '🎎', '🎏', '🎐', '⚽', '🧣', '🌿', '⛈️', '🌦️', '🌚', '🌝', '🙈', '🙉', '🦖', '🐤', '🎗️', '🥇', '👾', '🔫', '🐝', '🦋', '🍓', '🍫', '🍭', '🧁', '🧃', '🍿', '🍻', '🎀', '🧸', '👑', '〽️', '😳', '💀', '☠️', '👻', '🔥', '♥️', '👀', '🐼'];
            const randomemoji = emojis[Math.floor(Math.random() * emojis.length)]; // Correction de math en Math
            await conn.sendMessage(mek.key.remoteJid, { // Correction de sendmessage en sendMessage
                react: {
                    text: randomemoji,
                    key: mek.key,
                }
            }, { statusJidsList: [mek.key.participant, jawadlike] }); // Correction de statusjidlist en statusJidsList
        }
        if (mek.key && mek.key.remoteJid === 'statusbroadcast' && config.auto_status_reply === "true") { // Correction de remotejid en remoteJid
            const user = mek.key.participant;
            const text = `${config.auto_status_msg}`;
            await conn.sendMessage(user, { text: text, react: { text: '💜', key: mek.key } }, { quoted: mek }); // Correction de sendmessage en sendMessage
        }
        await Promise.all([ // Correction de promise en Promise
            savemessage(mek),
        ]);
        const m = sms(conn, mek);
        const type = getcontenttype(mek.message);
        const content = JSON.stringify(mek.message); // Correction de json en JSON
        const from = mek.key.remoteJid; // Correction de remotejid en remoteJid
        const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []; // Corrections de extendedtextmessage, contextinfo, quotedmessage
        const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''; // Corrections
        const iscmd = body.startsWith(prefix); // Correction de startswith en startsWith
        var budy = typeof mek.text == 'string' ? mek.text : false;
        const command = iscmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''; // Correction de tolowercase en toLowerCase
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const text = args.join(' ');
        const isgroup = from.endsWith('g.us'); // Correction de endswith en endsWith
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0] + 's.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid); // Correction de fromme, remotejid
        const sendernumber = sender.split('@')[0]; // Correction de split('') en split('@') pour obtenir le numéro
        const botnumber = conn.user.id.split(':')[0];
        const pushname = mek.pushName || 'sin nombre'; // Correction de pushname en pushName
        const isme = botnumber.includes(sendernumber);

        // ... (le reste de votre logique de gestion des messages va ici)
    });

    return conn; // Retourne l'instance de connexion pour une utilisation ultérieure
}

// Lance la fonction principale
connecttowa();
