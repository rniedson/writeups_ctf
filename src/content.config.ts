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
    tags: z.array(z.string()).default([]),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('g01x5'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writeups };
