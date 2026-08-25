---
title: 'Carimbo — Writeup completo'
description: 'Uma "chave pública" RSA que na verdade é um JSON em texto claro — e o backend usa ela como segredo HMAC quando o algoritmo do JWT é trocado pra HS256.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - jwt
  - algorithm-confusion
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 284 · **First blood**
> **Vulnerabilidades:** Confusão de algoritmo JWT (RS256 → HS256) com chave pública forjável
> **Flag:** `flag{infinity_ctf_2026_carimbo_309f123a73}`

Esse foi o primeiro solve do time nesse desafio (first blood). É um clássico de segurança de JWT com
uma pegadinha extra: a "chave pública" que o app expõe não é bem o que ela parece ser.

---

## 1. Contexto

O app usava JWT (JSON Web Token) pra autenticar sessões, com um painel de documentação em `/docs`
que — como boa prática de "API transparente" — expunha a chave pública usada pra assinar os tokens.
A ideia (documentada, inclusive) era que os tokens fossem assinados com RSA (`RS256`): o servidor
assina com a chave PRIVADA, e qualquer um pode verificar a assinatura com a chave PÚBLICA, sem
conseguir forjar um token novo (porque não tem a privada).

## 2. Reconhecimento

Primeiro passo: pegar a "chave pública" documentada em `/docs` e ver o formato dela.

```
GET /docs
→ ... "chave pública": "-----BEGIN PUBLIC KEY-----\nMIIB...==\n-----END PUBLIC KEY-----" ...
```

Formato PEM, aparência normal de chave RSA. Só que decodificar o blob base64 dentro do PEM (em vez
de assumir cegamente que é um DER de chave RSA) revela algo estranho:

```python
import base64
blob = "MIIB...=="  # conteúdo entre os marcadores BEGIN/END
print(base64.b64decode(blob))
# b'{"e": 65537, "n": "c3VwZXJfc2VjcmV0X24uLi4="}'
```

Não é um DER binário de chave RSA — é **um JSON em texto claro**, só que embrulhado num envelope
PEM pra parecer uma chave de verdade.

## 3. Encontrando a vulnerabilidade

Esse é o gatilho de uma classe de bug bem conhecida em bibliotecas JWT: **confusão de algoritmo**.
O header de um JWT declara qual algoritmo foi usado pra assinar (`alg: RS256`, `alg: HS256`, etc.),
e MUITAS implementações ingênuas fazem algo como:

```python
jwt.decode(token, key, algorithms=["RS256", "HS256"])  # aceita os dois!
```

Quando isso acontece, um atacante pode mandar um token com `alg: HS256` (assinatura simétrica,
HMAC) usando a **chave pública RSA como se fosse o segredo HMAC** — porque, do ponto de vista do
código que verifica, "a chave" é só um blob de bytes que ele passa pra função de verificação, sem se
importar se esse blob é uma chave RSA de verdade ou uma string qualquer.

> [!IMPORTANT/A pegadinha específica deste desafio]
> Normalmente esse ataque usa a chave pública PEM inteira (o texto `-----BEGIN PUBLIC KEY-----...`)
> como segredo HMAC. Aqui não — porque a "chave pública" NÃO é uma chave RSA real, é um JSON
> `{"e":...,"n":...}` decodificado do base64. O segredo HMAC que o backend realmente usa é **essa
> string JSON decodificada**, não o PEM inteiro nem o base64 cru. Foi preciso testar as três
> variações (PEM completo / base64 cru / JSON decodificado) — só a terceira bateu.

## 4. Exploração

Com o segredo HMAC identificado, o resto é forjar um token novo:

```python
import jwt  # PyJWT

segredo_hmac = '{"e": 65537, "n": "c3VwZXJfc2VjcmV0X24uLi4="}'  # o JSON decodificado, como string

payload = {"usuario": "auditor", "role": "admin"}
token_forjado = jwt.encode(payload, segredo_hmac, algorithm="HS256")
```

```bash
curl -H "Authorization: Bearer $TOKEN_FORJADO" https://carimbo-<instancia>.../painel
```

## 5. Capturando a flag

O token forjado com `role: admin` foi aceito e o painel administrativo devolveu a flag:

```
flag{infinity_ctf_2026_carimbo_309f123a73}
```

## 6. Lições

- **Confusão de algoritmo (RS256/HS256) é um dos bugs mais conhecidos (e mais recompensados) em
  APIs que usam JWT.** Sempre que uma API aceita mais de um algoritmo no `jwt.decode`, ou não fixa
  explicitamente qual algoritmo espera, vale testar essa troca.
- **"Chave pública exposta" não significa "chave RSA de verdade".** Sempre decodifique o conteúdo
  real por trás do envelope PEM antes de assumir o formato — nesse caso o envelope escondia um JSON
  de parâmetros, não um DER binário.
- **A correção certa** é o backend **fixar explicitamente `algorithms=["RS256"]`** (nunca aceitar
  uma lista com HS256 junto de RS256) e nunca reaproveitar a mesma variável/endpoint pra "chave
  pública de verificação" e "segredo genérico" — são conceitos diferentes que não deveriam
  compartilhar o mesmo dado.

---

_Writeup do desafio Carimbo (Infinity CTF 2026 · Web · Medium)._
