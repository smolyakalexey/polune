export type QuerySafety = "safe" | "inappropriate" | "sensitive" | "high-risk";

const highRiskPatterns = [
  /(убить|убийство|суицид|самоубийство|взорвать|ограбить|избить|похитить)/i,
  /навредить\s+(себе|кому)/i,
];

const sensitiveDecisionPatterns = [
  /(операци|лекарств|лечени|диагноз)/i,
  /(инвестир|кредит|ипотек|банкрот)/i,
  /(судеб|подать иск|адвокат|увольн)/i,
];

const inappropriatePatterns = [
  /(бля|хуй|пизд|еба|ёба|мудак|долбоеб|долбоёб)/i,
];

export function classifyQuerySafety(query: string): QuerySafety {
  const normalized = query.trim().toLowerCase();
  if (highRiskPatterns.some((pattern) => pattern.test(normalized))) return "high-risk";
  if (sensitiveDecisionPatterns.some((pattern) => pattern.test(normalized))) return "sensitive";
  if (inappropriatePatterns.some((pattern) => pattern.test(normalized))) return "inappropriate";
  return "safe";
}

export function isConfidentCatalogMatch(fuseScore: number | undefined) {
  return typeof fuseScore === "number" && fuseScore <= 0.27;
}
