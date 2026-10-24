/**
 * Arquivos da empresa no app (iPhone e Android): escolher a planilha pelo
 * seletor do sistema (Arquivos, iCloud, Google Drive...), abrir o modelo e
 * mandar planilhas de links pela folha de compartilhar (e-mail, WhatsApp,
 * salvar em Arquivos). A versão do site está em files.web.ts.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { baseUrl } from '@/lib/share';

/** Planilha escolhida, com leitura igual no site e no app. */
export type SheetFile = { name: string; type?: string; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> };

const SHEET_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export async function pickSheetFile(): Promise<SheetFile | null> {
  const r = await File.pickFileAsync({ mimeTypes: SHEET_TYPES });
  if (r.canceled || !r.result) return null;
  const f = r.result;
  return { name: f.name, type: f.type ?? undefined, text: () => f.text(), arrayBuffer: () => f.arrayBuffer() };
}

/** Baixa o modelo para o aparelho e abre a folha de compartilhar (salvar em Arquivos, mandar por e-mail...). */
export async function openTemplate(path: string): Promise<void> {
  const name = path.split('/').pop() ?? 'modelo';
  const dest = new File(Paths.cache, name);
  const file = await File.downloadFileAsync(`${baseUrl()}${path}`, dest, { idempotent: true });
  await share(file.uri, name);
}

/** Grava a planilha no cache do app e abre a folha de compartilhar. */
export async function saveCsv(csv: string, fileName: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await share(file.uri, fileName);
}

async function share(uri: string, name: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('SHARE_UNAVAILABLE');
  const xlsx = name.endsWith('.xlsx');
  await Sharing.shareAsync(uri, {
    mimeType: xlsx ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
    UTI: xlsx ? 'org.openxmlformats.spreadsheetml.sheet' : 'public.comma-separated-values-text',
    dialogTitle: name,
  });
}
