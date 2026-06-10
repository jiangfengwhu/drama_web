export interface RelationItem {
  id: string;
  name: string;
  /** 与主角关系 / 身份等最关键信息 */
  headline: string;
  /** 立场、细节等补充说明 */
  description: string;
  raw: string;
  isProtagonist: boolean;
}

function splitRelationDetail(detail: string): {
  headline: string;
  description: string;
} {
  const trimmed = detail.trim();
  if (!trimmed) {
    return { headline: '', description: '' };
  }

  const segments = trimmed
    .split(/[，；]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    return { headline: trimmed, description: '' };
  }

  return {
    headline: segments[0],
    description: segments.slice(1).join('，'),
  };
}

function isProtagonistName(name: string, protagonistName?: string): boolean {
  if (!protagonistName) return false;
  const normalized = name.trim();
  if (!normalized) return false;
  if (normalized === protagonistName) return true;
  if (normalized === '你' || normalized === '主角') return true;
  return normalized.includes('（你）') || normalized.endsWith('·你');
}

function splitRelationRawEntries(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const fromNewlines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const expanded = fromNewlines.flatMap((line) => {
    const inlineParts = line
      .split(/\s*(?=[·•\-]\s*)/)
      .map((part) => part.trim())
      .filter(Boolean);
    return inlineParts.length > 1 ? inlineParts : [line];
  });

  return expanded.length > 0 ? expanded : [trimmed];
}

export function parseRelationLines(
  text: string,
  protagonistName?: string,
): RelationItem[] {
  const items = splitRelationRawEntries(text).map((line, index) => {
      const cleaned = line.replace(/^[·•\-]\s*/, '');
      const colonIdx = cleaned.search(/[：:]/);
      const name =
        colonIdx >= 0 ? cleaned.slice(0, colonIdx).trim() : cleaned;
      const detail = colonIdx >= 0 ? cleaned.slice(colonIdx + 1).trim() : '';
      const { headline, description } = splitRelationDetail(detail);

      return {
        id: `relation-${index}-${cleaned}`,
        name: name || `人物 ${index + 1}`,
        headline,
        description,
        raw: cleaned,
        isProtagonist: isProtagonistName(name, protagonistName),
      };
    });

  return items.sort((a, b) => {
    if (a.isProtagonist === b.isProtagonist) return 0;
    return a.isProtagonist ? -1 : 1;
  });
}

export function buildTurnLabel(turnIndex: number): string {
  return turnIndex > 0 ? `第 ${turnIndex} 回合` : '开场';
}

/** 引子合入当前场景：先钩子，再此刻正在发生什么 */
export function buildSceneBriefText(summary: string, sceneNow: string): string {
  const hook = summary.trim();
  const scene = sceneNow.trim();
  if (hook && scene) {
    if (scene.startsWith(hook) || hook.startsWith(scene)) return scene;
    return `${hook}\n\n${scene}`;
  }
  return scene || hook;
}
