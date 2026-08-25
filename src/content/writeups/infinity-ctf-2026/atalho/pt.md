---
title: 'Atalho — Writeup completo'
description: 'Um path traversal de mentirinha: adicionar ".css" no fim de uma URL protegida engana o gate de autenticação e devolve o conteúdo interno de graça.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - cache-deception
  - auth-bypass
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 324
> **Vulnerabilidades:** Auth bypass por extensão estática ("cache/auth deception")
> **Flag:** `flag{infinity_ctf_2026_atalho_7791dad13f}`

Esse desafio resolve em uma linha, mas o raciocínio por trás dela é o tipo de coisa que aparece em
pentest de verdade o tempo todo: **duas camadas diferentes olhando pra mesma URL e discordando sobre
o que ela é.**

---

## 1. Contexto

O app tinha uma rota `/relatorios/interno` — um painel que devolve dados sensíveis, só que exige
sessão autenticada via SSO. Sem estar logado, a resposta era um `403 Forbidden` seco, sem margem
pra engano: a rota claramente tinha um gate de autenticação na frente.

O nome do desafio já é uma pista e tanto: "Atalho". A pergunta certa não é "como eu quebro o SSO",
é "existe algum jeito de chegar no MESMO conteúdo por um CAMINHO diferente que não passe pelo gate?".

## 2. Reconhecimento

Testando a rota sem sessão:

```
GET /relatorios/interno
→ 403 Forbidden
```

Esse tipo de aplicação normalmente tem duas responsabilidades separadas rodando em camadas
diferentes: uma camada de **autenticação** (decide se você pode ver a página) e uma camada de
**serving de estático** (decide como servir arquivos "de apoio" como CSS, JS, imagens — que
normalmente não precisam de sessão, porque não têm dado sensível).

O problema nasce quando essas duas camadas concordam em _quase_ tudo, menos numa regra: **o que
conta como "estático"**.

## 3. Encontrando a vulnerabilidade

A ideia é simples de testar: e se eu pedir a mesma rota, só que fingindo que ela é um arquivo CSS?

```
GET /relatorios/interno.css
→ 200 OK
(mesmo conteúdo protegido de /relatorios/interno)
```

Funcionou. Sem sessão, sem cookie, sem nada — só colar `.css` no final da URL.

> [!TIP/A causa raiz]
> O middleware de autenticação faz o match **pelo path exato** — ele reconhece `/relatorios/interno`
> como "rota protegida" olhando pra essa string literal. Quando a URL vira
> `/relatorios/interno.css`, esse middleware simplesmente não reconhece mais o padrão e deixa passar
> (não é a rota que ele estava vigiando). Só que o roteador/handler da aplicação, mais adiante, é
> menos rígido: ele trata o sufixo `.css`/`.js` como decoração de um "ativo estático servido por
> outra camada" e devolve o handler de `/relatorios/interno` do mesmo jeito, ignorando a extensão.
> Ou seja: **o gate de auth e o roteador da aplicação têm regras diferentes pra decidir "o que é essa
> URL", e a extensão estática cai exatamente na lacuna entre as duas.**

## 4. Exploração

Não tem payload nenhum além da própria URL — é literalmente isso:

```bash
curl -i https://atalho-<instancia>.vm.harpiasecurity.com.br/relatorios/interno.css
```

A resposta vem com `Content-Type` de HTML/JSON (não de CSS de verdade — outro sinal de que o
servidor nunca tratou aquilo como um ativo estático de verdade, só a camada de auth que foi
enganada) e o corpo é idêntico ao da rota original protegida.

## 5. Capturando a flag

A flag estava no próprio conteúdo devolvido por `/relatorios/interno.css`:

```
flag{infinity_ctf_2026_atalho_7791dad13f}
```

## 6. Lições

- **"Path matching" e "roteamento" não são a mesma verificação**, mesmo quando parecem ser — cada
  camada da aplicação pode ter sua própria ideia de "o que é essa URL", e um atacante só precisa
  achar UM ponto onde essas ideias divergem.
- **Extensões de arquivo estático (`.css`, `.js`, `.png`...) são um vetor clássico de "cache/auth
  deception"** justamente porque servidores web reais costumam ter uma exceção de performance pra
  esse tipo de arquivo (não vale a pena rodar todo o pipeline de auth pra servir um CSS) — e é fácil
  essa exceção vazar pra rotas que não deveriam ser tratadas como estáticas.
- **A correção certa não é "bloquear .css"** (isso vira um jogo de gato-e-rato com outras
  extensões) — é fazer o gate de autenticação usar a MESMA lógica de normalização/roteamento que a
  aplicação usa de verdade, em vez de comparar a string do path isoladamente.

---

_Writeup do desafio Atalho (Infinity CTF 2026 · Web · Medium)._
