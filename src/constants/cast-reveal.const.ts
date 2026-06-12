import { GUIDE_FIELD, GUIDE_LIMITS } from './guide-format.const';
import { mergeCastEntries } from '../services/guide-text.util';

/** 开场 GUIDE 仅含 TITLE + PROLOGUE + SCENE_HEAD(slugline)；CAST 在人物首次登场时逐条揭露 */
export const OPENING_GUIDE_FIELDS = [
  GUIDE_FIELD.TITLE,
  GUIDE_FIELD.PROLOGUE,
  GUIDE_FIELD.SCENE_HEAD,
] as const;

export const CAST_ENTRY_FORMAT = `· 姓名：表面身份/立场；暗线：主角尚不知的真实私欲或秘密`;

export const CAST_REVEAL_RULES = `【人物渐进揭露 — CAST 协议】
1. 开场 GUIDE 只输出 TITLE、PROLOGUE，禁止在开场一次性写全 CAST。
2. 任一 NPC 在本局首次开口前，须先输出一行 CAST（每次仅写这一人，≤${GUIDE_LIMITS.castPerEntry}字）：
   GUIDE: CAST|${CAST_ENTRY_FORMAT}
   「暗线」必填且须具体（谁想夺产、谁欠赌债、谁在Protective刁难等），禁止「另有图谋」空词。
3. 已在本局 earlier 回合或 earlier MSG 中登记过的角色，禁止再次输出 GUIDE: CAST。
4. CAST 行紧挨该角色首条 MSG 之前输出；同一回合多个新角色登场，则每人各一行 CAST + 各自 MSG。
5. 角色名须与 MSG 中 sender 完全一致（2-4 字中文名）；可随剧情增补新角色，勿预设未登场人物。
6. 该 NPC 的 MSG 须与暗线一致：表面话术 + 潜台词泄露，禁止写完后遗忘暗线。`;

/** 注入 system prompt 的 CAST 规则（不含已登记人物，便于 prompt 缓存） */
export function buildCastRevealRulesBlock(protagonistName: string): string {
  const protagonist = protagonistName.trim();
  return `${CAST_REVEAL_RULES}
7. 主角「${protagonist}」已由用户设定；对白中固定用 MSG:你，禁止为其输出 GUIDE: CAST。`;
}

/** 合并主角与已登记 NPC，供 user message 末尾注入 */
export function buildKnownCastRegistry(
  registeredCharacters: string,
  protagonistName: string,
): string {
  const protagonist = protagonistName.trim();
  const protagonistEntry = `· ${protagonist}：主角（用户扮演；MSG 用「你」，勿 CAST）`;
  return mergeCastEntries(protagonistEntry, registeredCharacters.trim());
}

/** 注入 user message 结尾的已登记人物块（动态内容，避免污染 system 缓存） */
export function buildRegisteredCastUserSuffix(
  knownCharacters: string,
  protagonistName: string,
): string {
  const registry = buildKnownCastRegistry(knownCharacters, protagonistName);

  return `\n\n【已登记人物 — 下列角色勿再输出 GUIDE: CAST】
${registry}

仅当上表未出现的新 NPC 本回合首次开口时，才追加一行 GUIDE: CAST（只写该新人；主角永远不写 CAST）。`;
}
