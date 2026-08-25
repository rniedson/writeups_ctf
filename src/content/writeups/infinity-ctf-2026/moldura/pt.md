---
title: 'Moldura — Writeup completo'
description: 'SSTI em Jinja2 sem sandbox: mesmo com __import__ bloqueado, a cadeia __subclasses__() dá execução remota de comandos completa a partir de uma string vazia.'
event: 'Infinity CTF 2026 (Harpia Security + SENAC)'
category: 'web'
difficulty: 'medium'
tags:
  - ssti
  - jinja2
  - rce
pubDate: 2026-08-22
author: 'Niedson'
draft: false
---

> [!NOTE/Sobre o desafio]
> **Plataforma:** Infinity CTF 2026 (Harpia Security + SENAC)
> **Categoria:** Web · **Dificuldade:** Medium · **Pontos:** 325
> **Vulnerabilidades:** Server-Side Template Injection (SSTI) em Jinja2 sem sandbox, `__import__` bloqueado mas `__subclasses__()` livre
> **Flag:** `flag{infinity_ctf_2026_moldura_5b8b37c55b}`

Este é, dos desafios web desse ciclo, o de exploração mais avançada — mas o raciocínio por trás dele
é surpreendentemente linear se você entender uma coisa: em Python, **toda classe carregada na memória
do processo é alcançável a partir de qualquer objeto**, mesmo o mais banal, como uma string vazia.

---

## 1. Contexto

"Moldura" é um app que gera uma pré-visualização de texto personalizado — o usuário manda um nome e
um texto, e o servidor devolve uma renderização. O endpoint principal:

```
POST /preview
{"nome": "...", "texto": "..."}
```

A própria página já dava a pista de como a renderização funcionava, mostrando um exemplo de sintaxe
tipo `{{ nome.upper() }}` — ou seja, o campo é processado com a sintaxe de template do Jinja2 (o
motor de templates padrão do Flask/Python), e não é só um placeholder simples de string.

## 2. Reconhecimento

Sempre que um campo de entrada é renderizado usando a sintaxe de um motor de templates (`{{ }}`,
`{% %}`), vale testar se o valor **do usuário** é interpretado como template também — não só os
valores fixos da aplicação. Isso é a essência de Server-Side Template Injection (SSTI): em vez de o
seu texto aparecer como texto, ele é EXECUTADO como código de template.

Testando um valor matemático simples no campo `nome`:

```json
{ "nome": "{{ 7 * 7 }}", "texto": "teste" }
```

Se a resposta mostrar `49` em vez de `{{ 7 * 7 }}` literal, confirma SSTI — o servidor está avaliando
a expressão, não só interpolando a string.

## 3. Encontrando a vulnerabilidade

Confirmado o SSTI, o próximo passo natural é tentar chegar em execução de comando — e o caminho mais
direto em Jinja2 costuma ser importar o módulo `os` e chamar `os.popen`. Só que aqui, `__import__`
estava bloqueado no servidor (provavelmente um filtro/sandbox parcial que intercepta a palavra
`import` ou a chamada `__import__` diretamente na string).

> [!IMPORTANT/Bloquear `__import__` não é a mesma coisa que sandboxar de verdade]
> O Jinja2, por padrão, roda no mesmo processo Python e dá acesso à introspecção completa da
> linguagem — `__class__`, `__mro__`, `__subclasses__()` — que não passam pela palavra "import" em
> lugar nenhum. Um filtro que bloqueia só a palavra `import`/`__import__` deixa aberta a rota mais
> clássica de bypass de sandbox do Jinja2.

O caminho: toda classe em Python tem `__class__`; toda classe tem `__mro__` (a cadeia de herança,
"Method Resolution Order"); e a classe raiz de tudo, `object`, tem um método `__subclasses__()` que
lista **todas as subclasses atualmente carregadas na memória do processo** — inclusive classes
internas usadas por bibliotecas como `subprocess`, mesmo que o código do desafio nunca tenha
importado `os` explicitamente no template.

## 4. Exploração

Partindo de uma string literal vazia (`''`), que é só uma instância comum de `str`:

```
''.__class__                     # a classe str
''.__class__.__mro__[1]          # sobe na hierarquia até object
''.__class__.__mro__[1].__subclasses__()   # lista TODAS as subclasses carregadas
```

Essa lista tem centenas de entradas. Precisamos achar, dentro dela, uma classe que dê acesso a
execução de comando. Um alvo clássico é a classe interna usada pelo `subprocess.Popen` para
manipular arquivos — ela costuma ter o atributo `__name__` igual a `_wrap_close`, o que permite
localizá-la varrendo a lista por nome em vez de adivinhar o índice (o índice muda entre versões do
Python/bibliotecas carregadas):

```
[c for c in ''.__class__.__mro__[1].__subclasses__() if c.__name__ == '_wrap_close']
```

Uma vez achada essa classe, seu `__init__` tem acesso, via `__globals__`, ao módulo `os` inteiro
(porque é assim que o `subprocess`/`os.popen` está implementado internamente) — dali dá pra chamar
`popen` diretamente e ler a saída de um comando:

```
{{ [c for c in ''.__class__.__mro__[1].__subclasses__() if c.__name__=='_wrap_close']
   [0].__init__.__globals__['popen']('id').read() }}
```

Repare: em nenhum momento do payload aparece a palavra `import` nem `__import__` — todo o caminho é
navegação de atributos que já existiam carregados no processo.

## 5. Capturando a flag

Trocando o comando de teste (`id`) por algo que lê a flag do sistema de arquivos ou de uma variável
de ambiente, a resposta renderizada trouxe:

```
flag{infinity_ctf_2026_moldura_5b8b37c55b}
```

## 6. Lições

- **Bloquear palavras-chave (`import`, `__import__`, `eval`, `exec`) não é sandboxing.** A superfície
  real de um motor de templates sem sandbox de verdade é toda a introspecção da linguagem —
  `__class__`, `__mro__`, `__subclasses__()` — que não usa nenhuma dessas palavras.
- **A defesa correta contra SSTI em Jinja2 é usar um ambiente com `autoescape` e, mais importante,
  rodar o template num `SandboxedEnvironment` de verdade** (o próprio Jinja2 oferece isso), que
  restringe o acesso a atributos perigosos como `__class__`/`__globals__` — em vez de tentar prever e
  bloquear cada payload individualmente.
- **A melhor defesa de todas é não deixar entrada do usuário virar sintaxe de template.** Se o
  objetivo é só personalizar um texto com o nome do usuário, um `.format()` simples ou f-string com
  valores já resolvidos (nunca a entrada crua) evita a classe inteira de vulnerabilidade — não tem
  motivo pra Jinja2 avaliar código dentro do campo `nome`.

---

_Writeup do desafio Moldura (Infinity CTF 2026 · Web · Medium)._
