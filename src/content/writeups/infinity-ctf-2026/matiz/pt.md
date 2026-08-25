---
title: 'Matiz — Writeup completo'
description: 'Uma função de merge genérica demais navega qualquer atributo Python via getattr/setattr livre — o equivalente em Python a um prototype pollution — e sobrescreve uma configuração global do módulo.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - prototype-pollution
  - attribute-injection
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 394
> **Vulnerabilidades:** Attribute injection em Python via `getattr`/`setattr` livre numa função de merge genérica
> **Flag:** `flag{infinity_ctf_2026_matiz_dec454bab3}`

Se você já ouviu falar de "prototype pollution" em JavaScript — onde um merge genérico demais deixa
um atacante escrever em `__proto__` e afetar todos os objetos do processo — este desafio é o
equivalente quase direto em Python, usando o fato de que **atributos de objetos, classes e módulos
formam uma cadeia navegável** através de nomes especiais como `__class__`, `__init__` e `__globals__`.

---

## 1. Contexto

"Matiz" é um app com um sistema de temas visuais customizáveis — o usuário manda um JSON com
preferências (cores, fontes, etc.) e o servidor "mescla" isso em cima de uma configuração padrão. A
home do app linkava diretamente o código-fonte do motor de temas:

```
GET /static/theme-engine.py
```

Ler o código-fonte de graça é sempre a primeira coisa a se aproveitar — economiza um bocado de
engenharia reversa por caixa-preta.

## 2. Reconhecimento

O arquivo `theme-engine.py` continha uma função de merge recursivo, algo no formato:

```python
def deep_merge(target, patch):
    for key, value in patch.items():
        if isinstance(value, dict):
            deep_merge(getattr(target, key), value)
        else:
            setattr(target, key, value)
```

Repare no que essa função faz: em vez de tratar `target` como um dicionário (`target[key]`), ela usa
`getattr`/`setattr` — ou seja, ela navega e escreve em **atributos de verdade** do objeto Python, não
só chaves de um dicionário. Isso por si só já é um sinal de alerta: `getattr`/`setattr` com uma
chave controlada pelo usuário é a versão Python de acessar propriedades arbitrárias de um objeto.

## 3. Encontrando a vulnerabilidade

Em Python, praticamente tudo é um objeto com atributos navegáveis — inclusive objetos que não
deveriam estar ao alcance do usuário:

- `objeto.__class__` — a classe do objeto.
- `classe.__init__` — o método construtor da classe.
- `funcao.__globals__` — um dicionário com TODAS as variáveis globais do módulo onde aquela função
  foi definida (isso inclui configurações internas, segredos, o que for).

Encadeando esses três, dá pra sair de "uma instância qualquer" e chegar no **módulo inteiro**:
`instancia.__class__.__init__.__globals__` é o dicionário de globais do módulo — e como é um
dicionário exposto como atributo, o `deep_merge` recursivo consegue navegar até lá dentro e
sobrescrever qualquer variável global.

> [!TIP/O nome técnico é "attribute injection"]
> Quando uma função de merge/set genérica aceita chaves arbitrárias do usuário e usa
> `getattr`/`setattr` (ou o equivalente em outra linguagem) sem checar uma lista de atributos
> permitidos, ela vira uma ferramenta pro atacante navegar a árvore inteira de objetos do processo —
> não só o objeto "de negócio" que era a intenção original.

## 4. Exploração

O payload que percorre a cadeia até `__globals__` e sobrescreve uma configuração compartilhada:

```json
{
  "__class__": {
    "__init__": {
      "__globals__": {
        "APP_CONFIG": {
          "modo_diagnostico": true
        }
      }
    }
  }
}
```

Cada nível do JSON corresponde a uma chamada recursiva de `deep_merge`: primeiro navega até
`__class__` (a classe do objeto de tema), depois até `__init__` (o construtor dessa classe), depois
até `__globals__` (o módulo inteiro como dicionário), e finalmente escreve em `APP_CONFIG` — uma
variável global do módulo, compartilhada por todas as requisições do processo, não só pela sessão
atual.

Um endpoint de diagnóstico separado lia essa mesma variável `APP_CONFIG` pra decidir se devolvia
informação extra — e com o valor sobrescrito via o merge, esse endpoint passou a devolver a flag.

## 5. Capturando a flag

Chamando o endpoint de diagnóstico depois do merge malicioso, a resposta trouxe a flag:

```
flag{infinity_ctf_2026_matiz_dec454bab3}
```

## 6. Lições

- **Nunca use `getattr`/`setattr` (ou equivalentes de outras linguagens) com uma chave vinda direto
  do usuário, sem whitelist.** Se a intenção é fazer merge de um dicionário de configuração, trate o
  alvo como dicionário (`target[key]`) e não como objeto — dicionários não têm `__class__` navegável
  do mesmo jeito perigoso, e mesmo assim vale checar as chaves contra uma lista permitida.
- **Qualquer objeto Python "vaza" o módulo inteiro através de `__class__.__init__.__globals__`
  (ou qualquer outro método/função do objeto)** — é um caminho genérico, não específico dessa app.
  Se seu código expõe qualquer forma de navegação livre de atributos a partir de um objeto de
  aplicação, o alcance real é "todo o processo", não só aquele objeto.
- **Configuração global mutável e compartilhada entre requisições é um risco por si só,**
  independente do bug de attribute injection: uma vez que ela pode ser alterada por qualquer
  caminho, o efeito vale pra TODOS os usuários simultâneos do processo, não só quem enviou o
  payload — vale considerar isso ao decidir se algo deveria ser global ou por-sessão.

---

_Writeup do desafio Matiz (Infinity CTF 2026 · Web · Medium)._
