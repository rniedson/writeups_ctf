---
title: 'Esquema — Writeup completo'
description: 'Over-fetching literal: um parâmetro de seleção de campos sem whitelist deixa pedir de volta um campo sensível que nunca deveria sair da API para um funcionário comum.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - idor
  - over-fetching
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 266
> **Vulnerabilidades:** Over-fetching via parâmetro de seleção de campos sem whitelist
> **Flag:** `flag{infinity_ctf_2026_esquema_9215b8506e}`

Um dos bugs mais simples de explicar e mais fáceis de introduzir sem perceber: uma API que deixa o
cliente escolher **quais campos** quer de volta numa resposta, sem checar se algum desses campos é
sensível demais pra sair. Esse writeup mostra como isso vazou uma credencial inteira só de pedir.

---

## 1. Contexto

O desafio "Esquema" simula um sistema interno de funcionários. Existe um "diretório" acessível na
home do app, listando funcionários com seus ids — informação que parece inofensiva por si só. A API
por trás desse diretório é:

```
GET /api/funcionarios/<id>?campos=<lista-de-campos>
```

O parâmetro `campos` deixa o cliente pedir explicitamente quais atributos do funcionário quer na
resposta — um padrão comum em APIs que querem economizar banda, deixando o front-end pedir só o que
precisa em cada tela (às vezes chamado de "sparse fieldsets" ou "field selection").

## 2. Reconhecimento

O diretório da home já entregava o id de um funcionário de TI, junto com o nome do endpoint. Uma
chamada básica:

```
GET /api/funcionarios/42?campos=nome,cargo
```

devolvia exatamente `{"nome": "...", "cargo": "..."}` — confirma que o parâmetro `campos` controla
literalmente quais chaves aparecem no JSON de resposta, sem nenhuma outra transformação.

## 3. Encontrando a vulnerabilidade

A pergunta óbvia diante de um parâmetro assim: **existe alguma lista de campos permitidos, ou a API
devolve qualquer atributo que o modelo do funcionário tiver, sem checar se é apropriado expor?**

Testamos pedir um nome de campo que não aparecia em nenhuma tela do app, mas que soa como algo que
só um sistema de TI/suporte interno usaria — recuperação de acesso:

```
GET /api/funcionarios/42?campos=chave_recuperacao
```

> [!IMPORTANT/Sem whitelist é o bug inteiro]
> Não existe nada de exótico no ataque em si — é literalmente pedir um nome de campo que a gente
> chutou que poderia existir. O bug real é a AUSÊNCIA de uma lista de campos permitidos no backend:
> a API confia que o cliente só vai pedir campos "razoáveis", em vez de expor apenas um subconjunto
> fixo e seguro de atributos por padrão.

## 4. Exploração

A resposta confirmou que o campo existe e foi devolvido sem nenhuma checagem extra:

```json
{
  "chave_recuperacao": "..."
}
```

Não foi necessário nenhum bypass de autenticação, nenhuma injeção — só pedir o campo certo, no id
certo (o id do funcionário de TI, já visível no diretório da home).

## 5. Capturando a flag

O valor devolvido em `chave_recuperacao` era a flag:

```
flag{infinity_ctf_2026_esquema_9215b8506e}
```

## 6. Lições

- **"Sparse fieldsets" (deixar o cliente escolher os campos) é uma feature legítima e comum, mas
  precisa de whitelist por endpoint/perfil de acesso.** Nunca basta filtrar campos "óbvios demais"
  como senha em texto puro — qualquer atributo interno (tokens, chaves de recuperação, flags de
  permissão) precisa estar numa lista explícita de "isso pode sair", não numa lista implícita de
  "isso não deveria sair, então não vou pedir".
- **Over-fetching é um tipo de IDOR "silencioso":** em vez de trocar um id na URL pra acessar o
  recurso de outra pessoa, você troca um nome de campo pra acessar um ATRIBUTO que não deveria ser
  visível — a superfície de ataque cresce com cada campo novo que o modelo de dados ganha ao longo do
  tempo, mesmo sem ninguém mexer no endpoint.
- **Ids visíveis na UI (mesmo que "só de leitura") ajudam o atacante a mirar exatamente no alvo
  certo** — o diretório da home não precisava expor o id do funcionário de TI pra funcionar como
  diretório; bastava mostrar nome e cargo.

---

_Writeup do desafio Esquema (Infinity CTF 2026 · Web · Medium)._
