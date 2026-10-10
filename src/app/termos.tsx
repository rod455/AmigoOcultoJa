import React from 'react';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/features/legal/LegalPage';

const sections: LegalSection[] = [
  {
    title: 'Aceite',
    body: [
      'Ao usar o Amigo Oculto Já!, no site amigoocultoja.com.br ou nos aplicativos, você concorda com estes Termos e com a Política de Privacidade. Se não concordar, não use o serviço.',
    ],
  },
  {
    title: 'O que é o serviço',
    body: [
      'O Amigo Oculto Já! permite montar um grupo de amigo oculto, sortear quem tira quem, enviar o convite por um link e montar listas de presentes.',
      'O uso é gratuito. Ganhamos uma comissão das lojas quando alguém compra pelos links de presente. O preço para quem compra é o mesmo.',
    ],
  },
  {
    title: 'Conta de quem organiza',
    body: [
      'Para sortear, quem organiza cria uma conta com Google, Apple ou e-mail e senha. Quem só participa não precisa de conta.',
      {
        list: [
          'Você precisa ter 18 anos ou mais para criar uma conta.',
          'Use dados verdadeiros e mantenha sua senha em segredo.',
          'Você é responsável pelo que acontece na sua conta. Se perceber um acesso indevido, avise a gente.',
        ],
      },
    ],
  },
  {
    title: 'Responsabilidades de quem organiza',
    body: [
      {
        list: [
          'Inclua no grupo só pessoas que sabem e aceitam participar.',
          'Para crianças e adolescentes, inclua o nome apenas se você for o responsável ou tiver a autorização do responsável.',
          'Não coloque no nome do grupo nem nos nomes dos participantes informações sensíveis, como saúde, religião ou documentos.',
          'Compartilhe o link do grupo só com quem participa. Quem tem o link vê o nome do grupo e a lista de nomes.',
        ],
      },
    ],
  },
  {
    title: 'Regras para quem participa',
    body: [
      'Escolha apenas o seu próprio nome na lista. O nome fica ligado ao seu aparelho. Se escolher errado, peça a quem organiza para liberar.',
      'Não tente descobrir o resultado de outras pessoas.',
    ],
  },
  {
    title: 'O que não é permitido',
    body: [
      {
        list: [
          'usar o serviço para algo ilegal, ofensivo, discriminatório ou para enviar spam;',
          'tentar acessar resultados, contas ou dados de outras pessoas;',
          'tentar burlar a segurança, sobrecarregar o serviço ou usar robôs para criar grupos em massa;',
          'copiar a marca, o logotipo ou o visual do Amigo Oculto Já! para se passar pelo serviço.',
        ],
      },
      'Podemos suspender contas e remover grupos que desrespeitem estas regras.',
    ],
  },
  {
    title: 'Presentes e lojas',
    body: [
      'Não vendemos produtos. As sugestões e os links de presente levam para lojas parceiras, como a Amazon. A compra, o pagamento, a entrega, a troca e a garantia são feitos com a loja, de acordo com as regras dela.',
      'Preços e disponibilidade mostrados aqui podem mudar na loja. O valor que vale é o que aparece na loja na hora da compra.',
    ],
  },
  {
    title: 'Disponibilidade do serviço',
    body: [
      'Trabalhamos para o serviço funcionar sempre, mas ele pode ficar fora do ar por manutenção, falhas de fornecedores ou motivos fora do nosso controle. Podemos mudar, melhorar ou encerrar funcionalidades. Se formos encerrar o serviço, vamos avisar com antecedência para que os grupos possam ser concluídos.',
    ],
  },
  {
    title: 'Responsabilidade',
    body: [
      'Respondemos pelo serviço nos termos da lei, inclusive do Código de Defesa do Consumidor. Não respondemos por compras feitas nas lojas parceiras, por combinados entre os participantes nem pelo uso do link por pessoas com quem você o compartilhou.',
    ],
  },
  {
    title: 'Propriedade intelectual',
    body: [
      'A marca Amigo Oculto Já!, o logotipo, o símbolo, os textos e o código do serviço pertencem ao Amigo Oculto Já!. O que você escreve, como nomes e listas, continua sendo seu. Você nos autoriza a usar esse conteúdo só para fazer o serviço funcionar.',
    ],
  },
  {
    title: 'Encerramento',
    body: [
      `Você pode parar de usar o serviço quando quiser e pedir a exclusão da sua conta e dos seus grupos pelo e-mail ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'Mudanças nestes Termos',
    body: [
      'Quando mudarmos estes Termos, a data no topo da página muda. Se a mudança for importante, avisamos no site ou por e-mail antes de ela valer. Continuar usando o serviço depois disso significa que você aceita a nova versão.',
    ],
  },
  {
    title: 'Lei e foro',
    body: [
      'Estes Termos seguem as leis do Brasil. Eventuais disputas serão resolvidas no foro do domicílio do consumidor.',
    ],
  },
];

export default function Termos() {
  return (
    <LegalPage
      title="Termos de Uso"
      metaTitle="Termos de Uso · Amigo Oculto Já!"
      metaDescription="As regras para usar o Amigo Oculto Já!: conta de quem organiza, participantes, links de presente e responsabilidades."
      intro="Estes são os combinados para usar o Amigo Oculto Já!. Escrevemos de forma direta para que todo mundo do grupo entenda."
      sections={sections}
      other={{ href: '/privacidade', label: 'Política de Privacidade' }}
    />
  );
}
