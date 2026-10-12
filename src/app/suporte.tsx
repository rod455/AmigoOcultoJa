import React from 'react';
import { CONTACT_EMAIL, LegalPage, type LegalSection } from '@/features/legal/LegalPage';

/**
 * "/suporte": a URL de suporte das lojas (App Store e Google Play). Só o que
 * o app faz hoje; mudou o fluxo, mude aqui.
 */
const sections: LegalSection[] = [
  {
    title: 'Fale com a gente',
    body: [
      `Escreva para ${CONTACT_EMAIL} contando o que aconteceu, o nome do grupo e, se puder, um print da tela. Respondemos por e-mail.`,
    ],
  },
  {
    title: 'Problemas mais comuns',
    body: [
      {
        list: [
          ['Escolhi o nome errado no grupo.', 'Peça para quem organiza: no painel do grupo dá para liberar o nome em um toque, e você escolhe de novo.'],
          ['Troquei de celular ou limpei o navegador e o grupo pede o nome de novo.', 'O nome escolhido fica guardado no aparelho. Peça para quem organiza liberar o seu nome no painel e escolha de novo no aparelho novo.'],
          ['O link do convite não abre.', 'Confira se o link está completo (amigoocultoja.com.br/g/ seguido do código). Se preferir, abra o app ou o site, toque em "Tenho um convite" e cole o link ou o código.'],
          ['Não recebi o e-mail de confirmação da conta.', 'Procure na caixa de spam e em Promoções. O link vale por pouco tempo: se expirou, tente entrar de novo e peça outro.'],
          ['Esqueci a senha.', 'Na tela de conta, toque em "Já tenho conta", digite o e-mail e toque em "Esqueci minha senha". O link chega por e-mail.'],
          ['Alguém saiu ou entrou depois do sorteio.', 'Quem organiza remove ou adiciona a pessoa no painel. O sorteio é refeito com a menor troca possível, e só quem teve o resultado alterado vê um aviso.'],
          ['O sorteio diz que é impossível.', 'Acontece quando há restrições demais de "quem não pode tirar quem". O app mostra qual delas trava; tire uma e sorteie de novo.'],
        ],
      },
    ],
  },
  {
    title: 'Sua conta e seus dados',
    body: [
      'Para sair ou excluir a conta, abra amigoocultoja.com.br/minha-conta (no app: toque no seu nome na tela inicial). A exclusão apaga nome, e-mail e login; os grupos que você criou continuam funcionando para quem participa.',
      'Quem só participa de um grupo não tem conta: o link basta.',
    ],
  },
];

export default function Suporte() {
  return (
    <LegalPage
      title="Ajuda e suporte"
      metaTitle="Ajuda e suporte | Amigo Oculto Já!"
      metaDescription="Fale com o Amigo Oculto Já! e resolva os problemas mais comuns: nome escolhido por engano, link do convite, e-mail de confirmação, senha e exclusão da conta."
      intro="Algo não funcionou no seu amigo oculto? Veja as soluções mais comuns abaixo ou escreva para a gente."
      sections={sections}
      other={{ href: '/privacidade', label: 'Política de Privacidade' }}
      path="/suporte"
    />
  );
}
