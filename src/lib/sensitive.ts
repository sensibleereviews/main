// Sensitive-review detection — doc §1D "Flag sensitive reviews for human handling".
// Reviews alleging safety, legal, health-inspection or discrimination issues are
// flagged so they are never auto-posted and always handled by a human with the
// right context. Detection is deliberately recall-first: borderline wording flags.

export type SensitiveMatch = { sensitive: boolean; reason: string | null; category: string | null };

const RULES: { category: string; label: string; patterns: RegExp }[] = [
  { category: "legal", label: "Legal / police mention", patterns: /\b(lawyer|legal action|court|police|FIR|sue|suing|consumer court|chargeback|defamation)\b/i },
  { category: "safety", label: "Safety / injury incident", patterns: /\b(injur|injured|accident|hurt|burn|cut (my|his|her)|fell|ambulance|bleeding|assault|hit me)\w*/i },
  { category: "health", label: "Food-safety / health allegation", patterns: /\b(food poisoning|food poisoning|stomach|vomit|diarr|hygiene violation|health inspector|mold|fungus|cockroach|roach|pest|hair in (the |my )?food|glass in|foreign object|contaminat)\w*/i },
  { category: "discrimination", label: "Discrimination allegation", patterns: /\b(discriminat|racist|racism|casteist|caste|religiousl?y? profil|harass|misbehav\w* (with|toward)|slur)\w*/i },
  { category: "fraud", label: "Fraud / billing dispute", patterns: /\b(scam|fraud|overcharg\w+ (on )?purpose|fake bill|tampered|stole|theft|wallet (was )?stolen)\b/i },
  { category: "allergy", label: "Allergic reaction", patterns: /\b(allerg\w+ (reaction|shock)|anaphyla)\w*/i },
];

export function detectSensitive(text: string, keywords: string[] = []): SensitiveMatch {
  const hay = `${text} ${keywords.join(" ")}`;
  for (const rule of RULES) {
    if (rule.patterns.test(hay)) {
      return { sensitive: true, reason: rule.label, category: rule.category };
    }
  }
  return { sensitive: false, reason: null, category: null };
}
