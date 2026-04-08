/**
 * Slugs usados em URLs públicas de cadastro (ex.: /auth/register/meu-condominio).
 * Apenas minúsculas, dígitos e hífens; sem espaços nem caracteres especiais.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeCondominiumSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function slugFromName(name: string): string {
  const base = normalizeCondominiumSlug(name);
  return base.length > 0 ? base : "condominium";
}

export function isValidCondominiumSlugFormat(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 100 && SLUG_PATTERN.test(slug);
}
