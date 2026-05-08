export type ImeiResolverHint = {
  brand: string;
  model: string;
  count: number;
};

export type ImeiResolverEvidence = {
  source: string;
  signal: string;
  weight: number;
};

export type ImeiResolverDecision =
  | 'auto_match'
  | 'manual_review'
  | 'insufficient_evidence';

export type ImeiResolverOutput = {
  brand: string;
  model: string;
  canonicalModel: string;
  confidence: number;
  decision: ImeiResolverDecision;
  evidence: ImeiResolverEvidence[];
  notes: string;
};

const clampConfidence = (value: number): number =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export const buildImeiResolverPrompt = (
  imei: string,
  historyHints: ImeiResolverHint[] = [],
): string => {
  const tac = imei.slice(0, 8);
  const hintsText = historyHints.length
    ? historyHints.map((hint) => `- ${hint.brand} ${hint.model} (count=${hint.count})`).join('\n')
    : '- none';

  return [
    'You are Xeption IMEI Resolver, a mobile device identification expert.',
    'Your job is to identify the most probable brand and model from an IMEI TAC code.',
    'You have extensive knowledge of device TAC codes from all manufacturers worldwide.',
    '',
    `IMEI: ${imei}`,
    `TAC (first 8 digits): ${tac}`,
    '',
    'Internal history hints (previous trade-ins with same TAC prefix):',
    hintsText,
    '',
    'Instructions:',
    '- Use your training knowledge to identify the device from the TAC.',
    '- ALWAYS provide your best guess, even if not 100% certain.',
    '- Set confidence between 0.0 and 1.0 based on how certain you are.',
    '- If you are moderately sure, use confidence 0.5-0.7.',
    '- If you are very sure, use confidence 0.8-1.0.',
    '- Only use confidence < 0.3 if you truly have no idea.',
    '- Never leave brand empty if you have any guess at all.',
    '- canonicalModel should be the clean human-readable name (e.g. "Xiaomi 14T", "Samsung Galaxy A54").',
    '',
    'Return JSON with this schema:',
    '{',
    '  "brand": "string (manufacturer name, e.g. Samsung, Apple, Xiaomi)",',
    '  "model": "string (model name)",',
    '  "canonicalModel": "string (clean human-readable name)",',
    '  "confidence": 0.0,',
    '  "decision": "auto_match | manual_review | insufficient_evidence",',
    '  "evidence": [{"source":"string","signal":"string","weight":0.0}],',
    '  "notes": "string"',
    '}',
  ].join('\n');
};

export const parseImeiResolverOutput = (text: string): ImeiResolverOutput | null => {
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const brand = typeof parsed?.brand === 'string' ? parsed.brand.trim() : '';
  const model = typeof parsed?.model === 'string' ? parsed.model.trim() : '';
  const canonicalModel =
    typeof parsed?.canonicalModel === 'string' ? parsed.canonicalModel.trim() : '';
  const notes = typeof parsed?.notes === 'string' ? parsed.notes.trim() : '';
  const confidence = clampConfidence(Number(parsed?.confidence));
  const decision =
    parsed?.decision === 'auto_match' ||
    parsed?.decision === 'manual_review' ||
    parsed?.decision === 'insufficient_evidence'
      ? parsed.decision
      : 'insufficient_evidence';

  const evidence = Array.isArray(parsed?.evidence)
    ? parsed.evidence
        .map((item: any) => ({
          source: typeof item?.source === 'string' ? item.source.trim() : '',
          signal: typeof item?.signal === 'string' ? item.signal.trim() : '',
          weight: clampConfidence(Number(item?.weight)),
        }))
        .filter((item: ImeiResolverEvidence) => item.source || item.signal)
    : [];

  if (!brand || !Number.isFinite(confidence) || confidence <= 0) {
    return {
      brand: '',
      model: '',
      canonicalModel: '',
      confidence: 0,
      decision: 'insufficient_evidence',
      evidence: [],
      notes,
    };
  }

  return {
    brand,
    model,
    canonicalModel: canonicalModel || [brand, model].filter(Boolean).join(' '),
    confidence,
    decision,
    evidence,
    notes,
  };
};
