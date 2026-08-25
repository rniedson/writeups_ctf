// Roda no navegador em qualquer página que use o layout de duas colunas (.prose + .toc) —
// WriteupLayout e GuideLayout. Importado de dentro de um <script> do Astro.

export function addCopyButtons() {
  const article = document.querySelector<HTMLElement>('.prose');
  if (!article) return;
  const label = article.dataset.copyLabel ?? 'Copy';
  const copiedLabel = article.dataset.copiedLabel ?? 'Copied!';
  const blocks = article.querySelectorAll<HTMLPreElement>('pre');
  blocks.forEach((pre) => {
    if (pre.querySelector('.copy-code-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code-btn';
    button.textContent = label;
    button.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const text = code ? (code.textContent ?? '') : (pre.textContent ?? '');
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = copiedLabel;
        setTimeout(() => {
          button.textContent = label;
        }, 1500);
      } catch {
        // clipboard indisponível (ex.: contexto não seguro) — falha silenciosa
      }
    });
    pre.appendChild(button);
  });
}

export function initTocScrollspy() {
  const links = document.querySelectorAll<HTMLAnchorElement>('.toc a[data-toc-target]');
  if (links.length === 0) return;
  const map = new Map<string, HTMLAnchorElement>();
  links.forEach((link) => {
    const target = link.dataset.tocTarget;
    if (target) map.set(target, link);
  });

  const headings = Array.from(map.keys())
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (headings.length === 0) return;

  const setActive = (id: string | null) => {
    links.forEach((link) => link.classList.remove('active'));
    if (id) map.get(id)?.classList.add('active');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length > 0) {
        const topMost = visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0];
        setActive(topMost.target.id);
      }
    },
    { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
  );
  headings.forEach((h) => observer.observe(h));
}
