# Pesquisa: fontes de vagas

> Pesquisa feita em **2026-11-27**, conferindo páginas e endpoints ao vivo. Termos de uso e preços
> mudam: **reconfira antes de integrar uma fonte** (a Adzuna parecia gratuita pela documentação e
> exigia plano pago). Legenda: **[V]** verificado ao vivo · **[S]** fonte secundária · **[I]** inferência.

## Resumo e decisões

| Prioridade | Fonte | Por quê | Status no roadmap |
|---|---|---|---|
| 1 | **ATS públicos (Greenhouse, Lever, Ashby)** + descoberta automática de empresas | Descrição completa, sem chave, uso público. Onde estão as vagas de empresas de IA (FDE) e de techs brasileiras | Etapa 4 (lista inicial) e 4.5 (descoberta) |
| 2 | **Himalayas** | ~118 mil vagas, ~5.600 com filtro Brasil, sem chave, termos permitem exibir | Etapa 4 |
| 3 | **Alertas por e-mail** (LinkedIn, Gupy, Indeed, Glassdoor) | Único caminho limpo para LinkedIn e Gupy | Depois (exige domínio próprio) |
| 4 | Feeds pequenos (Jobicy, RemoteOK, HN "Who is hiring", Working Nomads, Arbeitnow) | Pouco volume cada, alta relevância; o HN também alimenta a descoberta de ATS | Conforme necessidade |
| — | **Já integradas:** Remotive (etapa 3a), GitHub Issues `backend-br/vagas` e similares (3b) | Volume baixo (17 e ~60 vagas) | ✅ |
| ✗ | Adzuna | Exige plano pago (~5.000/mês) | Descartada |

## A. Internacional

| Fonte | Acesso | Chave/custo | Volume | Termos | Risco pessoal | Risco comercial |
|---|---|---|---|---|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | nenhuma | Stripe: 771 [V] | Só POST exige auth; "Requests may be rate limited". Sem cláusula sobre terceiros [V] | Baixo | Baixo–médio |
| Lever | `api.lever.co/v0/postings/{site}?mode=json` | nenhuma | Palantir: 305 [V] | "These jobs may be scraped by third parties"; campo `salaryRange` opcional [V] | Baixo | Baixo–médio |
| Ashby | `api.ashbyhq.com/posting-api/job-board/{name}?includeCompensation=true` | nenhuma | Ramp: 183 [V] | Sem termos nem limites na documentação [V] | Baixo | Baixo–médio |
| SmartRecruiters | `api.smartrecruiters.com/v1/companies/{id}/postings` | a lista respondeu sem chave; docs dizem chave/OAuth [V] | por empresa | Pouco claro | Baixo | Médio |
| Workable | `apply.workable.com/api/v1/widget/accounts/{slug}` | nenhuma [V] | por empresa | Não documentado oficialmente [S] | Baixo | Médio |
| Recruitee | `{empresa}.recruitee.com/api/offers/` | nenhuma hoje; token obrigatório após 10/02/2027 [S] | por empresa | Documentação oficial [S] | Baixo | Baixo |
| Personio | `{empresa}.jobs.personio.de/xml` | nenhuma [V] | por empresa | Feed XML oficial [S] | Baixo | Baixo |
| Teamtailor | `{site}/jobs.rss` | nenhuma [V] | por empresa | Não conferido | Baixo | Baixo–médio |
| **Himalayas** | `himalayas.app/jobs/api` (cursor) e `/jobs/api/search` | nenhuma; 60 req/min, 10.000/dia com chave [V] | 118.077 [V] | "Show a visible link to the job on Himalayas"; candidatura pelo `applicationLink` **sem alterar**; "Do not pass them on to other job boards, aggregators, Google Jobs or LinkedIn Jobs" [V] | Baixo | Baixo (seguindo as regras) |
| Jobicy | `jobicy.com/api/v2/remote-jobs` | nenhuma | 100 por página [V] | "Our free Jobs API can be used in commercial projects"; crédito com link; "no more than once per hour" [V] | Baixo | Baixo |
| RemoteOK | `remoteok.com/api` | nenhuma | 100 mais recentes [V] | "Please link back (with follow…)… If you do not we'll have to suspend API access" [V] | Baixo | Baixo |
| We Work Remotely | RSS por categoria | nenhuma | 25–100 [V] | Termos da API proíbem "scraping, copying, saving, or storing" (página deu 403) [S] | Baixo | Médio — **não armazenar** até esclarecer |
| Arbeitnow | `arbeitnow.com/api/job-board-api` | nenhuma | 300/página, foco Alemanha [V] | "For commercial use, please get in touch and propose a monthly fee" [V] | Baixo | Exige acordo |
| Working Nomads | `workingnomads.com/api/exposed_jobs/` | nenhuma | 37 [V] | Não conferido | Baixo | ? |
| HN "Who is hiring" | API Algolia `hn.algolia.com/api/v1/items/{id}` | nenhuma | nov/2026: 237 posts, 198 citam remoto, 8 citam Brasil/LATAM [V] | Não conferido | Baixo | Baixo–médio |
| Jooble | formulário em `jooble.org/api/about` | "free key on request" [S]; possível limite de 500 req por chave [S] | ? | Uma chave por país; ToS do site proíbe bots [S] | Baixo | Incerto |

