---
title: 'Vitrola — Writeup completo'
description: 'Um pedido de música vira um format string one-shot: varrer especificadores posicionais até a flag aparecer direto na resposta.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'pwn'
difficulty: 'hard'
tags:
  - format-string
pubDate: 2026-08-21
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Pwn (root) · **Dificuldade:** Hard · **Pontos:** 800
> **Vulnerabilidades:** Format string one-shot — leitura direta da flag da variável de ambiente
> **Flag:** `flag{infinity_ctf_2026_vitrola_566461b39d}` (fixa nesta instância — o formato varia por desafio)

Vitrola é o exemplo mais simples de format string deste CTF: nenhum ROP, nenhuma cadeia de gadgets —
só varrer os especificadores certos até a flag sair direto na resposta.

---

## 1. Contexto

O serviço simula uma vitrola/jukebox: pergunta **"Qual musica voce quer pedir?"** e devolve uma
confirmação do pedido. É um binário No-PIE da mesma família dos outros desafios `root` deste CTF.

## 2. Reconhecimento

A resposta ao pedido de música é algo como `"Adicionando na fila: <o que você mandou>"`. Testar
`%p` no lugar do nome da música é o primeiro reflexo diante de qualquer eco de input — e aqui
funcionou: a resposta trouxe um valor hexadecimal em vez do texto `%p` literal.

Isso confirma que o servidor está montando a resposta assim:

```c
printf("Adicionando na fila: " + entrada_do_usuario);
```

Ou seja, o texto do usuário vira **diretamente a string de formato** do `printf` — não um argumento
dela. É a variante mais direta possível de format string.

## 3. Encontrando a vulnerabilidade

Com format string confirmada, o objetivo é achar em qual **índice posicional** (`%N$s`) a variável
de ambiente `RCTF_FLAG` está acessível na pilha, já que, como em outros desafios desta família, a
flag fica lá (um shell root imprimiria com `env`).

> [!TIP/Varredura de índice é sempre o primeiro movimento]
> Sem saber de antemão em qual posição da pilha um dado interessante está, o caminho mais direto é
> automatizar: mandar `%1$s`, `%2$s`, `%3$s`... e conferir a resposta a cada tentativa, procurando o
> prefixo `flag{` ou `FlagY{` (o formato de flag varia por CTF).

```python
for n in range(1, 200):
    resposta = enviar(f"%{n}$s")
    if "flag{" in resposta:
        print(n, resposta)
        break
```

## 4. Exploração

A varredura confirmou o offset do próprio buffer de entrada no índice **6** (o valor devolvido batia
com o texto original mandado), e o índice **87** devolveu a flag:

```text
entrada:  %87$s
resposta: Adicionando na fila: flag{infinity_ctf_2026_vitrola_566461b39d}
```

Não foi preciso nenhum leak de endereço nem overflow — o próprio `%N$s` já lê a string apontada pelo
N-ésimo argumento da pilha, e nesse índice específico havia um ponteiro para a variável de ambiente
`RCTF_FLAG`.

## 5. Capturando a flag

A flag saiu direto na resposta do pedido de música, sem etapa adicional nenhuma.

### 🚩 Flag

```
flag{infinity_ctf_2026_vitrola_566461b39d}
```

## 6. Lições

- **Format string "one-shot"** — quando a flag (ou algo sensível) já está acessível num índice da
  pilha alcançável por `%N$s`, nem precisa de leak de endereço nem de overflow: só varrer índices.
- **`printf(entrada_do_usuário)` sem um `"%s"` fixo na frente é sempre um bug**, mesmo que pareça
  "só" formatar um texto simples — qualquer especificador (`%p`, `%s`, `%n`) no input do usuário já
  quebra a garantia de que só o texto dele será impresso.
- Corrigir: `printf("%s", entrada_do_usuário)` — nunca passar dado externo como primeiro argumento
  (a string de formato) de uma função da família `printf`.

---

_Writeup do desafio Vitrola (Infinity CTF 2026 · Pwn · Hard)._
