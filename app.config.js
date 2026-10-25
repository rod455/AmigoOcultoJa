// Configuração do app = app.json + o número de build do envio + os serviços
// nativos do Google que estiverem configurados (native-services.js).
// No Codemagic, APP_BUILD_NUMBER vem do passo que pergunta à loja o último
// número enviado (codemagic.yaml); fora dele, vale o que estiver no app.json.
const services = require('./native-services');

module.exports = ({ config }) => {
  let out = { ...config, plugins: [...(config.plugins ?? [])] };

  const raw = process.env.APP_BUILD_NUMBER;
  if (raw) {
    const build = Number.parseInt(raw, 10);
    if (!Number.isInteger(build) || build < 1) {
      throw new Error(`APP_BUILD_NUMBER inválido: "${raw}"`);
    }
    out = { ...out, ios: { ...out.ios, buildNumber: String(build) }, android: { ...out.android, versionCode: build } };
  }

  // Firebase Analytics: só com os arquivos do console em firebase/. Sem o
  // identificador de publicidade (o iPhone não mostra o aviso de rastreamento).
  // O Firebase 13+ do iPhone exige frameworks dinâmicos.
  if (services.firebase) {
    out.ios = { ...out.ios, googleServicesFile: services.firebaseFiles.ios };
    out.android = { ...out.android, googleServicesFile: services.firebaseFiles.android };
    out.plugins.push(
      '@react-native-firebase/app',
      ['@react-native-firebase/analytics', { ios: { withoutAdIdSupport: true } }],
      ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }],
    );
  }

  // AdMob: só com os IDs dos apps (ADMOB_APP_ID_IOS / ADMOB_APP_ID_ANDROID).
  if (services.admob) {
    out.plugins.push(['react-native-google-mobile-ads', { iosAppId: services.admobIds.ios, androidAppId: services.admobIds.android }]);
  }

  return out;
};