Descartadas: Remote.co (sem feed), JustJoin.it (endpoint 404, foco Polônia).

### Descoberta automática de empresas (ATS)

Todas legítimas, sem login:

- **HN "Who is hiring"** [V]: a thread de novembro linka 33 boards distintos (94 links para o Ashby).
- **Índice do Common Crawl (CDX)** [V]: no `CC-MAIN-2026-47`, `jobs.ashbyhq.com/*` deu 309 empresas nas primeiras 3.000 linhas e `job-boards.greenhouse.io/*` deu 148 (paginado: há mais).
- **Sondar uma lista conhecida** (diretório do YC, empresas de IA, techs brasileiras) nos três ATS: três GETs baratos por empresa.
- Buscadores funcionariam, mas os termos do Google proíbem consultas automatizadas [I].

### Empresas brasileiras com volume nos ATS [V]

Stone 247 vagas (Greenhouse) · **Nubank 108 (Ashby)** · QuintoAndar 99 (Greenhouse) · EBANX 40 · VTEX 27 · Wildlife 15 (Greenhouse).

## B. Brasil: Gupy e LinkedIn

| | Gupy | LinkedIn |
|---|---|---|
| API para candidatos | **Não existe.** `developers.gupy.io` é para empresas clientes [S] | **Não existe.** A API de vagas é só para parceiros publicarem, e "We are currently not accepting new partnerships" [V] |
| Como o site expõe os dados | `portal.gupy.io/job-search/...` e `{empresa}.gupy.io` renderizam as vagas no `__NEXT_DATA__` da página [V]; os endpoints JSON citados por terceiros retornaram 404 [V] | Endpoints "guest" usados por scrapers; o robots.txt proíbe `/jobs-guest/` e `/api/jobPostings/jobs*` [V] |
| Termos | Versão de 01/07/2026 proíbe "**agregar, copiar ou duplicar partes do Gupy Recrutamento e Seleção, incluindo oportunidades de trabalho expiradas**" e "forjar cabeçalhos TCP/IP"; sanção: "suspensão ou cancelamento de cadastro" [V] | User Agreement (3/11/2025) §8.2 proíbe "software, devices, scripts, robots… (such as crawlers, browser plugins and add-ons…) to scrape or copy the Services" [V] |
| Precedente | — | hiQ x LinkedIn (2022): LinkedIn venceu por quebra de contrato; acordo de US$ 500 mil e liminar [S] |
| Risco pessoal (robô) | Baixo–médio: sem login, o risco é bloqueio de IP, mas fere os termos | **Alto**: conta restrita ou banida |
| Risco comercial | **Alto** ("agregar" é exatamente o que um agregador faz) | **Alto** |
| **Caminho recomendado** | Alertas por e-mail | Alertas por e-mail |

Outras fontes brasileiras: Coodesh tem sitemap com 66 vagas em schema.org/JobPosting [V]; Programathor e Trampos têm sitemaps e robots liberado [V] (termos não conferidos); Vagas.com.br bloqueia `/api/` no robots [V]; Catho e InfoJobs sem API pública [S]; Remotar, InHire, Solides e Recrutei sem API para candidatos [S/I]; GeekHunter e Revelo são marketplaces de talentos, sem feed [I].

## C. Ingestão de alertas por e-mail (planejado para depois)

