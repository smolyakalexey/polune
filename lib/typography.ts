const russianPrepositions = [
  "без", "близ", "в", "во", "вместо", "вне", "для", "до", "за", "из", "из-за", "из-под",
  "к", "ко", "кроме", "между", "на", "над", "о", "об", "обо", "около", "от", "перед", "по",
  "под", "при", "про", "ради", "с", "со", "сквозь", "среди", "у", "через",
] as const;

const prepositionPattern = new RegExp(
  `(^|[\\s(\\[{\"«„])(${russianPrepositions.join("|")})[ \\t]+`,
  "giu",
);

export function keepRussianPrepositionsWithNextWord(value: string) {
  return value.replace(prepositionPattern, (_match, prefix: string, preposition: string) => {
    return `${prefix}${preposition}\u00a0`;
  });
}
