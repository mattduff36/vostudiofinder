export function moveFaq<T>(items: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return [...items];
  const result = [...items];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved!);
  return result;
}

export function sameFaqOrder(first: readonly { id: string }[], second: readonly { id: string }[]) {
  return first.length === second.length && first.every((item, index) => item.id === second[index]?.id);
}