| Opção | Custo | Observações |
|---|---|---|
| **Filtro do Gmail → encaminha para um endereço do Rumo no Cloudflare Email Routing → Worker extrai e envia para a API** | Plano grátis dos Workers [V] | Limite de 25 MiB por mensagem e 200 regras por domínio; parsing pesado pode estourar a CPU do plano grátis, então fazer o mínimo no Worker [V]. Independe de provedor e serve para SaaS (um endereço por usuário). **Recomendado.** |
| API do Gmail (OAuth) | grátis | `gmail.readonly` é escopo **restrito**: armazenar os dados no servidor exige avaliação de segurança (CASA) para uso comercial [V]. Em modo de teste, os tokens expiram em 7 dias [S] |
| IMAP com senha de app | grátis | Mais simples para um usuário só; não serve para SaaS [I] |

Conteúdo dos alertas: o LinkedIn traz cargo, "Empresa · Cidade (Híbrido)" e um link com o id da vaga [S]. A Gupy enviava recomendações a cada 2 semanas (post de 2022, não confirmado para 2026) [S]. **Capturar e-mails reais de exemplo antes de implementar.**

Ler o próprio e-mail não fere os termos de nenhum dos dois (nenhum menciona isso) [I]. **Não seguir os links automaticamente para baixar a página da vaga**: isso volta a ser scraping.

## D. Automação de navegador

| Abordagem | LinkedIn | Gupy |
|---|---|---|
| Robô automático (Playwright/Puppeteer, mesmo no seu navegador logado) | Proibido (§8.2) [V]; a central de ajuda diz que membros "risk having their accounts restricted or shut down" [V]. **Não recomendado** | Sem login: o risco é bloqueio de IP [I]; fere a cláusula "agregar, copiar" [V]. Zona cinzenta no uso pessoal; proibido no comercial |
| Botão "Salvar no Rumo" numa extensão, clicado pelo usuário (modelo Huntr/Teal/Simplify) | O texto ainda cobre "browser plugins… to scrape or copy" [V], mas o risco por clique é muito menor e esses produtos operam abertamente [I] | Baixo [I] |

## E. Vagas de FDE (Forward Deployed Engineer) e cargos de IA

Boards conferidos ao vivo; cargos contados por expressão regular no título.

| Empresa | ATS: token | Vagas / de IA ou FDE / de FDE | Brasil/LATAM |
|---|---|---|---|
| OpenAI | Ashby: `openai` | 876 / 135 / 44 | **Sim**: 8 vagas em São Paulo marcadas como remotas ("Applied AI Architect (Brazil)", "Applied AI Engineer, Startups", "Partner Applied AI Engineer - LATAM") |
| Databricks | Greenhouse: `databricks` | 889 / 333 / 111 | **Sim**: "Evergreen - FDE Brazil", Solutions Architect em São Paulo |
| Cognition | Ashby: `cognition` | 120 / 17 / 13 | **Sim**: "Forward Deployed Engineer - LATAM" (São Paulo) |
| Decagon | Ashby: `decagon` | 101 / 8 / 0 | **Sim**: "Agent Deployment Engineer - Spanish & Portuguese Speaking" (Brasil, remoto) |
| Glean | Greenhouse: `gleanwork` | 121 / 19 / 3 | Solutions Engineer LATAM (São Paulo) |
| ElevenLabs | Ashby: `elevenlabs` | 108 / 13 / 5 | Só vagas não técnicas em LATAM |
| Cursor | Ashby: `cursor` | 87 / 11 / 11 | Só vendas em LATAM |
| Harvey | Ashby: `harvey` | 387 / 9 / 4 | Só vendas/CS em São Paulo |
| Palantir | Lever: `palantir` | 305 / 93 / 69 | Não |
| Anthropic | Greenhouse: `anthropic` | 634 / 68 / 8 | Não |
| Scale AI | Greenhouse: `scaleai` | 158 / 30 / 11 | Não |
| Cohere | Ashby: `cohere` | 121 / 13 / 10 | Não (Europa, Oriente Médio) |
| Sierra | Ashby: `sierra` | 203 / 0 / 0 | Os títulos são "Software Engineer, Agent", que a lista de termos não pega |
| Outras com FDE | Ashby: `baseten`, `modal`, `replit`, `n8n`, `lovable`, `ramp`, `writer`, `perplexity`, `hebbia-ai`, `langchain`. Greenhouse: `togetherai`, `vercel` | | Não visto |

Não encontradas pelos tokens óbvios: Mistral, Rippling.

