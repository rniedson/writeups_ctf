---
title: 'Cacho — Writeup completo'
description: 'IDOR em lote com autorização "latch": um único id da sua própria filial no array libera todos os outros, mesmo de filiais diferentes.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - idor
  - batch-authorization
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 275
> **Vulnerabilidades:** IDOR em lote — autorização vira "trava" (latch) compartilhada dentro do
> próprio request, em vez de ser checada item a item
> **Flag:** `flag{infinity_ctf_2026_lote_63e0dd9e1f}`

> Internamente na plataforma esse desafio usa o slug `lote` (é o que aparece na flag) — o nome de
> exibição é "Cacho".

Todo mundo já ouviu falar de IDOR (Insecure Direct Object Reference): você troca um `id=42` por
`id=43` numa URL e acessa dado de outra pessoa. Esse desafio é uma variação mais sutil — o bug não
está em _qual_ id você pede, está em _quantos_ ids você pede ao mesmo tempo.

---

## 1. Contexto

O app simula um sistema de "consultas em lote" usado por uma rede de filiais (centro, norte, sul).
Cada usuário está logado numa filial específica e só deveria conseguir consultar dados da própria
filial. A rota principal é `POST /api/consulta`, que recebe uma lista de itens pra consultar de uma
vez só:

```json
{ "itens": [{ "alias": "cliente1", "id": 101 }] }
```

## 2. Reconhecimento

O primeiro teste óbvio é o IDOR clássico: pedir um id de outra filial sozinho.

```json
POST /api/consulta
{ "itens": [{ "alias": "x", "id": 205 }] }   // id de outra filial

→ 403 / erro de autorização
```

Isso falha **100% das vezes**, de forma consistente. Se fosse um IDOR clássico simples (o servidor
só olhando "essa sessão pode ver este id?" item a item), esse teste já teria vazado alguma coisa. Ele
não vazou — o que significa que existe alguma checagem de autorização real rodando por item.

Só que o campo `itens` é uma **lista**, não um id único. E o servidor processa a lista inteira numa
única passada.

## 3. Encontrando a vulnerabilidade

A pergunta certa: será que a checagem de autorização é recalculada pra CADA item da lista, ou ela é
calculada uma vez e reaproveitada pro resto do array?

Testando misturar um id legítimo (da própria filial) com ids estrangeiros no MESMO request:

```json
POST /api/consulta
{
  "itens": [
    { "alias": "cliente_legitimo", "id": 101 },
    { "alias": "x", "id": 205 },
    { "alias": "y", "id": 9001 }
  ]
}

→ 200 OK — TODOS os itens vêm preenchidos, inclusive 205 e 9001
```

> [!IMPORTANT/A causa raiz]
> A autorização do endpoint funciona como uma **trava (latch)**: assim que o primeiro item do array
> pertence à sua própria filial, uma flag interna `autorizado = True` é setada — e a partir daí o
> servidor processa o RESTO do array sem checar autorização item a item de novo. Isso é diferente de
> um IDOR clássico (onde cada id é checado individualmente, sempre) — aqui o bug está em **estado
> compartilhado dentro do processamento de um único request em lote**. Um id "de mentirinha" da sua
> própria filial no começo do array serve de chave-mestra pro resto da lista.

## 4. Exploração

Com a trava conhecida, o próximo passo é achar dados interessantes pra colocar no resto do array.
Testar só os ids "óbvios" das outras filiais (na faixa 101-304, o range normal visto na UI) não
revelou nada de especial — todos eram só dados de clientes comuns de outras filiais, sem valor de
flag.

A virada foi fazer um **sweep bem mais amplo de ids**, não só os que aparecem na interface:

```python
# pseudocódigo do sweep
meu_id_legitimo = 101
achados = []
for candidato in range(1, 10000):
    itens = [{"alias": "eu", "id": meu_id_legitimo}, {"alias": "x", "id": candidato}]
    resp = post("/api/consulta", json={"itens": itens})
    achados.append((candidato, resp.json()))
```

## 5. Capturando a flag

Fora do range normal das filiais (101-304), o id **9001** devolveu um registro completamente
diferente — um item chamado **"Auditoria Interna"**, que não é uma filial de verdade, é um registro
administrativo que só existe pra esse tipo de teste:

```json
{ "alias": "auditoria", "id": 9001, "conteudo": "flag{infinity_ctf_2026_lote_63e0dd9e1f}" }
```

```
flag{infinity_ctf_2026_lote_63e0dd9e1f}
```

## 6. Lições

- **IDOR em lote merece um teste específico**, diferente do IDOR de item único: teste um id
  estrangeiro sozinho (pra confirmar que existe autorização), depois teste o MESMO id estrangeiro
  misturado com um id legítimo no mesmo array. Se o resultado mudar, você achou um latch de
  autorização compartilhado.
- **Não pare nos ids "óbvios"**. A flag estava deliberadamente fora do padrão numérico das filiais
  reais — um sweep amplo (milhares de ids, não só centenas) foi necessário pra achar o registro de
  "Auditoria Interna".
- **A correção certa é reautorizar cada item do array individualmente**, sem reaproveitar o
  resultado de uma checagem anterior — o mesmo princípio de "não confiar em estado calculado antes"
  que vale pra qualquer validação em lote (batch de pagamentos, batch de emails, etc.).

---

_Writeup do desafio Cacho (Infinity CTF 2026 · Web · Medium)._
