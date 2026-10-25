// Autolinking: Firebase e AdMob só entram na build nativa quando configurados
// (ver native-services.js). Sem isso, o AdMob derruba o Android ao abrir (falta
// o ID do app) e o Firebase exige frameworks dinâmicos no iPhone à toa.
const { admob, firebase } = require('./native-services');

const off = { platforms: { ios: null, android: null } };

module.exports = {
  dependencies: {
    ...(firebase ? {} : { '@react-native-firebase/app': off, '@react-native-firebase/analytics': off }),
    ...(admob ? {} : { 'react-native-google-mobile-ads': off }),
  },
};
