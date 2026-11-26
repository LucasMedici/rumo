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
  Na API de produção: `TRUST_PROXY=true` (atrás do proxy da plataforma, senão o rate limit vê o IP do
  proxy para todo mundo) e `CORS_ORIGIN` com o domínio da web. Conferir os headers de segurança
  (CSP, HSTS) no domínio real e testar o login com Google/GitHub depois do deploy.
- [ ] **Publicar o login social com a identidade do Rumo** (GitHub e Google). Checklist detalhado
  na seção [Publicação do login social](#publicação-do-login-social) abaixo.
- [ ] **Revisar a configuração do Auth em produção** (a base foi revisada na etapa 1d, em localhost):
  - *Redirect URLs* só com o domínio de produção, de preferência restritas a `https://<dominio>/auth/callback**`
    em vez de `/**`.
  - **Enquanto o Rumo for de uso pessoal, desligar "Allow new users to sign up"** no deploy: o login
    com GitHub não passa por confirmação de e-mail, então qualquer pessoa com o link criaria uma conta.
  - **CAPTCHA (Cloudflare Turnstile)** no cadastro, login e recuperação de senha, para barrar bots
    quando o cadastro estiver aberto ao público (*Authentication → Attack Protection* + widget nos formulários).

### Publicação do login social

Hoje (2026-11) os dois provedores funcionam só em desenvolvimento: o OAuth App do GitHub está na conta
pessoal e o app do Google está em **modo de teste** (só os e-mails cadastrados como usuários de teste entram).

**Pré-requisitos (servem para os dois):**

- [ ] Domínio próprio e o app em produção (ver itens acima).
- [ ] **Logo** do Rumo em PNG quadrado (o Google pede 120×120 px, até 1 MB; o GitHub aceita imagem
  quadrada e permite escolher a cor de fundo do badge).
- [ ] **Páginas públicas de Política de Privacidade e Termos de Uso** no domínio (ex.: `/privacidade`
  e `/termos`). O Google exige a política para publicar.
- [ ] **E-mail de suporte no domínio** (ex.: `suporte@<dominio>`, pode ser só um encaminhamento
  para o Gmail via Cloudflare Email Routing).
- [ ] **(Opcional) Domínio personalizado no Supabase Auth** (ex.: `auth.<dominio>`, add-on pago).
  Sem ele, a tela do Google mostra "para continuar em **boyrsuqycecpsnvyxqtf.supabase.co**", que
  passa pouca confiança. Com ele, mostra o domínio do Rumo. Exige atualizar os callbacks nos dois provedores.

**GitHub** ([github.com/settings/developers](https://github.com/settings/developers)):

- [ ] Criar uma **organização** (grátis, ex.: `rumo-app`) e **transferir o OAuth App** para ela
  (*app → Transfer ownership*). A tela de autorização passa de "Rumo by LucasMedici" para "Rumo by rumo-app".
- [ ] Atualizar **logo**, **cor do badge**, **descrição** e **Homepage URL** (domínio de produção).
- [ ] Criar um **OAuth App separado para produção** (callback do projeto Supabase de produção ou do
  domínio personalizado) e manter o atual só para desenvolvimento.
- [ ] Gerar um **novo client secret** para produção e nunca reaproveitar o de desenvolvimento.

**Google** ([console.cloud.google.com](https://console.cloud.google.com), projeto `rumo-515900`, menu *Google Auth Platform*):

- [ ] **Branding**: nome `Rumo`, logo, e-mail de suporte, *Página inicial do app*, *Política de
  privacidade*, *Termos de serviço*, **domínios autorizados** (o domínio do Rumo) e contato do desenvolvedor.
- [ ] **Verificar a propriedade do domínio** no Google Search Console (exigido para domínios autorizados).
- [ ] **Clientes**: criar um cliente de produção com origem `https://<dominio>` e o callback de
  produção; manter o atual (com `localhost`) só para desenvolvimento.
- [ ] **Público-alvo → Publicar app** (status passa de *Teste* para *Em produção*).
- [ ] **Verificação de marca** do Google: como só pedimos escopos básicos (e-mail e perfil), não há
  verificação de escopos sensíveis, mas exibir **nome e logo** na tela de consentimento exige verificar
  a marca (*Central de verificação*). Leva alguns dias úteis; enquanto isso o login funciona sem o logo.

**Supabase:**

- [ ] Colar as credenciais de produção em *Authentication → Sign In / Providers* (GitHub e Google).
- [ ] *URL Configuration*: *Site URL* e *Redirect URLs* com o domínio de produção, sem `localhost`.

## 🟡 Antes de virar SaaS

- [ ] **Usuário de banco com privilégio mínimo** (`rumo_app`, acesso só ao schema `rumo`) em vez de
  conectar como `postgres`. Limita o estrago em caso de vazamento do `.env` ou falha na API.
- [ ] **Send Email Hook**: a API passa a enviar os e-mails de auth via Resend, com templates em React
  (React Email) e idioma do usuário — um layout único para todos os e-mails do Rumo.
- [ ] **Plano do Supabase**: o Free pausa o projeto após ~1 semana sem uso e tem 500 MB de banco.
  Avaliar o Pro quando houver usuários reais. O Pro também libera recursos de segurança do Auth:
  **bloqueio de senhas vazadas** (HaveIBeenPwned) e **limite de tempo / inatividade das sessões**.
- [ ] **Autenticação em dois fatores (MFA/TOTP)** opcional para os usuários (o Supabase Auth suporta
  TOTP no plano Free; precisa de telas de cadastro e verificação do código).
- [ ] **Cota de Log Ingestion da organização (1 GB/mês no Free, cobrada a partir do início de 2027)**.
  A cota é compartilhada entre todos os projetos da organização; em 2026-11 o projeto
  *finance-assistent* respondia por ~0,47 GB e o Rumo por < 0,01 GB. Investigar a origem no outro
  projeto (Logs Explorer) e, quando o worker com pg-boss existir (etapa 4), conferir que ele não gera logs.
  **Causa encontrada (2026-11-24):** Data API desligada faz o PostgREST logar `pg_pgrst_no_exposed_schemas`
  a cada ~30s. Solução: religar expondo só o `public`. Conferir no Rumo e no finance-assistent se o
  contador de logs do PostgREST zerou.
- [ ] **CSP mais estrita na web** (hoje sem nonce, com `'unsafe-inline'` em scripts, para manter as
  páginas estáticas): avaliar o SRI experimental do Next ou nonces quando houver conteúdo de terceiros.
- [ ] **Testes de segurança do banco no CI** (hoje rodam só localmente): usar um banco de CI
  ou um segredo de leitura no GitHub Actions.

## 🎨 Produto e interface

- [x] **Etapa de design — arquitetura e cores (2026-11-25).** Menu lateral de hub; tema claro (verde
  profundo + limão nos destaques) e escuro (grafite + limão como primária); alternância Claro/Escuro/Automático.
- [ ] **Identidade visual — o que falta**: logo/símbolo do Rumo (hoje um ícone de bússola provisório),
  tipografia (hoje Geist, padrão do template; avaliar uma fonte com mais personalidade), favicon e
  imagem de compartilhamento. Referências que o usuário citou: [lumiaclin.com.br](https://lumiaclin.com.br/),
  [hooby.com.br](https://hooby.com.br/), [abacatepay.com](https://www.abacatepay.com/).
- [ ] **Decidir o tema principal** (claro ou escuro) quando houver mais uso real; hoje o padrão é
  "Automático" (segue o sistema operacional).
- [ ] **i18n da interface** (pt-BR / en).
- [ ] **Landing page** de verdade na home (`/`).

## 🔎 Fontes de vagas (depois do MVP)

- [ ] **Import manual com preenchimento automático pelo link**: ao colar a URL da vaga, ler os dados
  estruturados da página (`schema.org/JobPosting` em JSON-LD, que ATS como Greenhouse, Lever, Gupy e
  o próprio LinkedIn costumam publicar) e preencher o formulário. Respeitar termos de uso: só a página
  que o usuário colou, sob demanda.
- [ ] **Import manual com IA**: colar o texto da vaga e um LLM separa cargo, empresa, senioridade,
  modalidade, salário e requisitos. Útil também para extrair skills (etapa 8).

- [ ] **Descoberta automática de boards ATS**: quando uma vaga de agregador aponta para
  Greenhouse/Lever/Ashby, passar a buscar todas as vagas daquela empresa direto na fonte.
- [ ] **Ingestão de alertas por e-mail** (LinkedIn, Gupy, Indeed): filtro no Gmail encaminha os
  alertas para um endereço do Rumo, que extrai as vagas. Precisa do domínio próprio.
- [ ] **Extensão de navegador** "Salvar no Rumo" para capturar a vaga que você está vendo.
- [ ] **Adapter Gupy opcional** (endpoint não oficial; só após ler os termos de uso; desligado por padrão).
- [ ] **Robôs para sites específicos**: avaliar site a site (termos de uso + robots.txt), como
  adapters opcionais. LinkedIn/Indeed/Glassdoor estão fora (proibido nos termos).
- [ ] **Match semântico com embeddings** (`pgvector`) e análise por LLM sob demanda para as vagas do topo.
