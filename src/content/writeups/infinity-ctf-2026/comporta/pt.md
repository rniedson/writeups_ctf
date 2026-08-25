---
title: 'Comporta — Writeup completo'
description: 'Overflow de pilha clássico com um ret2win direto — sem ROP, sem libc, só sobrescrever o retorno com a função que já resolve o desafio.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'pwn'
difficulty: 'hard'
tags:
  - buffer-overflow
  - ret2win
pubDate: 2026-08-21
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Pwn (root) · **Dificuldade:** Hard · **Pontos:** 800
> **Vulnerabilidades:** Buffer overflow de pilha → ret2win direto (sem ROP de libc)
> **Flag:** `flag{infinity_ctf_2026_comporta_7185bb7617}` (fixa nesta instância — o formato varia por desafio)

Se o [Orbita](/pt/writeups/infinity-ctf-2026/orbita/) precisou de duas vulnerabilidades encadeadas,
o Comporta é o caso mais simples possível de overflow de pilha: o próprio binário já tem uma função
que resolve o desafio, e o único trabalho é convencer o programa a pular pra ela.

---

## 1. Contexto

Mesma "família" de binário dos outros desafios `root` deste CTF: No-PIE, sem canário, NX ligado,
Partial RELRO. O serviço expõe um comando `processar_comando` que recebe dados do usuário — e o
próprio nome do desafio ("abrir a comporta") sugere que existe, em algum lugar do binário, uma
função literal chamada algo como `abrir_comporta`.

## 2. Reconhecimento

Testando `processar_comando` com entradas cada vez maiores, o serviço não crasha até um certo
tamanho — sinal de que existe um buffer de tamanho fixo recebendo os dados sem checagem de limite.
O comando lê até `0x200` (512) bytes num buffer de 64, exatamente como no Orbita: o mesmo padrão de
`read()` sem validação que se repete nesta família de desafios.

## 3. Encontrando a vulnerabilidade

Com No-PIE e sem canário, um overflow de pilha aqui é o caminho mais direto possível: sobrescrever o
endereço de retorno salvo com o endereço de qualquer função que já exista no binário. A pergunta é
só **qual** função.

> [!TIP/Procure a "função-prêmio" antes de montar ROP]
> Antes de partir para uma cadeia ROP completa (como no Orbita), vale sempre checar se o próprio
> binário já tem uma função que resolve o desafio sozinha — geralmente com um nome sugestivo
> (`win`, `flag`, `abrir_X`, `debug_shell`). Se existir e não pedir argumento nenhum, o exploit vira
> só "sobrescrever o retorno com esse endereço".

Aqui a função existia: `abrir_comporta` (endereço `0x401236`), que aparentemente imprime a flag ao
ser chamada — mas pedia primeiro que um valor "mágico" estivesse no registrador certo antes de
executar a lógica de fato, funcionando como uma checagem de autorização embutida no próprio binário.

## 4. Exploração

O padding até o retorno salvo foi, de novo, **72 bytes** (buffer de 64 + `rbp` salvo de 8). A cadeia
de exploração:

```text
payload = b"A" * 72
        + p64(pop_rdi_ret)          # gadget: pop rdi; ret (0x401509)
        + p64(0x436f6d706f727441)   # valor MAGIC esperado — bytes ASCII de "ComportA"
        + p64(abrir_comporta)       # 0x401236
```

O valor mágico `0x436f6d706f727441` não é aleatório: decodificado como bytes ASCII (pouco-endian),
ele soletra literalmente **"ComportA"** — uma checagem "estética" plantada de propósito no desafio,
não uma proteção de segurança real. `abrir_comporta` lê esse valor de `rdi` (carregado pelo gadget
`pop_rdi`), confere que bate com a string mágica, e só então libera a saída — nesse caso, a flag.

> [!IMPORTANT/Sem `ret` de alinhamento aqui — diferente do Orbita]
> No Orbita, a cadeia precisou de um `ret` extra antes de chamar `system` por causa do alinhamento de
> pilha exigido por instruções `movaps` dentro da libc. Aqui, `abrir_comporta` é uma função simples
> do próprio binário (compilada sem esse tipo de instrução SSE alinhada) — chamar direto, sem
> gadget de alinhamento, funcionou sem problema. **Não existe uma regra fixa de "sempre alinhar";
> depende do que a função de destino faz internamente.** Teste os dois jeitos se um deles falhar
> silenciosamente.

## 5. Capturando a flag

Ao rodar o payload, `abrir_comporta` executa e imprime a flag diretamente na resposta do serviço —
sem precisar de shell nem de leitura de variável de ambiente:

### 🚩 Flag

```
flag{infinity_ctf_2026_comporta_7185bb7617}
```

## 6. Lições

- **Ret2win direto é sempre a primeira coisa a checar.** Antes de montar uma cadeia ROP inteira
  (Orbita), vale a pena vasculhar o binário atrás de uma função que já faça o trabalho sozinha.
- **"Valores mágicos" que soletram uma palavra em ASCII são um padrão comum** em desafios de CTF —
  quando um `p64()` parecer um número aleatório, vale decodificar como string antes de descartar.
- **Alinhamento de pilha não é sempre necessário.** Comparado ao Orbita, este desafio mostra bem que
  a exigência de `RSP % 16 == 0` depende do que a função chamada faz por dentro — não é uma regra
  universal de todo ret2win.
- Na vida real, a correção seria a mesma do Orbita: validar o tamanho lido contra o tamanho real do
  buffer antes de gravar, e nunca confiar em "checagem de valor mágico" como controle de acesso.

---

_Writeup do desafio Comporta (Infinity CTF 2026 · Pwn · Hard)._
