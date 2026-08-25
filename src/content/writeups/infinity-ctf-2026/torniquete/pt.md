---
title: 'Torniquete — Writeup completo'
description: 'Um "módulo de auditoria em modo restrito" que não passava de decoração — a falha real era o eco puro do crachá informado direto num printf.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'pwn'
difficulty: 'hard'
tags:
  - format-string
pubDate: 2026-08-21
author: 'Niedson'
draft: true
---

> [!WARNING/Rascunho — falta confirmar a flag exata]
> Este writeup foi reconstruído a partir das notas da sessão (o desafio foi resolvido por outra
> pessoa do time, não por quem escreveu este texto) e ainda não tem a flag exata registrada.
> `draft: true` até confirmar o valor certo — trocar para `false` depois de preencher.

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Pwn (root) · **Dificuldade:** Hard · **Pontos:** 800
> **Vulnerabilidades:** Format string — eco verbatim do crachá informado
> **Flag:** `flag{infinity_ctf_2026_torniquete_...}` (valor exato ainda não confirmado nas notas)

Torniquete é outro format string do mesmo lote de desafios `root`, notável menos pela técnica (a
mesma varredura de `%N$s` do [Vitrola](/pt/writeups/infinity-ctf-2026/vitrola/)) e mais por um
detalhe de design: o desafio tenta parecer mais sofisticado do que é.

---

## 1. Contexto

O serviço simula um "console de controle de acesso" — pede **"Informe o cracha do operador:"**, e
depois oferece um "comando de diagnóstico". O texto associado ao desafio menciona um "módulo de
auditoria em modo restrito", sugerindo algum tipo de sandbox ou jail limitando o que dá pra fazer.

## 2. Reconhecimento

Testar o campo do crachá com entradas de formato (`%p`, `%x`) mostrou o mesmo sinal clássico: a
resposta trazia valores hexadecimais em vez do texto literal. O crachá informado era **ecoado
verbatim** direto num `printf(entrada)`, sem nenhum `"%s"` fixo na frente — exatamente o mesmo bug
do Vitrola.

O "comando de diagnóstico" separado, por outro lado, aceitava qualquer input e sempre respondia
`"Diagnostico concluido. Sessao encerrada."` de forma instantânea — sem custo de CPU perceptível,
o que descarta a hipótese de ser um `eval` ou interpretador de verdade rodando o input. Era só
decoração.

## 3. Encontrando a vulnerabilidade

> [!TIP/Nem toda "proteção" mencionada no enunciado é real]
> O texto "módulo de auditoria em modo restrito" soa como se houvesse alguma sandbox ativa
> limitando comandos perigosos — mas nenhuma das duas rotas do desafio (crachá, diagnóstico) tinha
> qualquer lógica de restrição observável. A fraqueza real estava só no campo do crachá, sem relação
> nenhuma com o texto de "auditoria". Vale sempre separar o que é **flavor text** do que é
> comportamento real testável.

Com o bug de format string confirmado no campo do crachá, a exploração seguiu o mesmo roteiro do
Vitrola: varrer índices posicionais (`%N$s`) até encontrar a flag na variável de ambiente
`RCTF_FLAG`.

## 4. Exploração

```python
for n in range(1, 200):
    resposta = enviar_cracha(f"%{n}$s")
    if "flag{" in resposta:
        print(n, resposta)
        break
```

Assim como no Vitrola, algum índice específico da pilha continha um ponteiro para `RCTF_FLAG`, e
`%N$s` nesse índice devolveu a flag diretamente na resposta.

## 5. Capturando a flag

A flag saiu na resposta ao crachá formatado com o índice certo — mas o valor exato não ficou
registrado nas notas desta sessão (o desafio foi resolvido por outra pessoa do time).

### 🚩 Flag

```
flag{infinity_ctf_2026_torniquete_...}
```

## 6. Lições

- **Descrições de desafio (flavor text) podem ser red herrings.** "Módulo de auditoria em modo
  restrito" não correspondia a nenhuma proteção real — o bug estava em outro lugar, sem relação com
  o texto.
- **O mesmo bug de format string pode aparecer várias vezes no mesmo CTF** com nomes/contextos
  diferentes — reconhecer o padrão rápido (eco verbatim → `%p`/`%N$s`) economiza bastante tempo.
- Corrigir: o mesmo do Vitrola — nunca passar entrada externa como string de formato direta de
  `printf`.

---

_Writeup do desafio Torniquete (Infinity CTF 2026 · Pwn · Hard) — rascunho, falta confirmar a flag._
