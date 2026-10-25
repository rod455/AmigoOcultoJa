/**
 * IDs do Google (site) e chave do consentimento de cookies. Vêm das variáveis
 * de ambiente da Vercel (e do .env local); sem elas, a tag do Google não é
 * carregada e nada sai para o Google. Ver docs/dados/marketing.md.
 */
export const GA4_ID = process.env.EXPO_PUBLIC_GA4_ID ?? '';
/** Conta do Google Ads, "AW-123456789". */
export const ADS_ID = process.env.EXPO_PUBLIC_GOOGLE_ADS_ID ?? '';
/** Conversão principal (organizador cadastrado), "AW-123456789/AbCdEf". */
export const ADS_SIGNUP = process.env.EXPO_PUBLIC_GOOGLE_ADS_CADASTRO ?? '';

export const tagEnabled = Boolean(GA4_ID || ADS_ID);

/** Escolha de cookies guardada no navegador: 'granted' ou 'denied'. */
export const CONSENT_KEY = 'aoj.consent';
