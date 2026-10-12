# App Store Connect: o que preencher

App: Apple ID `6821636982`, bundle `br.com.amigoocultoja.app`, time
`GGM89XNN4S` (conta individual: vendedor "Rodrigo Moraes da Silva").
Respostas conferidas contra o código, o banco e a Política de Privacidade em
12/10/2026. Mudou o que o app coleta ou faz: mude aqui, na política e no App
Store Connect no mesmo dia.

## 1. Informações do app (App Information)
- Nome (30): `Amigo Oculto Já: Amigo Secreto`
- Subtítulo (30): `Sorteio e lista de presentes`
- Categoria principal: **Estilo de vida** · secundária: **Utilidades**
- Direitos de conteúdo: o app mostra conteúdo de terceiros? **Sim** (nomes e
  links de produtos da Amazon) · tem os direitos? **Sim** (programa de
  Associados da Amazon)
- Classificação etária: seção 5

## 2. Preço e disponibilidade
- Preço: **Gratuito**
- Disponibilidade: **Brasil**

## 3. Privacidade do app (App Privacy)
- URL da política: `https://amigoocultoja.com.br/privacidade`
- Coleta dados? **Sim**. Rastreamento (tracking): **Não** em todos.

| tipo (Apple) | finalidade | ligado à identidade? |
|---|---|---|
| Informações de contato › Nome | Funcionalidade do app | Sim |
| Informações de contato › E-mail | Funcionalidade do app | Sim |
| Conteúdo do usuário › Outro conteúdo do usuário | Funcionalidade do app | Sim |
| Identificadores › ID do usuário | Funcionalidade do app, Análise | Sim |
| Identificadores › ID do dispositivo (código aleatório nosso, não é o IDFA) | Análise | Sim |
| Dados de uso › Interação com o produto | Análise | Sim |
| Diagnóstico › Dados de falhas | Funcionalidade do app (a Apple põe "minimizar falhas" aqui) | Sim |
| Diagnóstico › Outros dados de diagnóstico (erros que não derrubam o app) | Funcionalidade do app | Sim |

Não coletados: localização, contatos, fotos, áudio, dados financeiros, saúde,
histórico de navegação, histórico de busca, compras.

## 4. Versão 1.0 (página "Preparar para envio")
- Capturas (pasta `docs/lojas/imagens/`), na aba de cada tamanho:
  - iPhone com Dynamic Island, tela média (6,1"/6,3"): `iphone-6.3-1..3.png` (1206 x 2622)
  - iPhone tela grande (6,9"), se a aba aparecer: `iphone-6.9-1..3.png` (1320 x 2868)
  - iPad 13": `ipad-13-1..3.png` (2064 x 2752). O app é só para iPhone
    (`supportsTablet: false`); a exigência do iPad some quando o build é
    anexado, mas subir estas não atrapalha.
  - As capturas da Play (`tela-*.png`, 1080 x 1920) a Apple recusa.
- Texto promocional (170):
```
Organize o amigo oculto em minutos: cada um descobre quem tirou pelo WhatsApp e já monta a lista de presentes. Sem papelzinho e sem ninguém ver o resultado dos outros.
```
- Descrição: a mesma da Play (`docs/lojas/play-console.md`, seção 4).
- Palavras-chave (100, sem repetir palavras do nome e do subtítulo):
```
natal,sortear,whatsapp,troca,familia,empresa,confraternizacao,festa,grupo,papelzinho,fim de ano
```
- URL de suporte: `https://amigoocultoja.com.br/suporte`
- URL de marketing: `https://amigoocultoja.com.br`
- Versão: `1.0.0` · Copyright: `2026 Rodrigo Moraes da Silva`
- Build: o que o Codemagic enviou ao TestFlight
- Liberação: **liberar automaticamente após a aprovação**

### Informações para a revisão (App Review Information)
- Login necessário: **Sim**
  - Usuário: `amigoocultoja+revisao@gmail.com` · Senha: a da conta de revisão (gerenciador de senhas)
- Contato: Rodrigo Moraes da Silva · amigoocultoja@gmail.com · seu telefone
- Notas (em inglês, para o revisor):
```
The app UI is in Brazilian Portuguese. It organizes "amigo oculto" (Secret Santa) draws.

How to review:
1. Tap "Criar meu grupo" (Create my group), type a group name, your name and at least 2 more people, pick a gift budget and tap "Sortear" (Draw).
2. On the account screen tap "Já tenho conta" (I already have an account) and sign in with the demo account above. Sign in with Apple is also available.
3. After the draw the app shows the invite link and the organizer panel. Open the invite link to see the participant flow: pick a name, see who you drew and build a wish list of up to 3 gifts.

Participants do not need an account. Accounts can be deleted in the app: home screen > tap your name > "Excluir minha conta" (Delete my account).
User content is limited to group names and gift wishes, visible only to members of the same private, invite-only group. Support and reports: amigoocultoja@gmail.com (https://amigoocultoja.com.br/suporte).
Gift links open Amazon Brazil in the browser (Amazon Associates affiliate links). The app has no in-app purchases and no ads.
```

## 5. Classificação etária (questionário de 2025)
Tudo **Não / Nenhum**, exceto:
- Conteúdo gerado pelo usuário: **Sim** (nomes e lista de presentes, só dentro do grupo privado)
- Acesso irrestrito à web: **Não** (os links abrem a Amazon fora do app)
- Mensagens e chat: **Não** · Publicidade: **Não** · Concursos: **Não** · Jogos de azar: **Não**

Se a Apple pedir mecanismo de denúncia/bloqueio por causa do conteúdo gerado
pelo usuário (diretriz 1.2), a resposta é a nota acima: grupos privados por
convite, contato publicado em /suporte. Se mesmo assim recusarem, entra um
"Denunciar" por e-mail na tela do grupo.