- **Brasil/LATAM existe, mas é restrito**: OpenAI, Databricks, Cognition e Decagon, em geral exigindo morar no Brasil ou perto de São Paulo. A maioria das vagas de FDE é presencial nos EUA, no Reino Unido ou na Europa.
- **Termos para identificar** (no título, sem diferenciar maiúsculas): `forward[- ]deployed`, `\bFDE\b`, `deployment (engineer|strategist)`, `applied (AI|ML)`, `AI engineer`, `AI (solutions|deployment) (engineer|architect)`, `solutions (engineer|architect)`, `agent (engineer|development)`, `LLM`, `GenAI`, `AI product engineer`, `customer engineer`.
- **Olhar também a descrição**: "Software Engineer, Agent" (Sierra) escapa dos termos, e "Forward Deployed **Banker**" (Hebbia) casa sem ser vaga de engenharia.

## O que NÃO fazer

- **Nada de robô, coleta de endpoints "guest" ou automação logada no LinkedIn**: fere o §8.2 e o robots.txt, o risco de banimento é real e há precedente judicial.
- **Nada de agregar vagas da Gupy num produto comercial** ("agregar, copiar ou duplicar").
- **Não burlar proteções anti-bot** (rotação de proxy, falsificar fingerprint ou cabeçalhos).
- **Não coletar** Wellfound, YC Work at a Startup, Indeed nem Glassdoor: os termos proíbem. A lista de empresas do YC só serve para descobrir os ATS delas.
- **Não republicar vagas da Himalayas** nem alterar os links de candidatura delas. **Não armazenar dados do We Work Remotely** até esclarecer os termos.
- **Não usar escopos restritos do Gmail num SaaS** sem orçar a avaliação CASA: usar encaminhamento.
- **Atores do Apify não são "escudo legal"**: a quebra de termos é a mesma.

## Perguntas em aberto

- Greenhouse, Lever e Ashby não têm termos explícitos para agregadores terceiros (uso comercial depende do costume, não de permissão).
- Termos do We Work Remotely (403) e do YC Work at a Startup (página vazia).
- Cota real e volume no Brasil da Jooble.
- Preço do Cloudflare Email Routing; inbound grátis do SendGrid e do Mailgun.
- Se os alertas da Gupy ainda existem e quais campos trazem.
- O que significa a marcação "remote, São Paulo" da OpenAI (Brasil todo ou base em São Paulo).
- Limites não documentados dos ATS.

## Páginas consultadas

- ATS: [Greenhouse](https://docs.greenhouse.io/job-board.html) · [Lever](https://github.com/lever/postings-api) · [Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api) · [SmartRecruiters](https://developers.smartrecruiters.com/docs/posting-api) · [Personio](https://developer.personio.de/reference/get_xml) · [Recruitee](https://docs.recruitee.com/reference/authentication-1) · [Workable](https://help.workable.com/hc/en-us/articles/115012771647)
- Feeds: [Himalayas](https://himalayas.app/api) · [Jobicy](https://jobicy.com/jobs-rss-feed) · [RemoteOK](https://remoteok.com/api) · [Arbeitnow](https://www.arbeitnow.com/api/job-board-api) · [We Work Remotely](https://weworkremotely.com/api-terms-and-guidelines) · [Jooble](https://jooble.org/api/about) · [Common Crawl](https://index.commoncrawl.org/)
- Gupy: [Termos de uso](https://www.gupy.io/termos-de-uso-recrutamento-e-selecao-candidatos) · [robots.txt](https://portal.gupy.io/robots.txt)
- LinkedIn: [User Agreement](https://www.linkedin.com/legal/user-agreement) · [robots.txt](https://www.linkedin.com/robots.txt) · [Ajuda sobre automação](https://www.linkedin.com/help/linkedin/answer/a1341387) · [Job Posting API](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview) · [hiQ x LinkedIn](https://newmedialaw.proskauer.com/2022/12/08/hiq-and-linkedin-reach-proposed-settlement-in-landmark-scraping-case/)
- E-mail: [Escopos do Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes) · [Verificação OAuth do Google](https://support.google.com/cloud/answer/13464323) · [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/limits/)
- FDE: [Termos do YC](https://www.ycombinator.com/legal) · [Termos do Wellfound](https://wellfound.com/terms) · [robots.txt do WaaS](https://www.workatastartup.com/robots.txt)
