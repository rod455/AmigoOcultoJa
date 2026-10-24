# Versão 1.0.1 (iPhone: depois da aprovação da 1.0.0 · Android: próxima envio)

**Árvore do build:** _(preencher com `git rev-parse --short HEAD` na hora do build)_
**Enviado à Apple em:** _(data)_ · **à Play em:** _(data)_

Antes do build: subir a versão no `app.json` (`expo.version` para 1.0.1 quando a
1.0.0 do iPhone for aprovada; no Android, `expo.android.version` para a próxima
que ainda não está em `docs/lojas/publicadas.json`).

## O que vai no binário

- **Empresas no app** (24/10/2026): o cadastro da empresa (`/empresas/importar`)
  e o painel da empresa (`/empresas/lote/[id]`), que antes só existiam no site.
  - Entrada na tela inicial: "Amigo secreto da empresa".
  - Planilha escolhida pelo seletor do sistema (Arquivos, iCloud, Google Drive).
  - Modelo da planilha e planilhas de links saem pela folha de compartilhar
    (salvar em Arquivos, e-mail, WhatsApp).
  - "Enviar" de cada grupo abre a folha de compartilhar do sistema.
  - O logo da empresa continua sendo enviado pelo site; as cores, no app também.
- Correções da revisão de 20/10/2026 (`179e217`): revogar o "Entrar com a Apple"
  ao excluir a conta, compartilhar do sistema na tela "Pronto", mensagens de
  erro, teclado no Android.

Plugins nativos tocados: `expo-file-system` e `expo-sharing` (novos, sem
permissões). Exige build nova; não vai por atualização de JavaScript.

## Roteiro de aparelho (TestFlight e faixa interna)

1. Início › "Amigo secreto da empresa" abre o cadastro com os 4 passos.
2. "Baixar modelo (Excel)": abre a folha de compartilhar; salvar em Arquivos.
3. Começar o preenchimento › "Enviar planilha": escolher o modelo preenchido
   (por Arquivos, e no Android pelo Google Drive). Aparece "N pessoas em N áreas".
4. Digitar ou colar nomes também funciona, com o teclado sem cobrir o botão.
5. Dinâmica "Integração entre áreas", convite individual ligado, valor R$ 80.
6. Revisar e sortear sem estar logado: pede login e volta para a revisão.
7. Painel da empresa: "Enviar" de um grupo, "Enviar planilha com os links" e
   "Links individuais (planilha)" abrem a folha de compartilhar com o .csv.
8. Fechar o app no meio do cadastro e abrir de novo: "Continuar de onde parei".
9. Tela inicial: a empresa aparece em "DA EMPRESA".
