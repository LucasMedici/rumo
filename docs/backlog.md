# Backlog — pendências e melhorias

Lista viva de coisas para fazer "quando der tempo", fora do roadmap principal do MVP.
Cada item tem o **porquê** e **quando** faz sentido. Marque `[x]` ao concluir (ou remova).

> O roadmap do MVP fica no README. Aqui ficam melhorias, dívidas técnicas e ideias.

## 🔴 Antes de abrir para outros usuários / deploy

- [ ] **Domínio próprio** (ex.: `rumo.com.br` no registro.br ou `.app`/`.com` na Cloudflare).
  Necessário para e-mail profissional e para o deploy. ~R$ 40/ano (`.com.br`) ou ~US$ 10–15/ano.
- [ ] **SMTP próprio no Supabase Auth com Resend.**
  O SMTP padrão do Supabase só entrega para membros da equipe do projeto e tem limite de poucos
  e-mails/hora — **outros usuários não recebem confirmação de cadastro sem isso**.
  Passos: cadastrar domínio no Resend → registros DNS (SPF, DKIM, DMARC) → Supabase
  *Authentication → Emails → SMTP Settings* → remetente `nao-responda@<dominio>`.
- [ ] **Templates de e-mail em pt-BR com a identidade do Rumo** (confirmação, recuperação de senha,
  troca de e-mail). Guardar o HTML versionado no repositório e aplicar no Supabase.
- [ ] **Deploy**: web na Vercel, API + worker em container (Railway/Fly.io/Render), apontando o domínio.
  Atualizar *Site URL* e *Redirect URLs* do Supabase Auth para o domínio de produção.
- [ ] **Revisar a configuração do Auth em produção** (etapa 1d): confirmação de e-mail, senha mínima
  (no painel novo a opção não foi encontrada em *Providers → Email*; procurar em *Attack Protection*),
  limites de tentativa, lista de redirects sem `localhost`.

## 🟡 Antes de virar SaaS

- [ ] **Usuário de banco com privilégio mínimo** (`rumo_app`, acesso só ao schema `rumo`) em vez de
  conectar como `postgres`. Limita o estrago em caso de vazamento do `.env` ou falha na API.
- [ ] **Send Email Hook**: a API passa a enviar os e-mails de auth via Resend, com templates em React
  (React Email) e idioma do usuário — um layout único para todos os e-mails do Rumo.
- [ ] **Plano do Supabase**: o Free pausa o projeto após ~1 semana sem uso e tem 500 MB de banco.
  Avaliar o Pro quando houver usuários reais.
- [ ] **Testes de segurança do banco no CI** (hoje rodam só localmente): usar um banco de CI
  ou um segredo de leitura no GitHub Actions.

## 🎨 Produto e interface

- [ ] **Identidade visual** do app (cores, tipografia, logo), inspirada nas referências:
  [lumiaclin.com.br](https://lumiaclin.com.br/), [hooby.com.br](https://hooby.com.br/),
  [abacatepay.com](https://www.abacatepay.com/). Hoje usamos o tema neutro padrão do shadcn/ui.
- [ ] **Modo escuro** com alternância (o shadcn já tem os tokens `.dark`).
- [ ] **i18n da interface** (pt-BR / en).
- [ ] **Landing page** de verdade na home (`/`).

## 🔎 Fontes de vagas (depois do MVP)

- [ ] **Descoberta automática de boards ATS**: quando uma vaga de agregador aponta para
  Greenhouse/Lever/Ashby, passar a buscar todas as vagas daquela empresa direto na fonte.
- [ ] **Ingestão de alertas por e-mail** (LinkedIn, Gupy, Indeed): filtro no Gmail encaminha os
  alertas para um endereço do Rumo, que extrai as vagas. Precisa do domínio próprio.
- [ ] **Extensão de navegador** "Salvar no Rumo" para capturar a vaga que você está vendo.
- [ ] **Adapter Gupy opcional** (endpoint não oficial; só após ler os termos de uso; desligado por padrão).
- [ ] **Robôs para sites específicos**: avaliar site a site (termos de uso + robots.txt), como
  adapters opcionais. LinkedIn/Indeed/Glassdoor estão fora (proibido nos termos).
- [ ] **Match semântico com embeddings** (`pgvector`) e análise por LLM sob demanda para as vagas do topo.
