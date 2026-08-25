---
title: 'Rubrica Digital — Writeup completo'
description: 'RSA com expoente pequeno e duas cifras da mesma cláusula confidencial em revisões consecutivas — a receita clássica do ataque de Franklin-Reiter.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'crypto'
difficulty: 'hard'
tags:
  - rsa
  - franklin-reiter
pubDate: 2026-08-21
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web/Cripto (root) · **Dificuldade:** Hard · **Pontos:** 800
> **Vulnerabilidades:** RSA com e=3 + mensagens relacionadas conhecidas → ataque de Franklin-Reiter
> **Flag:** `flag{infinity_ctf_2026_rubrica_bbda273fe4}` (fixa nesta instância — o formato varia por desafio)

Rubrica Digital é um app web de "endosso eletrônico de cláusulas confidenciais" — mas o bug real não
está na parte web, está na criptografia por trás. É o tipo de desafio que ensina por que expoente
público pequeno em RSA (`e=3`) é perigoso quando a mesma mensagem (ou mensagens **relacionadas**) é
cifrada mais de uma vez.

---

## 1. Contexto

O app permite consultar o histórico de revisões de um documento com uma "cláusula confidencial".
Cada revisão parece cifrar essa cláusula com RSA antes de guardar — e, como o nome do desafio
sugere, a cláusula confidencial é justamente o que queremos ler: a flag.

## 2. Reconhecimento

O endpoint `GET /api/historico` devolve um JSON com os parâmetros da cifra usada e duas cifras
diferentes:

```json
{
  "n": "<módulo RSA, em hex/decimal>",
  "e": 3,
  "delta": 1,
  "envio_1": "<cifra da revisão 1>",
  "envio_2": "<cifra da revisão 2>"
}
```

Dois detalhes saltam aos olhos de quem já viu RSA quebrado em CTF antes:

- **`e: 3`** — um expoente público minúsculo. RSA com `e` pequeno não é automaticamente quebrado,
  mas abre uma classe inteira de ataques quando certas condições se repetem.
- **`delta: 1`** — o próprio nome do campo já entrega a relação entre as duas mensagens: a segunda
  revisão é a primeira **mais 1** (`m2 = m1 + 1`), provavelmente porque a "revisão 2" é um pequeno
  ajuste incremental sobre a "revisão 1" do mesmo documento.

## 3. Encontrando a vulnerabilidade

> [!TIP/Duas cifras + mensagens relacionadas = Franklin-Reiter]
> Sempre que um sistema cifra com RSA de expoente pequeno **a mesma mensagem duas vezes, com uma
> relação linear conhecida entre elas** (`m2 = m1 + delta`, para um `delta` que você sabe), existe
> um ataque clássico chamado **Franklin-Reiter related-message attack** que recupera `m1` sem
> precisar fatorar `n` nem quebrar RSA de verdade — só álgebra.

A ideia do ataque: se `c1 = m1^e mod n` e `c2 = (m1+delta)^e mod n`, dá pra montar dois polinômios
em função de uma variável `x` (representando o `m1` desconhecido):

```
g1(x) = x^e - c1              (mod n)
g2(x) = (x + delta)^e - c2    (mod n)
```

Os dois polinômios têm `m1` como raiz comum — e é justamente por isso que o **máximo divisor comum**
(`gcd`) entre eles, calculado sobre o anel de polinômios módulo `n`, converge para um polinômio de
**grau 1** que contém `m1` diretamente (a menos que os polinômios não tenham essa raiz em comum por
algum motivo — mas aqui a premissa do desafio garante que têm).

## 4. Exploração

Com `e=3` e `delta=1`, os polinômios ficam:

```text
g1(x) = x^3 - c1                      (mod n)
g2(x) = (x + 1)^3 - c2                (mod n)
```

Calculando `gcd(g1, g2)` sobre `Z_n[x]` (usando o algoritmo de Euclides estendido para polinômios,
com todas as operações de coeficiente feitas módulo `n`), o resultado converge para um polinômio
linear `a*x + b` — e a raiz `-b/a mod n` **é `m1` diretamente**, sem precisar fatorar nada.

```python
# esboço em pseudocódigo (usar sympy ou uma implementação própria de gcd polinomial mod n)
n, e, delta = <do JSON>
c1, c2 = <envio_1>, <envio_2>

g1 = x**e - c1
g2 = (x + delta)**e - c2

resto = gcd_polinomial_mod_n(g1, g2, n)   # converge pra grau 1
m1 = -resto.coef_independente * inverso_modular(resto.coef_de_x, n) % n
```

## 5. Capturando a flag

Decodificando `m1` de volta para bytes (o inteiro recuperado, convertido para a representação de
texto original), o conteúdo era exatamente a cláusula confidencial — que era a própria flag do
desafio.

### 🚩 Flag

```
flag{infinity_ctf_2026_rubrica_bbda273fe4}
```

## 6. Lições

- **`e=3` sozinho não quebra RSA** — mas combinado com reuso de mensagens relacionadas, vira uma
  porta de entrada bem conhecida (Franklin-Reiter, e o caso ainda mais simples de Håstad quando a
  mesma mensagem é cifrada para destinatários diferentes com o mesmo `e` pequeno).
- **Nomear um campo `delta` no próprio JSON foi, sem querer ou não, uma pista enorme** — sempre vale
  reparar em campos de API que parecem "meta-informação" sobre a estrutura dos dados, não só os
  dados em si.
- Corrigir: usar `e` maior (65537 é o padrão de mercado) e, mais importante, **nunca cifrar
  mensagens relacionadas conhecidas com a mesma chave RSA sem padding aleatório** (OAEP existe
  exatamente para isso).

---

_Writeup do desafio Rubrica Digital (Infinity CTF 2026 · Web/Cripto · Hard)._
