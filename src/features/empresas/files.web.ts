/**
 * Arquivos da empresa no site: escolher a planilha (input de arquivo), baixar
 * o modelo e salvar planilhas de links (download pelo navegador). A versão do
 * app está em files.ts.
 */
import type { SheetFile } from './files';

export type { SheetFile } from './files';

export function pickSheetFile(): Promise<SheetFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.onchange = () => {
      const f = input.files?.[0];
      resolve(f ? { name: f.name, type: f.type, text: () => f.text(), arrayBuffer: () => f.arrayBuffer() } : null);
    };
    input.click();
  });
}

export async function openTemplate(path: string): Promise<void> {
  window.open(path, '_blank');
}

export async function saveCsv(csv: string, fileName: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
