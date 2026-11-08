export type PublicCatalogProduct = {
  id: string;
  name: string;
  code?: string | null;
  image?: string | null;
};

/**
 * Remove duplicate name+SKU rows from public catalogue surfaces without
 * deleting or mutating database records. Prefer SheetSync IDs, then rows
 * with product imagery, matching the established homepage selection rule.
 */
export function dedupePublicProducts<T extends PublicCatalogProduct>(products: readonly T[]): T[] {
  const sorted = [...products].sort((a, b) => {
    const sheetPriority = Number(b.id.startsWith("s")) - Number(a.id.startsWith("s"));
    if (sheetPriority) return sheetPriority;
    return Number(Boolean(b.image)) - Number(Boolean(a.image));
  });

  const seen = new Set<string>();
  return sorted.filter((product) => {
    const name = String(product.name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const code = String(product.code ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    const key = `${name}|${code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
