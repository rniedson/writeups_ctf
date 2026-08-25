import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// id gerado pelo loader = "<evento>/<desafio>/<idioma>" (a partir do caminho do arquivo).
// Isso é o que liga as traduções de um mesmo writeup entre si — ver src/i18n/writeups.ts.
const writeups = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writeups' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    event: z.string(),
    category: z.enum(['web', 'pwn', 'reverse', 'crypto', 'forensics', 'misc', 'osint', 'hardware']),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).default([]),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string(),
    draft: z.boolean().default(false),
  }),
});

// Páginas de documentação do próprio site (ex.: guia de como publicar um writeup).
// id do loader = "<slug-do-guia>/<idioma>".
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { writeups, guides };
