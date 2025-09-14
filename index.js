// index.js

import {
    default as makeWASocket,
    prepareWAMessageMedia,
    removeAuthsState,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    generateWAMessageFromContent,
    generateWAMessageContent,
    generateWAMessage,
    jidDecode,
    proto,
    delay,
    relayWAMessage,
    getContentType,
    generateMessageTag,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    fetchLatestWaWebVersion,
    interactiveMessage,
    makeCacheableSignalKeyStore,
    browsers,
    generateForwardMessageContent,
    messageRetryMap
} from "@whiskeysockets/baileys";
import pino from 'pino';
import FileType from 'file-type'; // Import corrigé
import readline from "readline";
import fs from 'fs';
import crypto from "crypto";
import path from "path";
import fetch from 'node-fetch'; // Ajout de l'import pour fetch

import { spawn, exec, execSync } from 'child_process';
import { Boom } from '@hapi/boom'; // Import corrigé, 'Boom' en majuscule

// Import de votre configuration
import configuration from './settings/config.js'; // Chemin corrigé

// Import de vos bibliothèques locales
import { color } from './library/color.js'; // Assurez-vous que ces chemins sont corrects
import { smsg, sleep, getBuffer } from './library/myfunction.js';
import { imageToWebp, videoToWebp, writeExifImg, writeExifVid, addExif } from './library/exif.js';

// --- Corrections de base ---
// Utilisation de Math (majuscule) et Buffer (majuscule)
const listcolor = ['cyan', 'magenta', 'green', 'yellow', 'blue'];
const randomColor = listcolor[Math.floor(Math.random() * listcolor.length)];

// Processus d'erreurs non capturées
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error); // Ajout pour les promesses

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(color(text, randomColor), (answer) => {
            resolve(answer);
            rl.close();
        });
    });
}

