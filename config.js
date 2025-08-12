const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "TA_SESSION_ID",
AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || "true",
AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "true",
AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true",
AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "*ROYAL MD VIENS DE RÉCUPÉRER UN STATUT EN LIBERTÉ by Altesse *",
PREFIX: process.env.PREFIX || ".",
BOT_NAME: process.env.BOT_NAME || "Royal-MD",
STICKER_NAME: process.env.STICKER_NAME || "ＳＨＡＤＯＷ ＣＯＤＥ  ＢＹ  ALTESSE",
CUSTOM_REACT: process.env.CUSTOM_REACT || "false",
CUSTOM_REACT_EMOJIS: process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍",
DELETE_LINKS: process.env.DELETE_LINKS || "false",
OWNER_NUMBER: process.env.OWNER_NUMBER || "243905526836",
OWNER_NAME: process.env.OWNER_NAME || "╾⸻⟡⟡ 『Royal-MD』 ⟡⟡⸻╼",
WELCOME: process.env.WELCOME || "true",
GOODBYE: process.env.GOODBYE || "true",
ADMIN_STATUS: process.env.ADMIN_STATUS || "false",
ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || "false",
MENTION_REPLY: process.env.MENTION_REPLY || "false",
DESCRIPTION: process.env.DESCRIPTION || "*# Ce chef-d'œuvre ne vient pas de n'importe qui, mais de KYOTAKA ᎠᎯᏁ ᏠᎬᏒᏕᎬᎽ ⎯꯭̽*",
ALIVE_IMG: process.env.ALIVE_IMG || "https://files.catbox.moe/e10hd3.jpg",
LIVE_MSG: process.env.LIVE_MSG || "> 👋 HEY... je suis actif maintenant.  🖤 Mode sombre engagé.  🕶️ Prêt pour la mission.",
READ_MESSAGE: process.env.READ_MESSAGE || "false",
AUTO_REACT: process.env.AUTO_REACT || "false",
ANTI_BAD_WORD: process.env.ANTI_BAD_WORD || "true",
MODE: process.env.MODE || "public",
DELETE_LINK: process.env.DELETE_LINK || "true",
ANTI_LINK: process.env.ANTI_LINK || "true",
AUTO_VOICE: process.env.AUTO_VOICE || "false",
AUTO_STICKER: process.env.AUTO_STICKER || "false",
AUTO_REPLY: process.env.AUTO_REPLY || "false",
PUBLIC_MODE: process.env.PUBLIC_MODE || "true",
AUTO_TYPING: process.env.AUTO_TYPING || "false",
READ_CMD: process.env.READ_CMD || "false",
DEV: process.env.DEV || "243905526836",
ANTI_VV: process.env.ANTI_VV || "true",
ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "log",
AUTO_RECORDING: process.env.AUTO_RECORDING || "false"
};
