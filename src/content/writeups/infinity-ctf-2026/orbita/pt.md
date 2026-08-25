---
title: 'Orbita — Writeup completo'
description: 'Format string vaza o endereço de system() e um segundo overflow encadeia um ROP até a shell, no clássico "achar dois bugs e juntar" de CTF de pwn.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'pwn'
difficulty: 'hard'
tags:
  - format-string
  - buffer-overflow
  - rop
pubDate: 2026-08-21
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Pwn (root) · **Dificuldade:** Hard · **Pontos:** 800
> **Vulnerabilidades:** Format string (leak de endereço) → overflow de pilha → ROP para `system("/bin/sh")`
> **Flag:** `flag{infinity_ctf_2026_orbita_6d649a9471}` (fixa nesta instância — o formato varia por desafio)

Orbita é um serviço TCP/TLS binário — sem código-fonte, sem painel web, só um socket que aceita
comandos. É o tipo de desafio onde cada bug sozinho não te leva a lugar nenhum: um vaza um
endereço, o outro estoura um buffer, e a vitória é perceber que os dois juntos formam a exploração
completa.

---

## 1. Contexto

O binário do Orbita segue o "padrão da família" que apareceu em vários desafios `root` deste CTF:
No-PIE, NX ligado, sem canário de pilha, RELRO parcial. Isso já diz muito antes de qualquer
engenharia reversa:

- **No-PIE** → todo endereço de função no binário é fixo, igual em toda execução. Não precisa vazar
  a base do binário, só usar os endereços direto do `objdump`/`readelf`.
- **Sem canário** → não existe proteção contra overflow de pilha sobrescrever o endereço de retorno.
- **NX ligado** → não dá pra injetar shellcode e executar direto na pilha; a exploração precisa ser
  ROP (reaproveitar código já existente no binário) ou `ret2libc`.

O serviço tem pelo menos dois comandos relevantes: um `handshake` inicial e um comando
`telemetria`. A ideia do nome do desafio ("órbita") sugere algo que "sobe" e depois "reentra" — o
handshake antes da telemetria de verdade.

## 2. Reconhecimento

Sem binário disponibilizado publicamente (diferente de outros desafios `root` do mesmo CTF, cujos
binários vinham em `/uploads/<hash>/<nome>`), a exploração aqui foi feita **contra o serviço remoto
diretamente**, testando cada comando e observando o comportamento.

O `handshake` aceita uma entrada de texto livre e a devolve de volta formatada de algum jeito — o
sinal clássico de um bug de format string é justamente esse: quando a sua entrada aparece "processada"
de volta, e não só ecoada verbatim.

> [!TIP/Como reconhecer format string sem ver o código-fonte]
> Mande `%p %p %p` (ou `%x %x %x`) como entrada. Se a resposta trouxer valores hexadecimais em vez do
> texto literal `%p %p %p`, o seu input está sendo usado como **string de formato** de um `printf`
> (ou equivalente) — e não como argumento. Isso significa que dá pra ler (e às vezes escrever) memória
> arbitrária do processo usando os especificadores `%N$p`/`%N$s`/`%N$n`.

## 3. Encontrando a vulnerabilidade

O handshake confirmou o padrão de format string. Como o binário é No-PIE, o objetivo natural é vazar
o endereço de uma função da libc (por exemplo `system`) para depois pular pra ela.

A técnica usada aqui foi vazar o endereço via **GOT resolvido por `dlsym`** — ou seja, o programa já
tinha, em algum ponto da pilha, o endereço real de `system` carregado dinamicamente. Variando o
índice do especificador posicional (`%N$p`), o índice **6** deu o buffer de entrada (confirmando o
offset do format string), e o índice **24** (`%24$p`) devolveu o endereço de `system` na libc.

```text
entrada:  %24$p
resposta: 0x7f3c1a2b3d40   (endereço real de system() nesta instância)
```

