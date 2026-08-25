# writeups_ctf

Plataforma pública de writeups de CTF (Capture The Flag) — [Astro](https://astro.build), Markdown,
GitHub Actions e GitHub Pages. Conteúdo trilíngue: **português**, **espanhol** e **inglês**.

Site publicado (após habilitar o deploy, veja [Deploy](#deploy)): `https://rniedson.github.io/writeups_ctf/`

## Arquitetura

- **Astro** (site estático, sem framework de UI — só `.astro` + CSS puro).
- **Content Collections** (`src/content.config.ts`) validam o frontmatter de cada writeup com Zod;
  frontmatter inválido quebra `astro check`/`astro build`.
- **i18n** via roteamento nativo do Astro (`astro.config.mjs`), com prefixo de idioma sempre presente
  (`/pt/`, `/es/`, `/en/`) e páginas dinâmicas em `src/pages/[locale]/...` — uma única página Astro
  cobre os três idiomas via `getStaticPaths`, em vez de triplicar arquivos.
- **Fallback de tradução**: se um writeup não tem versão num idioma, a rota daquele idioma existe
  mesmo assim e mostra o conteúdo em português com um aviso ("tradução pendente"). Lógica em
  `src/lib/writeups.ts`.
- **Sitemap** (`@astrojs/sitemap`, com tags `hreflang` por idioma) e **RSS** (`@astrojs/rss`, um feed
  por idioma em `/<locale>/rss.xml`).
- Realce de sintaxe via Shiki (embutido no Astro), com tema claro/escuro que segue o toggle manual do
  site (não só `prefers-color-scheme`).
- **Imagem de compartilhamento (`og:image`) gerada por build**, uma por writeup e uma genérica por
  idioma, via `satori` + `@resvg/resvg-js` (`src/lib/og-image.ts`, endpoints `og.png.ts` e
  `[...slug].png.ts`). Fonte vendorizada em `src/assets/fonts/` (IBM Plex Mono, OFL).
- **Sumário lateral fixo** nos writeups (gerado a partir dos headings `##`/`###` que o próprio Astro
  já extrai do Markdown — sem parser extra), com **destaque da seção atual** conforme a rolagem
  (`IntersectionObserver`) e rolagem suave ao clicar. **Botão de copiar** em todo bloco de código, com
  numeração de linha e etiqueta da linguagem quando o bloco declara uma.
- **Busca client-side** na listagem de writeups (filtra por título/descrição/evento/categoria/tags,
  sem dependência nem índice — o conteúdo já está todo renderizado na página), com atalho `/` para
  focar o campo.
- **Badge de dificuldade** (campo opcional `difficulty` no frontmatter) e **ícone por categoria**.
- **Barra de progresso de leitura** fixa no topo dos writeups.
- **Tipografia de leitura**: corpo do texto em serifada (Lora, OFL — variável, vendorizada em
  `src/styles/fonts/`), títulos/UI continuam no sans-serif do sistema.
- **Callouts** (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` — sintaxe padrão do
  GitHub) via `remark-github-blockquote-alert`, com título localizável por writeup
  (`[!TIP/Sacada do desafio]`) e cor por tipo.
- **A home é o catálogo completo** — sidebar de filtros (busca + categoria, dificuldade, organizadora
  do CTF — o campo `event`, mês de publicação, tema/tag) sobre todos os writeups, tudo client-side
  (sem index nem dependência), com estado refletido na URL (`?tag=rce&category=web`, por exemplo) pra
  dar link direto de uma busca filtrada. `/writeups/` virou um redirect pra home;
  `/writeups/category/<categoria>/` e `/tags/<tag>/` continuam existindo como páginas estáticas à
  parte (bom pra SEO e link direto).

```text
src/
├── assets/                    (reservado para imagens gerais do site, se precisar)
├── components/                Header, Footer, LanguageSwitcher, ThemeToggle, WriteupCard
├── content/
│   └── writeups/
│       └── <evento>/
│           └── <desafio>/
│               ├── pt.md      conteúdo em português
│               ├── es.md      conteúdo em espanhol (opcional até existir)
│               ├── en.md      conteúdo em inglês (opcional até existir)
│               └── imagens/   imagens referenciadas com caminho relativo no .md (otimizadas pelo Astro)
├── layouts/                   BaseLayout (head/SEO/OG/tema), WriteupLayout
├── i18n/                      dicionário de strings da UI (ui.ts) + helpers (utils.ts)
├── lib/writeups.ts            agrupamento de traduções + resolução de fallback
├── pages/
│   ├── index.astro            redireciona "/" -> "/pt/"
│   └── [locale]/
│       ├── index.astro        home = catálogo (busca + sidebar de filtros, client-side)
│       ├── about.astro
│       ├── rss.xml.js
│       ├── og.png.ts          imagem de compartilhamento genérica do idioma
│       ├── tags/
│       └── writeups/
│           ├── index.astro    redireciona pra home (conteúdo migrou pra lá)
│           ├── category/[category].astro   página estática por categoria (link direto/SEO)
│           ├── [...slug].astro             página do writeup (evento/desafio)
│           └── [...slug].png.ts            imagem de compartilhamento do writeup
└── styles/global.css          tokens de cor claro/escuro, tipografia, prosa
public/
└── writeups/<evento>/<desafio>/   arquivos para download linkados no writeup (ex.: solve.py)
```

Scripts de exploit para download (não são imagens) ficam em `public/writeups/<evento>/<desafio>/` e são
linkados no `.md` com o caminho completo incluindo o `base` do site, ex.:

```md
[baixar solve.py](/writeups_ctf/writeups/flagyard/snaparchive/solve.py)
```

## Pré-requisitos

- **Node.js >= 24** (definido em `package.json#engines`)
- **npm** (gerenciador do projeto — só existe `package-lock.json`; não misture com pnpm/yarn/bun)

## Instalação local

```sh
npm install
```

## Desenvolvimento

```sh
npm run dev       # http://localhost:4321
npm run build     # astro check && astro build -> ./dist
npm run preview   # serve o build de ./dist
npm run check     # só o type-check (astro check)
npm run format        # formata tudo com Prettier
npm run format:check  # confere formatação sem alterar arquivos
```

## Como adicionar um novo writeup

1. Crie a pasta `src/content/writeups/<evento-slug>/<desafio-slug>/` (slugs em minúsculas, sem
   espaços/acentos — viram parte da URL).
2. Adicione `pt.md` (e, quando tiver, `es.md`/`en.md`) com este frontmatter:

   ```yaml
   ---
   title: 'Nome do desafio'
   description: 'Resumo curto da solução'
   event: 'Nome do CTF'
   category: 'web' # web | pwn | reverse | crypto | forensics | misc | osint | hardware
   difficulty: 'easy' # opcional: easy | medium | hard
   tags:
     - sql-injection
     - python
   pubDate: 2026-08-25
   updatedDate: 2026-08-25 # opcional
   author: 'g01x5' # opcional, esse é o padrão
   draft: false # true esconde o writeup do site sem apagar o arquivo
   ---
   ```

   O nome do arquivo (`pt.md`, `es.md`, `en.md`) é o que define o idioma — não existe campo `lang` no
   frontmatter. Se só existir `pt.md`, as rotas `/es/` e `/en/` daquele writeup funcionam normalmente,
   mostrando o conteúdo em português com um aviso de tradução pendente.

3. Escreva o corpo em Markdown normal abaixo do frontmatter. Imagens vão em `imagens/` na mesma pasta
   e são referenciadas com caminho relativo (`![tela de login](./imagens/login.png)`) — o Astro otimiza
   automaticamente. Scripts/arquivos para download vão em `public/writeups/<evento>/<desafio>/` (veja
   [Arquitetura](#arquitetura)). Para destacar uma sacada/observação importante, use a sintaxe de
   callout do GitHub — `> [!TIP]` (ou `[!NOTE]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`) na
   primeira linha do blockquote; para dar um título próprio (traduzido), use
   `> [!TIP/Título aqui]`.
4. Rode `npm run check` — frontmatter inválido (categoria errada, data mal formatada, campo obrigatório
   faltando) quebra aqui antes mesmo de gerar o build.
5. Rode `npm run dev` e confira a página em `http://localhost:4321/pt/writeups/<evento-slug>/<desafio-slug>/`.
6. Abra um PR. O workflow `CI` roda `astro check`, `format:check` e `build` automaticamente. Depois do
   merge na branch `main`, o workflow `Deploy to GitHub Pages` publica o site.

## Deploy

O deploy é automático via GitHub Actions (`.github/workflows/deploy.yml`) a cada push em `main`, ou
manualmente pela aba **Actions** do repositório (`workflow_dispatch`).

**Passo manual necessário uma única vez** (não foi feito por esta sessão — requer acesso às
configurações do repositório): em **Settings → Pages**, defina **Source: GitHub Actions**.

### URL esperada

- Sem domínio próprio: `https://rniedson.github.io/writeups_ctf/`
- Com domínio próprio: veja abaixo.

### Domínio próprio (opcional)

Não configurado nesta sessão (nenhum domínio foi informado). Para configurar depois:

1. Crie `public/CNAME` com o domínio (ex.: `writeups.seudominio.com`).
2. Em `astro.config.mjs`, troque `site` para `https://writeups.seudominio.com` e **remova** a linha
   `base`.
3. No provedor de DNS, aponte um registro `CNAME` do subdomínio escolhido para
   `rniedson.github.io`.
4. Em **Settings → Pages**, adicione o domínio customizado e habilite "Enforce HTTPS" quando o
   certificado for emitido.

## Política de publicação responsável

- Publique um writeup **somente depois do encerramento do CTF** (ou conforme as regras específicas do
  evento — alguns permitem publicação imediata, outros não).
- Remova cookies de sessão, tokens de API, IPs internos de infraestrutura real e qualquer dado pessoal
  antes de publicar.
- Verifique a licença/termos da plataforma do CTF antes de redistribuir arquivos do desafio (binários,
  código-fonte, anexos) — muitas plataformas proíbem redistribuição fora da competição.
- Não hospede malware funcional sem isolamento, aviso explícito e justificativa clara do propósito
  educacional.

## Decisões e suposições

- Repositório estava vazio: projeto Astro foi inicializado do zero (template `minimal`), não havia
  nada para preservar.
- `typescript@latest` resolveu para a major `7.0.2`, incompatível com o peer dependency de
  `@astrojs/check` (`^5 || ^6`) — fixado em `6.0.3` (última estável da série 6).
- i18n implementado com o roteamento nativo do Astro (sem biblioteca extra) e fallback para português
  escrito à mão em `src/lib/writeups.ts`, já que o content layer do Astro não tem fallback de tradução
  embutido para content collections livres.
- Site (`site`) e `base` calculados para GitHub Pages de projeto (`rniedson.github.io/writeups_ctf`),
  já que nenhum domínio próprio foi informado.
- Bandeiras no seletor de idioma: 🇧🇷 pt, 🇺🇸 en e, por pedido explícito, 🇲🇽 (México) para es em vez
  de 🇪🇸 (Espanha) — mantém `aria-label`/`title` com o nome completo do idioma para acessibilidade.
- Fonte da imagem de compartilhamento (IBM Plex Mono, OFL — licença em
  `src/assets/fonts/OFL.txt`) escolhida por ter pesos estáticos Bold/Regular prontos; a maioria das
  fontes do Google Fonts hoje só distribui variável, que o satori não interpola bem.
- Tempo de leitura é uma estimativa simples (contagem de palavras do Markdown bruto, ~200 palavras/min,
  ignorando blocos de código) — não usa nenhuma lib de NLP.
- Fonte do corpo do texto (Lora, OFL — licença em `src/styles/fonts/OFL.txt`) usada na variante
  variável (upright + itálico), diferente da mono do `og-image.ts`: aqui é CSS puro no navegador, não
  o satori, então o navegador interpola o peso sem precisar de arquivos estáticos por peso.
- O Astro 7 trocou o processador de Markdown padrão; plugins remark/rehype (usados pelos callouts)
  exigem instalar `@astrojs/markdown-remark` à parte — Astro avisa isso sozinho se faltar.
- Nenhum push/commit foi feito automaticamente — só o `git clone` inicial. Revisão e publicação ficam
  a cargo de quem revisar este trabalho (veja abaixo).

## Instruções para revisar e publicar

1. Revise o diff local em `projetos/writeups-ctf/writeups_ctf/` (`git status` / `git diff`).
2. Rode a validação completa: `npm ci && npm run check && npm run format:check && npm run build`.
3. Rode `npm run dev` e navegue pelo site localmente, incluindo os três idiomas.
4. Se estiver tudo certo, `git add`, `git commit` e `git push origin main` (a branch principal já
   existe e está vazia no remoto — o primeiro push cria o histórico).
5. Em **Settings → Pages**, defina **Source: GitHub Actions** (passo manual, feito uma única vez).
6. Acompanhe a aba **Actions**: o workflow `Deploy to GitHub Pages` deve rodar automaticamente após o
   push e publicar em `https://rniedson.github.io/writeups_ctf/`.
