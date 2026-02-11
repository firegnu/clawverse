export const now = (): number => Date.now();

export const makeId = (prefix: string): string => {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${now()}-${rand}`;
};

export const splitStream = (text: string): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.map((word, index) => (index === words.length - 1 ? word : `${word} `));
};

export const toSafeId = (value: string): string => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 48) : `agent-${now()}`;
};
