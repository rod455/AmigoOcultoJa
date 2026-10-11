-- Catálogo inicial com produtos reais da Amazon (links com o ID de associado).
-- Preço aproximado (out/2026, pesquisa) serve só para filtrar pelo valor do grupo;
-- a interface mostra a faixa ("Até R$ 100"), nunca o preço exato.
update public.products set active = false where active and affiliate_url not like '%/dp/%';
insert into public.products (name, price_cents, store, affiliate_url, tags, active) values
  ('Jogo de cartas Uno', 1490, 'amazon', 'https://www.amazon.com.br/dp/B00CTH0A1Q?tag=amigoocultoja-20', array['jogos'], true),
  ('Livro Hábitos Atômicos', 4963, 'amazon', 'https://www.amazon.com.br/dp/8550807567?tag=amigoocultoja-20', array['livros'], true),
  ('Livro A Psicologia Financeira', 3290, 'amazon', 'https://www.amazon.com.br/dp/6555111100?tag=amigoocultoja-20', array['livros'], true),
  ('Livro A Biblioteca da Meia-Noite', 4392, 'amazon', 'https://www.amazon.com.br/dp/6558380544?tag=amigoocultoja-20', array['livros'], true),
  ('Lâmpada inteligente Positivo Wi-Fi', 4799, 'amazon', 'https://www.amazon.com.br/dp/B082FTRR76?tag=amigoocultoja-20', array['tecnologia','casa'], true),
  ('Kit 2 loções Nivea Milk 400 ml', 3679, 'amazon', 'https://www.amazon.com.br/dp/B08S98LL48?tag=amigoocultoja-20', array['beleza'], true),
  ('Quebra-cabeça Grow 1000 peças', 4800, 'amazon', 'https://www.amazon.com.br/dp/B0CLMD5J49?tag=amigoocultoja-20', array['jogos','casa'], true),
  ('Planner Tilibra 2027', 2490, 'amazon', 'https://www.amazon.com.br/dp/B0H8QHYGWL?tag=amigoocultoja-20', array['papelaria'], true),
  ('Café 3 Corações Gourmet Sul de Minas', 3199, 'amazon', 'https://www.amazon.com.br/dp/B086F9M5T8?tag=amigoocultoja-20', array['cafe'], true),
  ('Tapete de yoga EVA 170x60 cm', 4390, 'amazon', 'https://www.amazon.com.br/dp/B0872DQVGF?tag=amigoocultoja-20', array['bem-estar'], true),
  ('Copo térmico Stanley 473 ml', 9900, 'amazon', 'https://www.amazon.com.br/dp/B079Y8XFNN?tag=amigoocultoja-20', array['bebidas','cozinha'], true),
  ('Mouse sem fio Logitech M280', 6990, 'amazon', 'https://www.amazon.com.br/dp/B00UC1R80C?tag=amigoocultoja-20', array['tecnologia','trabalho'], true),
  ('Hidratante CeraVe 473 ml', 8183, 'amazon', 'https://www.amazon.com.br/dp/B07RK4HST7?tag=amigoocultoja-20', array['beleza'], true),
  ('Jogo Imagem e Ação 2', 11990, 'amazon', 'https://www.amazon.com.br/dp/B077PLFYWF?tag=amigoocultoja-20', array['jogos'], true),
  ('Kit churrasco Tramontina 3 peças', 7599, 'amazon', 'https://www.amazon.com.br/dp/B08BVXTRLB?tag=amigoocultoja-20', array['cozinha','casa'], true),
  ('Jogo Perfil', 8548, 'amazon', 'https://www.amazon.com.br/dp/B07B9JC95Z?tag=amigoocultoja-20', array['jogos'], true),
  ('Kit Granado Lavanda lata presente', 7599, 'amazon', 'https://www.amazon.com.br/dp/B0CS3PW52L?tag=amigoocultoja-20', array['beleza','bem-estar'], true),
  ('Jogo Banco Imobiliário Brasil', 9880, 'amazon', 'https://www.amazon.com.br/dp/B07BZ1K7D5?tag=amigoocultoja-20', array['jogos'], true),
  ('6 taças de vinho Bohemia 450 ml', 9990, 'amazon', 'https://www.amazon.com.br/dp/B00A8G2OIM?tag=amigoocultoja-20', array['casa','bebidas'], true),
  ('Jogo Dixit', 17574, 'amazon', 'https://www.amazon.com.br/dp/B0GY9HMVLF?tag=amigoocultoja-20', array['jogos'], true),
  ('Café Orfeu Clássico em grãos 1 kg', 13600, 'amazon', 'https://www.amazon.com.br/dp/B07HDSL78H?tag=amigoocultoja-20', array['cafe'], true),
  ('Barbeador Philips OneBlade', 14900, 'amazon', 'https://www.amazon.com.br/dp/B0C2J8DQC1?tag=amigoocultoja-20', array['beleza','tecnologia'], true),
  ('Fone sem fio QCY T13 ANC', 18598, 'amazon', 'https://www.amazon.com.br/dp/B0BX9G9C78?tag=amigoocultoja-20', array['tecnologia'], true),
  ('Caneca térmica Stanley Café Go 236 ml', 15699, 'amazon', 'https://www.amazon.com.br/dp/B0F621PCHN?tag=amigoocultoja-20', array['cafe','bebidas'], true),
  ('Echo Pop com Alexa', 35900, 'amazon', 'https://www.amazon.com.br/dp/B09ZXN77L2?tag=amigoocultoja-20', array['tecnologia','casa'], true),
  ('Fire TV Stick HD', 24690, 'amazon', 'https://www.amazon.com.br/dp/B0DVK166SV?tag=amigoocultoja-20', array['tecnologia','casa'], true),
  ('Fone JBL Tune 520BT', 23900, 'amazon', 'https://www.amazon.com.br/dp/B0C3V5X3QT?tag=amigoocultoja-20', array['tecnologia'], true),
  ('Caixa de som JBL Go 3', 24000, 'amazon', 'https://www.amazon.com.br/dp/B08FB396L1?tag=amigoocultoja-20', array['tecnologia'], true);