> [!IMPORTANT/Por que dois bugs, e não um só]
> Vazar `system` não executa nada sozinho — só te dá um endereço. Pra usar esse endereço, ainda
> precisa de um jeito de **redirecionar a execução** do programa pra lá. É aí que entra o segundo
> bug: o comando `telemetria` tem um overflow de pilha clássico.

O comando `telemetria` lê até `0x200` (512) bytes para dentro de um buffer de apenas 64 bytes — sem
checar o tamanho. Isso é um **buffer overflow de pilha padrão**: qualquer coisa além dos 64 bytes do
buffer começa a sobrescrever o que vem depois na pilha (variáveis locais, ponteiro de quadro salvo, e
por fim o endereço de retorno).

## 4. Exploração

O padding até o endereço de retorno salvo foi de **72 bytes** (64 do buffer + 8 do `rbp` salvo — o
mesmo padrão 64→72 que se repetiu em outros binários desta família de desafios). Depois dos 72 bytes,
o próximo qword na pilha é o endereço de retorno.

A cadeia ROP (Return-Oriented Programming) monta uma chamada equivalente a `system("/bin/sh")`
usando só pedaços de código já existentes no binário:

```text
payload = b"A" * 72
        + p64(pop_rdi_ret)      # gadget: pop rdi; ret  (0x401575 nesta instância)
        + p64(endereco_bin_sh)  # string "/bin/sh" no binário (0x4040b0)
        + p64(ret_gadget)       # ret "solto" (0x401016) — só para realinhar a pilha
        + p64(system_addr)      # endereço vazado no passo 3 (%24$p)
```

- `pop_rdi_ret` carrega o primeiro argumento da chamada (`rdi`) com o endereço de `"/bin/sh"` e
  devolve o controle pro próximo endereço da pilha.
- O `ret` solto antes de `system` não faz nada funcionalmente — só consome 8 bytes da pilha para
  **realinhar `rsp` em um múltiplo de 16**, exigência da ABI x86-64 para chamadas de função que usam
  instruções `movaps` internamente (a `system` da libc usa). Sem esse alinhamento, a chamada
  crasha antes de completar.
- Por fim, `system_addr` é o endereço vazado no handshake — chamado com `"/bin/sh"` em `rdi`, abre
  uma shell.

> [!TIP/O gadget de alinhamento é uma armadilha recorrente]
> Vários binários desta família de desafios exigiam (ou não) esse `ret` extra dependendo de quantos
> `push`/`call` já tinham acontecido até aquele ponto. Não tem como adivinhar sem testar — se o
> `ret2win`/ROP falha silenciosamente (a conexão cai sem erro visível), o alinhamento de pilha é o
> primeiro suspeito.

## 5. Capturando a flag

Com a shell aberta via `system("/bin/sh")`, o próximo passo é simplesmente listar as variáveis de
ambiente do processo — o padrão desta família de desafios guarda a flag ali, não em arquivo:

```bash
$ env | grep RCTF_FLAG
RCTF_FLAG=flag{infinity_ctf_2026_orbita_6d649a9471}
```

### 🚩 Flag

```
flag{infinity_ctf_2026_orbita_6d649a9471}
```

## 6. Lições

- **Format string não é só "vazar um valor solto"** — quando combinado com um segundo bug (overflow,
  neste caso), vira a peça que faltava para transformar "leio memória" em "executo código".
- **No-PIE facilita demais.** Sem ASLR de código, todo endereço de gadget/função é constante entre
  execuções — dá pra montar a cadeia ROP offline, sem precisar recalcular nada em tempo real.
- **Alinhamento de pilha (`RSP % 16`) é a causa mais comum de um ret2win "correto" falhar.** Vale
  sempre ter, como plano B, a versão do payload com um `ret` extra de sobra.
- Corrigir na origem seria simples: nunca passar entrada do usuário como primeiro argumento de
  `printf`/`fprintf` (usar `printf("%s", input)` em vez de `printf(input)`), e validar o tamanho lido
  em `telemetria` contra o tamanho real do buffer.

---

_Writeup do desafio Orbita (Infinity CTF 2026 · Pwn · Hard)._
