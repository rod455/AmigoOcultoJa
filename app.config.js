// Configuração do app = app.json + o número de build do envio.
// No Codemagic, APP_BUILD_NUMBER vem do passo que pergunta à loja o último
// número enviado (codemagic.yaml); fora dele, vale o que estiver no app.json.
module.exports = ({ config }) => {
  const raw = process.env.APP_BUILD_NUMBER;
  if (!raw) return config;
  const build = Number.parseInt(raw, 10);
  if (!Number.isInteger(build) || build < 1) {
    throw new Error(`APP_BUILD_NUMBER inválido: "${raw}"`);
  }
  return {
    ...config,
    ios: { ...config.ios, buildNumber: String(build) },
    android: { ...config.android, versionCode: build },
  };
};
