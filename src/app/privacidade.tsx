import React from 'react';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/features/legal/LegalPage';

/**
 * Política de Privacidade. Descreve o que o código e o banco fazem hoje
 * (supabase/migrations, src/lib/device.ts, src/lib/analytics.ts). Ao mudar o
 * que é coletado, atualize este texto e a data em LegalPage.
 */
const sections: LegalSection[] = [
  {
    title: 'Quem cuida dos seus dados',
    body: [
      `O Amigo Oculto Já! é o responsável pelos dados tratados neste site e nos aplicativos. Para qualquer assunto de privacidade, inclusive falar com o encarregado de dados, escreva para ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'Quais dados guardamos',
    body: [
      'Guardamos só o que o amigo oculto precisa para funcionar:',
      {
        list: [
          ['Conta de quem organiza:', 'nome e e-mail. Se você usar e-mail e senha, a senha é guardada cifrada pelo nosso provedor de login e ninguém da equipe consegue lê-la. Se entrar com Google ou Apple, recebemos deles o nome, o e-mail e, no caso do Google, a foto do perfil.'],
          ['Grupo:', 'nome do grupo, nomes dos participantes digitados por quem organiza, valor do presente, data da troca e quem não pode tirar quem.'],
          ['Sorteio:', 'quem tirou quem. Esse resultado fica no servidor e cada pessoa só consegue ver o próprio. Nem quem organiza vê os resultados dos outros.'],
          ['Participação:', 'quando alguém escolhe o próprio nome, ligamos esse nome a um código aleatório criado no aparelho da pessoa. Guardamos só uma versão cifrada desse código, além do momento em que a pessoa entrou e viu o resultado.'],
          ['Lista de presentes:', 'até 3 itens escolhidos por cada participante.'],
          ['Lembretes:', 'quando alguém pede um lembrete anônimo, registramos o pedido para mostrar o aviso a quem precisa montar a lista, sem revelar quem pediu.'],
          ['Uso do serviço:', 'eventos como "grupo criado", "link compartilhado" ou "clique em presente", ligados ao grupo e à plataforma usada (site, iPhone ou Android). Esses eventos não guardam seu IP.'],
          ['Dados técnicos:', 'nossos provedores de hospedagem registram endereço IP, navegador e horário das conexões, para segurança e funcionamento do serviço.'],
        ],
      },
      'Não pedimos CPF, telefone, endereço nem dados de pagamento.',
    ],
  },
  {
    title: 'Para que usamos e com qual base legal',
    body: [
      {
        list: [
          ['Fazer o amigo oculto funcionar:', 'criar o grupo, sortear, mostrar o resultado a cada pessoa, salvar listas e lembretes. Base legal: execução do serviço que você pediu (LGPD, art. 7º, V).'],
          ['Enviar e-mails da conta:', 'confirmação de cadastro, redefinição de senha e avisos parecidos. Mesma base legal.'],
          ['Segurança:', 'evitar fraudes, abusos e acessos indevidos. Base legal: legítimo interesse (art. 7º, IX).'],
          ['Melhorar o produto:', 'entender, em números agregados, quais etapas funcionam e onde as pessoas desistem. Base legal: legítimo interesse.'],
          ['Comissão das lojas:', 'registrar cliques em links de presente para receber a comissão de afiliado. Base legal: legítimo interesse.'],
        ],
      },
      'Não vendemos seus dados. Hoje não enviamos e-mails de marketing. Se um dia enviarmos, vamos pedir sua autorização antes.',
    ],
  },
  {
    title: 'Quem vê o quê dentro do grupo',
    body: [
      {
        list: [
          ['Quem tem o link do grupo', 'vê o nome do grupo, o valor, a data, a lista de nomes e quem já entrou. Por isso, compartilhe o link só com quem participa.'],
          ['Cada participante', 'vê apenas quem ele mesmo tirou e a lista de presentes dessa pessoa.'],
          ['Quem organiza', 'vê no painel quem já abriu o link, quem já viu o resultado e quem já montou a lista. Não vê quem tirou quem.'],
        ],
      },
    ],
  },
  {
    title: 'Com quem compartilhamos',
    body: [
      'Usamos fornecedores que tratam dados em nosso nome, só para fazer o serviço funcionar:',
      {
        list: [
          ['Supabase:', 'banco de dados e login, com servidores em São Paulo.'],
          ['Vercel:', 'hospedagem do site.'],
          ['Google:', 'envio dos e-mails da conta pelo Gmail, login com Google e as fontes de texto do site.'],
          ['Apple:', 'login com Apple, para quem escolher essa opção.'],
          ['Lojas parceiras, como a Amazon:', 'quando você toca em um link de presente, a loja recebe a visita com a nossa identificação de afiliado. A partir daí vale a política de privacidade da loja.'],
          ['WhatsApp:', 'só quando você mesmo escolhe enviar o convite por lá.'],
        ],
      },
      'Alguns desses fornecedores podem processar dados fora do Brasil. Nesses casos, eles seguem padrões de proteção compatíveis com a LGPD.',
      'Também podemos compartilhar dados quando a lei ou uma ordem judicial exigir.',
    ],
  },
  {
    title: 'O que fica guardado no seu aparelho',
    body: [
      'O site e o app guardam no próprio aparelho o código aleatório que identifica sua participação, o rascunho do grupo que você está montando e sua sessão de login. Isso fica no armazenamento local do navegador ou do app.',
      'Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros. Se você apagar os dados do navegador, vai precisar escolher seu nome de novo no grupo. Quem organiza pode liberar o nome no painel.',
    ],
  },
  {
    title: 'Por quanto tempo guardamos',
    body: [
      'Guardamos os dados da conta enquanto ela existir e os dados do grupo enquanto ele existir, para que todos possam rever o resultado e a lista até a troca e depois dela.',
      `Você pode pedir a exclusão da sua conta ou de um grupo que organizou a qualquer momento pelo e-mail ${CONTACT_EMAIL}. Os registros técnicos ficam pelo prazo dos nossos provedores ou pelo prazo que a lei exigir.`,
    ],
  },
  {
    title: 'Seus direitos',
    body: [
      'Pela LGPD, você pode pedir a qualquer momento:',
      {
        list: [
          'confirmação de que tratamos seus dados e acesso a eles;',
          'correção de dados incompletos, errados ou desatualizados;',
          'anonimização, bloqueio ou exclusão de dados desnecessários ou tratados em desacordo com a lei;',
          'portabilidade dos dados para outro serviço;',
          'informação sobre com quem compartilhamos seus dados;',
          'exclusão dos dados, quando o tratamento depender do seu consentimento, e revogação desse consentimento.',
        ],
      },
      `Para exercer esses direitos, escreva para ${CONTACT_EMAIL}. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
      'Se alguém colocou seu nome em um grupo e você não quer participar, peça a quem organizou para remover você, ou escreva para nós.',
    ],
  },
  {
    title: 'Crianças e adolescentes',
    body: [
      'O amigo oculto da família costuma ter crianças. Quem organiza só deve incluir o nome de uma criança ou de um adolescente se for o responsável por ele ou tiver a autorização do responsável. Para crianças, use só o primeiro nome ou um apelido.',
      'Contas de organizador são para maiores de 18 anos.',
    ],
  },
  {
    title: 'Segurança',
    body: [
      'Toda conexão é cifrada (HTTPS). O banco de dados não pode ser lido diretamente: cada consulta passa por regras que conferem quem está pedindo. Os códigos dos aparelhos são guardados só em versão cifrada.',
      'Nenhum sistema é totalmente imune a falhas. Se acontecer um incidente que possa causar risco a você, vamos avisar você e a ANPD, como manda a lei.',
    ],
  },
  {
    title: 'Mudanças nesta política',
    body: [
      'Quando mudarmos esta política, a data no topo da página muda. Se a mudança for importante, avisamos no site ou por e-mail antes de ela valer.',
    ],
  },
];

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      metaTitle="Política de Privacidade · Amigo Oculto Já!"
      metaDescription="Quais dados o Amigo Oculto Já! guarda, para que usa, com quem compartilha e como pedir acesso ou exclusão."
      intro="O Amigo Oculto Já! organiza o sorteio do amigo oculto e a lista de presentes. Esta política explica, em linguagem direta, quais dados guardamos, por que guardamos e o que você pode pedir sobre eles."
      sections={sections}
      other={{ href: '/termos', label: 'Termos de Uso' }}
    />
  );
}
