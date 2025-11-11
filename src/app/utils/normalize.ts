export type PageMeta<T> = {
  content: T[];
  totalPages?: number;
  totalElements?: number;
  number?: number;
  size?: number;
};

export function normalizeListFromMessage<T>(
  message: unknown
): { rows: T[]; page?: PageMeta<T> } {
  const msg = message as any;
  if (msg && Array.isArray(msg.content)) {
    return { rows: msg.content as T[], page: msg as PageMeta<T> };
  }
  if (Array.isArray(msg)) {
    return { rows: msg as T[] };
  }
  return { rows: [] };
}
