// Serviços nativos do Google que só entram no app quando estão configurados.
// Lido por app.config.js (plugins) e por react-native.config.js (autolinking):
// sem configuração, o módulo nativo nem entra na build, e o app fica igual.
//
// - Firebase Analytics: arquivos do console do Firebase em firebase/
//   (GoogleService-Info.plist do iPhone e google-services.json do Android).
// - AdMob: IDs dos apps no AdMob (ca-app-pub-...~...) nas variáveis
//   ADMOB_APP_ID_IOS e ADMOB_APP_ID_ANDROID do Codemagic (ou do .env local).
// Guia: docs/dados/marketing.md.
const fs = require('fs');
const path = require('path');

const IOS_PLIST = path.join(__dirname, 'firebase', 'GoogleService-Info.plist');
const ANDROID_JSON = path.join(__dirname, 'firebase', 'google-services.json');

const firebase = fs.existsSync(IOS_PLIST) && fs.existsSync(ANDROID_JSON);
const admob = Boolean(process.env.ADMOB_APP_ID_IOS && process.env.ADMOB_APP_ID_ANDROID);

module.exports = {
  firebase,
  admob,
  firebaseFiles: { ios: './firebase/GoogleService-Info.plist', android: './firebase/google-services.json' },
  admobIds: { ios: process.env.ADMOB_APP_ID_IOS, android: process.env.ADMOB_APP_ID_ANDROID },
};