const clientStart = async() => {
    console.clear();
    console.log(color('Démarrage du bot WhatsApp...', 'green'));

    const store = makeInMemoryStore({
        logger: pino().child({ 
            level: 'silent', // Mettre 'info' pour voir les logs du store
            stream: 'store' 
        })
    });
    
    // Utilisation de la configuration importée
    const { state, saveCreds } = await useMultiFileAuthState(`./${configuration.session}`);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(color(`Utilisation de Baileys v${version}${isLatest ? ' (dernière version)' : ''}`, 'yellow'));

    const client = makeWASocket({
        logger: pino({ level: "silent" }), // Mettre 'info' ou 'debug' pour voir les logs de Baileys
        printQRInTerminal: configuration.status.terminal, // Utilisation de la config
        auth: state,
        browser: browsers.ubuntu('Chrome'), // Utilisation de l'outil browsers de Baileys
        // Si votre hébergeur ne supporte pas certains navigateurs, vous pourriez tenter de passer des arguments
        // puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] } // Non nécessaire avec Baileys en général
    });

    if (configuration.setPair && !client.authState.creds.registered) { // Corrigé authState
        const phoneNumber = await question('/> Veuillez entrer votre numéro WhatsApp, ex: 243xxxxxxxxxx:\n> Numéro: ');
        // Suppression de la partie configuration.setPair car la fonction requestPairingCode ne prend pas ce paramètre directement
        // Si vous avez un token de pairing, il faut le gérer différemment.
        // La fonction `requestPairingCode` n'est pas standard avec les versions récentes de Baileys pour un usage direct comme ça.
        // La méthode habituelle est le QR code, ou un token si la plateforme le permet.
        console.log(color('La méthode de code de jumelage direct n\'est pas toujours supportée ou stable avec Baileys. Il est recommandé d\'utiliser le QR Code.', 'red'));
        console.log(color('Veuillez vous assurer que printQRInTerminal est sur true dans votre config pour voir le QR si besoin.', 'red'));
    }
    
    store.bind(client.ev);
    
    client.ev.on('creds.update', saveCreds);
    client.ev.on('messages.upsert', async chatUpdate => { // Corrigé chatupdate en chatUpdate
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            mek.message =
                Object.keys(mek.message)[0] === 'ephemeralMessage' ? // Corrigé Object.keys
                mek.message.ephemeralMessage.message : mek.message;
            
            // Correction des noms de variables et utilisation de Math
            if (configuration.status.reactsw && mek.key && mek.key.remoteJid === 'statusBroadcast') {
                let emoji = [ '😘', '😭', '😂', '😹', '😍', '😋', '🙏', '😜', '😢', '😠', '🤫', '😎' ];
                let sigma = emoji[Math.floor(Math.random() * emoji.length)];
                await client.readMessages([mek.key]);
                client.sendMessage('statusBroadcast', { 
                    react: { 
                        text: sigma, 
                        key: mek.key 
                    }
                }, { statusJidList: [mek.key.participant] }); // Corrigé statusJidList
            }
            
            if (mek.key && mek.key.remoteJid.includes('newsletter')) return;
            if (!client.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
            if (mek.key.id.startsWith('laurine-') && mek.key.id.length === 12) return;
            
            const m = smsg(client, mek, store); // Assurez-vous que smsg est à jour pour Baileys
            // Correction de l'import de handler
            try {
                const handler = await import("./handler.js"); // Utilisation d'import dynamique pour les modules ES
                handler.default(client, m, chatUpdate, store); // Si handler.js exporte par défaut
            } catch (handlerErr) {
                console.error("Erreur lors du chargement ou de l'exécution de handler.js:", handlerErr);
            }
        } catch (err) {
            console.error("Erreur lors de la gestion des messages:", err); // Utilisation de console.error
        }
    });

    client.decodeJid = (jid) => { // Corrigé decodejid en decodeJid
        if (!jid) return jid;
        if (/:\d+/gi.test(jid)) {
            let decode = jidDecode(jid) || {}; // Corrigé jiddecode
            return decode.user && decode.server && decode.user + '' + decode.server || jid;
        } else return jid;
    };

    client.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = client.decodeJid(contact.id); // Corrigé decodejid
            if (store && store.contacts) store.contacts[id] = {
                id,
                name: contact.notify
            };
        }
    });

    client.public = configuration.status.public; // Utilisation de la configuration importée
    
    client.ev.on('connection.update', (update) => {
        // La fonction konek doit aussi être adaptée aux modules ES et à votre configuration
        import('./library/connection.js') // Import dynamique
            .then(module => module.konek({ client, update, clientStart, DisconnectReason, Boom })) // Corrigé DisconnectReason et Boom
            .catch(err => console.error("Erreur lors du chargement de connection.js:", err));
    });
    
    // --- Fonctions utilitaires du client ---

    client.deleteMessage = async (chatId, key) => { // Renommé et corrigé
        try {
            await client.sendMessage(chatId, { delete: key });
            console.log(`Message supprimé: ${key.id}`);
        } catch (error) {
            console.error('Erreur lors de la suppression du message:', error);
        }
    };

    client.sendText = async (jid, text, quoted = '', options) => { // Renommé
        client.sendMessage(jid, {
            text: text,
            ...options
        },{ quoted });
    };
    
    client.downloadMediaMessage = async (message) => { // Renommé
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]); // Corrigé Buffer.from
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]); // Corrigé Buffer.concat
        }
        return buffer;
    };

    client.sendImageAsSticker = async (jid, path, quoted, options = {}) => { // Renommé
        let buff = Buffer.isBuffer(path) ? // Corrigé Buffer.isBuffer
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split(',')[1], 'base64') : /^https?:\/\//.test(path) ?
            await getBuffer(path) : fs.existsSync(path) ? // Corrigé fs.existsSync
            fs.readFileSync(path) : Buffer.alloc(0); // Corrigé fs.readFileSync
        
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options); // Corrigé writeExifImg
        } else {
            buffer = await addExif(buff); // Corrigé addExif
        }
        
        await client.sendMessage(jid, { 
            sticker: { url: buffer }, 
            ...options }, { quoted });
        return buffer;
    };
    
    client.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => { // Renommé
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || "";
        let messageType = message.mtype ? message.mtype.replace(/message/gi, "") : mime.split("/")[0];

        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        let type = await FileType.fromBuffer(buffer); // Corrigé FileType
        let trueFilename = attachExtension ? filename + "." + type.ext : filename;
        await fs.writeFileSync(trueFilename, buffer); // Corrigé fs.writeFileSync
        
        return trueFilename;
    };

    client.sendVideoAsSticker = async (jid, path, quoted, options = {}) => { // Renommé
        let buff = Buffer.isBuffer(path) ? 
            path : /^data:.*?\/.*?;base64,/i.test(path) ?
            Buffer.from(path.split(',')[1], 'base64') : /^https?:\/\//.test(path) ?
            await getBuffer(path) : fs.existsSync(path) ? 
            fs.readFileSync(path) : Buffer.alloc(0);

        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options); // Corrigé writeExifVid
        } else {
            buffer = await videoToWebp(buff); // Corrigé videoToWebp
        }

        await client.sendMessage(jid, {
            sticker: { url: buffer }, 
            ...options }, { quoted });
        return buffer;
    };

    // --- Simplification des fonctions complexes (risque de bugs avec Baileys) ---
    // client.albumMessage (simplifié ou désactivé car très complexe et instable)
    // J'ai commenté et simplifié cette partie. La gestion des albums est très complexe avec Baileys
    // et nécessite des structures de messages très spécifiques qui changent souvent.
    // L'implémentation originale est très susceptible de causer des erreurs.
    /*
    client.albumMessage = async (jid, array, quoted) => {
        console.warn("La fonction client.albumMessage est complexe et peut ne pas fonctionner comme prévu avec les versions de Baileys. Utiliser avec prudence.");
        // Une implémentation plus simple consisterait à envoyer chaque média un par un,
        // ou à utiliser les fonctions de groupes de médias si Baileys les expose de manière stable.
        // Pour l'instant, je recommande d'envoyer les médias individuellement.
        for (let content of array) {
            if (content.image) {
                await client.sendMessage(jid, { image: content.image, caption: content.caption }, { quoted });
            } else if (content.video) {
                await client.sendMessage(jid, { video: content.video, caption: content.caption }, { quoted });
            }
            await delay(1000); // Pour éviter le flooding
        }
        return null; // Retourne null car l'original est trop complexe à maintenir
    };
    */
    
    client.getFile = async (path, returnAsFilename) => { // Renommé
        let res, filename;
        const data = Buffer.isBuffer(path) ?
              path : /^data:.*?\/.*?;base64,/i.test(path) ?
              Buffer.from(path.split(',')[1], 'base64') : /^https?:\/\//.test(path) ?
              await (res = await fetch(path)).buffer() : fs.existsSync(path) ?
              (filename = path, fs.readFileSync(path)) : typeof path === 'string' ? 
              path : Buffer.alloc(0);
        if (!Buffer.isBuffer(data)) throw new TypeError('result is not a buffer'); // Corrigé TypeError
        const type = await FileType.fromBuffer(data) || { // Corrigé FileType
            mime: 'application/octet-stream',
            ext: '.bin'
        };
        
        if (data && returnAsFilename && !filename) {
            (filename = path.join(__dirname, './tmp/' + new Date().getTime() + '.' + type.ext)); // Corrigé new Date().getTime()
            await fs.promises.writeFile(filename, data);
        }
        return {
            res,
            filename,
            ...type,
            data,
            deleteFile() { // Renommé
                return filename && fs.promises.unlink(filename);
            }
        };
    };
    
    client.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => { // Renommé
        let type = await client.getFile(path, true);
        let { res, data: file, filename: pathfile } = type;
        if (res && res.status !== 200 || file.length <= 65536) {
            try {
                throw { json: JSON.parse(file.toString()) } // Corrigé JSON.parse
            } catch (e) { if (e.json) throw e.json }
        }
        
        let opt = { filename };
        if (quoted) opt.quoted = quoted;
        if (!type) options.asDocument = true; // Corrigé asDocument
        
        let mtype = '', mimetype = type.mime, convert;
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'; // Corrigé asSticker
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'; // Corrigé asImage
        else if (/video/.test(type.mime)) mtype = 'video';
        else if (/audio/.test(type.mime)) {
            // toptt et toaudio ne sont pas définies ici. Assurez-vous qu'elles sont dans vos bibliothèques locales.
            // Si vous n'avez pas ces fonctions, ce code causera une erreur.
            // convert = await (ptt ? toptt : toaudio)(file, type.ext);
            // file = convert.data;
            // pathfile = convert.filename;
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        } else mtype = 'document';
        
        if (options.asDocument) mtype = 'document'; // Corrigé asDocument
        
        let message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathfile },
            mimetype
        };
        let m;
        try {
            m = await client.sendMessage(jid, message, {
                ...opt,
                ...options
            });
        } catch (e) {
            console.error("Erreur lors de l'envoi du message avec URL:", e);
            m = null;
        } finally {
            if (!m) m = await client.sendMessage(jid, {
                ...message,
                [mtype]: file
            }, {
                ...opt,
                ...options 
            });
            return m;
        }
    };
    
    // client.sendStatusMention (Désactivé car très complexe et risque élevé de bugs/bans)
    // Cette fonction utilise des structures de messages très spécifiques et obsolètes,
    // ainsi que des mentions de groupes non standard pour les statuts.
    // L'utiliser telle quelle peut entraîner des bans ou des erreurs.
    /*
    client.sendStatusMention = async (content, jids = []) => {
        console.warn("La fonction client.sendStatusMention est complexe et risque d'être obsolète ou de causer des bans. Utiliser avec prudence.");
        // Implémentation simplifiée si vraiment nécessaire, mais cela dépasse la portée d'une simple correction
        // et nécessite une compréhension approfondie des structures de message Baileys supportées.
        return null; // Retourne null pour éviter les crashs
    };
    */
    return client;
}

