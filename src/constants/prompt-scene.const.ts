import {
  SCENE_HEADING_ELEMENTS,
  SCENE_HEAD_PROTOCOL,
} from './scene-heading.const';

export const PRIVATE_CHAT_RULES = `【私聊法则 — 场景内的场外密谈】
1. 私聊发生在当前场景进行中：玩家从场景群聊切到一旁与一名 NPC 密谈，群聊里的对峙/筹码/秘密仍在进行。
2. 须承接【场景群聊近况】：对白须引用或回应群聊里刚发生的事（人名、物件、威胁、误会），禁止凭空开新局或换地点。
3. 仅主角与一名 NPC 可 MSG；禁止第三人插话、禁止群戏、禁止 META: CUT 转场。
4. 用途：情报交换、威胁、交易、告白、试探 — 获取群聊里听不到的信息；NPC 可暴露暗线或提出私下条件。
5. 私聊内容默认其他在场 NPC 不知；玩家回群聊时不得假定全员已听见密谈内容。
6. MSG 须纯台词；短句、有刀口；每回合推进信息或关系，并暗示如何影响当前场景局势。`;

export const SCENE_GROUP_CHAT_RULES = `【场景群聊法则 — 在场者才发言】
1. 本 thread 对应当前电影场景；仅已在对话中出现的 NPC 可 MSG（渐进式 CAST）。
2. 不在场的 NPC 不得 MSG；需要其物理在场时用 META: CUT 转场，或引导玩家私聊。
3. 群聊推进 public 冲突；私聊推进 secret；Beat 闭合或场次过长须 CUT 换新 slugline。
4. 仅参与密谈的 NPC 知晓密谈内容；其他在场 NPC 不得凭空引用；主角公开后全员方可接话。
5. 回群聊时须让密谈筹码/条件/威胁在 MSG 中落地。`;

export function buildSceneArchitecturePromptBlock(isPrivate: boolean): string {
  if (isPrivate) {
    return PRIVATE_CHAT_RULES;
  }

  return `${SCENE_HEADING_ELEMENTS}

${SCENE_HEAD_PROTOCOL}

${SCENE_GROUP_CHAT_RULES}`;
}
