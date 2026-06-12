import type { ScriptLine } from '../types/script.types';

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
  if (normalized === protagonistName.trim()) return true;
  if (normalized === '你' || normalized === '主角') return true;
  return normalized.includes('（你）') || normalized.endsWith('·你');
}

/** 判断 CAST 条目是否为主角（不应写入 background.characters） */
export function isProtagonistCastName(
  name: string,
  protagonistName?: string,
): boolean {
  return isProtagonistName(name, protagonistName);
}

function buildProtagonistRelationItem(protagonistName: string): RelationItem {
  const name = protagonistName.trim();
  return {
    id: 'protagonist',
    name,
    headline: '主角',
    description: '',
    raw: '',
    isProtagonist: true,
  };
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
        colonIdx >= 0 ? cleaned.slice(0, colonIdx).trim() : cleaned.trim();
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

  const seen = new Set<string>();
  const deduped: RelationItem[] = [];
  for (const item of items) {
    const key = item.name.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.sort((a, b) => {
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

export function buildCharacterProfileMap(
  characters: string,
  protagonistName?: string,
): Map<string, RelationItem> {
  const map = new Map<string, RelationItem>();
  for (const item of parseRelationLines(characters, protagonistName)) {
    if (isProtagonistCastName(item.name, protagonistName)) continue;
    map.set(item.name, item);
  }
  if (protagonistName?.trim()) {
    map.set(protagonistName.trim(), buildProtagonistRelationItem(protagonistName));
  }
  return map;
}

export function mergeCharacterProfileMaps(
  primary: Map<string, RelationItem>,
  fallback: Map<string, RelationItem>,
): Map<string, RelationItem> {
  const merged = new Map(primary);
  for (const [key, item] of fallback) {
    if (!merged.has(key)) merged.set(key, item);
  }
  return merged;
}

export function buildCharacterProfileMapFromLines(
  lines: ScriptLine[],
  protagonistName?: string,
): Map<string, RelationItem> {
  const map = new Map<string, RelationItem>();
  const protagonistKey = protagonistName?.trim() || '你';

  const ensureProtagonist = () => {
    for (const item of map.values()) {
      if (item.isProtagonist) return;
    }
    map.set(protagonistKey, buildProtagonistRelationItem(protagonistKey));
  };

  for (const line of lines) {
    if (line.kind !== 'msg' || !line.sender?.trim()) continue;
    const sender = line.sender.trim();

    const isProtagonist =
      sender === '你' ||
      Boolean(protagonistName && sender === protagonistName.trim()) ||
      sender.includes('{{name}}');

    const mapKey = isProtagonist ? protagonistKey : sender;
    if (map.has(mapKey)) continue;

    map.set(mapKey, {
      id: isProtagonist ? 'protagonist' : `speaker-${sender}`,
      name: isProtagonist ? protagonistKey : sender,
      headline: isProtagonist ? '主角' : '登场人物',
      description: '',
      raw: '',
      isProtagonist,
    });
  }

  ensureProtagonist();
  return map;
}

function isMentionableNpc(name: string, protagonistName?: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  return !isProtagonistName(trimmed, protagonistName);
}

/** @ 提及候选：CAST 登记 + 对白中出现过的 NPC（含新登场） */
export function collectMentionCandidates(
  characterProfiles: Map<string, RelationItem>,
  lines: ScriptLine[],
  protagonistName: string,
  extraNames: string[] = [],
): string[] {
  const seen = new Set<string>();

  for (const item of characterProfiles.values()) {
    if (item.isProtagonist) continue;
    const name = item.name.trim();
    if (isMentionableNpc(name, protagonistName)) seen.add(name);
  }

  for (const line of lines) {
    if (line.kind !== 'msg' || !line.sender?.trim()) continue;
    const sender = line.sender.trim();
    if (isMentionableNpc(sender, protagonistName)) seen.add(sender);
  }

  for (const name of extraNames) {
    const trimmed = name.trim();
    if (isMentionableNpc(trimmed, protagonistName)) seen.add(trimmed);
  }

  return [...seen].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

/** 合并人物表并去重，保证主角只出现一次 */
export function buildRelationList(
  profiles: Map<string, RelationItem>,
  protagonistName?: string,
): RelationItem[] {
  const protagonistKey = protagonistName?.trim();
  const seenNames = new Set<string>();
  let protagonistIncluded = false;
  const items: RelationItem[] = [];

  const sorted = [...profiles.values()].sort((a, b) => {
    if (a.isProtagonist === b.isProtagonist) return 0;
    return a.isProtagonist ? -1 : 1;
  });

  for (const item of sorted) {
    if (item.isProtagonist) {
      if (protagonistIncluded) continue;
      protagonistIncluded = true;
      const name = protagonistKey || item.name.trim();
      if (seenNames.has(name)) continue;
      seenNames.add(name);
      items.push({
        ...item,
        id: 'protagonist',
        name,
        headline: item.headline || '主角',
        isProtagonist: true,
      });
      continue;
    }

    const name = item.name.trim();
    if (!name || seenNames.has(name)) continue;
    if (protagonistKey && name === protagonistKey) continue;
    seenNames.add(name);
    items.push(item);
  }

  return items;
}

/** 人物简介一行文案：优先 headline + description，raw 仅作兜底 */
export function formatRelationSummary(item: RelationItem): string {
  const headline = item.headline.trim();
  const description = item.description.trim();
  if (headline || description) {
    return [headline, description].filter(Boolean).join('，');
  }

  const raw = item.raw.trim();
  if (!raw) return '';

  const colonIdx = raw.search(/[：:]/);
  return colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : raw;
}

export function lookupCharacterProfile(
  profiles: Map<string, RelationItem>,
  senderName: string,
  isProtagonist: boolean,
  protagonistName?: string,
): RelationItem | null {
  if (isProtagonist) {
    for (const item of profiles.values()) {
      if (item.isProtagonist) return item;
    }
    const key = protagonistName?.trim();
    if (key && profiles.has(key)) return profiles.get(key) ?? null;
    return null;
  }

  const direct = profiles.get(senderName.trim());
  if (direct) return direct;

  for (const item of profiles.values()) {
    if (item.name === senderName.trim()) return item;
  }

  return null;
}