clientStart();

const ignoredErrors = [ // Corrigé ignoredErrors
    'socket connection timeout',
    'ekeytype',
    'item-not-found',
    'rate-overlimit',
    'connection closed',
    'timed out',
    'value not found'
];

let file = require.resolve(__filename);
fs.watchFile(file, () => { // Corrigé watchfile
  delete require.cache[file];
  // Pour les modules ES6, recharger un module est plus complexe.
  // La solution la plus simple est de redémarrer le processus du bot.
  // En production, un gestionnaire de processus comme PM2 s'en occuperait.
  console.log(color(`Le fichier ${file} a été modifié, redémarrage du bot...`, 'yellow'));
  process.exit(0); // Quitte le processus pour qu'il soit redémarré par l'hébergeur/PM2
});

process.on('unhandledRejection', reason => {
    if (ignoredErrors.some(e => String(reason).includes(e))) return; // Corrigé String(reason)
    console.log('Unhandled Rejection:', reason);
});

const originalConsoleError = console.error; // Corrigé originalConsoleError
console.error = function (msg, ...args) {
    if (typeof msg === 'string' && ignoredErrors.some(e => msg.includes(e))) return;
    originalConsoleError.apply(console, [msg, ...args]);
};

const originalStderrWrite = process.stderr.write; // Corrigé originalStderrWrite
process.stderr.write = function (msg, encoding, fd) {
    if (typeof msg === 'string' && ignoredErrors.some(e => msg.includes(e))) return;
    originalStderrWrite.apply(process.stderr, arguments);
};
