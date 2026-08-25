---
title: 'Chaveiro — Writeup completo'
description: 'O header "kid" de um JWT escolhe a chave de assinatura por caminho de arquivo — apontar pra /dev/null vira uma chave vazia que qualquer um pode usar.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - jwt
  - kid-header-injection
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 314
> **Vulnerabilidades:** JWT `kid` header injection — chave de assinatura lida de um caminho de
> arquivo controlado pelo atacante
> **Flag:** `flag{infinity_ctf_2026_chaveiro_75f1462dee}`

Mais um desafio de JWT, mas com uma superfície de ataque diferente do Carimbo: aqui o problema não
está no algoritmo, está em **como o servidor decide qual chave usar pra verificar a assinatura**.

---

## 1. Contexto

Tokens JWT têm um header opcional chamado `kid` (**k**ey **ID**) — ele existe justamente pra
permitir que um sistema tenha várias chaves de assinatura ativas ao mesmo tempo (rotação de chaves,
múltiplos ambientes, etc.) e o token diga qual delas usar pra verificar a assinatura dele.

O desafio documentava isso de forma explícita: o `kid` do JWT era usado como um **caminho** pra
localizar o arquivo da chave correspondente no sistema. Essa é literalmente a superfície de ataque —
a documentação já entregava onde olhar.

## 2. Reconhecimento

Um token normal, emitido pelo próprio app, tinha um header como:

```json
{ "alg": "HS256", "kid": "chaves/producao.key" }
```

Ou seja: o servidor, ao verificar um token, pega o valor de `kid`, resolve ele como um caminho de
arquivo, lê o conteúdo desse arquivo e usa como segredo pra verificar a assinatura HMAC.

## 3. Encontrando a vulnerabilidade

Se o `kid` é um caminho controlado pelo cliente (o header do JWT não é assinado, só o payload — ou
seja, dá pra editar o `kid` livremente e reassinar o token com qualquer chave que você escolher, já
que você está justamente tentando controlar QUAL chave o servidor vai usar), a pergunta natural é:
**dá pra apontar esse caminho pra um arquivo cujo conteúdo eu já sei?**

> [!TIP/A sacada]
> `/dev/null` é um arquivo especial disponível em qualquer sistema Unix que sempre tem **conteúdo
> vazio** — ler dele devolve zero bytes, sempre, garantido. Se o servidor lê o conteúdo do arquivo
> apontado por `kid` sem validar que ele está dentro de uma pasta de chaves confiável, apontar
> `kid=/dev/null` faz o servidor carregar uma chave de verificação **vazia** — uma string/bytes
> vazios, que é um segredo tão previsível quanto existe.

## 4. Exploração

Com a chave "vazia" identificada, o ataque é forjar um token novo com `kid=/dev/null` e assinar com
uma chave vazia:

```python
import jwt  # PyJWT

payload = {"usuario": "auditor", "role": "admin"}
headers = {"kid": "/dev/null"}

token_forjado = jwt.encode(payload, b"", algorithm="HS256", headers=headers)
```

```bash
curl -H "Authorization: Bearer $TOKEN_FORJADO" https://chaveiro-<instancia>.../painel
```

O painel administrativo aceitou o token direto — o servidor leu `/dev/null` (vazio), calculou a
assinatura HMAC esperada usando bytes vazios como chave, e ela bateu com a assinatura que eu tinha
gerado com a mesma chave vazia.

## 5. Capturando a flag

```
flag{infinity_ctf_2026_chaveiro_75f1462dee}
```

## 6. Lições

- **O header de um JWT não é confiável só porque "faz parte do token".** Só a assinatura garante
  integridade — e ela cobre o header + payload, não o processo de escolher QUAL chave usar pra
  verificar essa assinatura. Se o mecanismo de escolha da chave (`kid`, `jku`, `x5u`...) é
  controlável pelo atacante, ele pode escolher uma chave que ele mesmo conhece.
- **`kid` como caminho de arquivo é perigoso por dois motivos ao mesmo tempo**: dá pra fazer path
  traversal pra ler arquivos arbitrários do sistema (não foi o vetor usado aqui, mas é sempre a
  primeira coisa a testar), e dá pra apontar pra arquivos com conteúdo PREVISÍVEL (`/dev/null`,
  `/etc/hostname`, etc.) mesmo sem conseguir ler arquivos arbitrários.
- **A correção certa**: nunca resolver `kid` como caminho de arquivo direto — usar um identificador
  opaco (ex. um UUID) que é apenas uma CHAVE de consulta num dicionário fixo de chaves confiáveis
  no servidor, nunca interpretado como caminho.

---

_Writeup do desafio Chaveiro (Infinity CTF 2026 · Web · Medium)._
