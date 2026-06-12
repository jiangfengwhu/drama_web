/**
 * 电影场景 heading — 仅 slugline 进 GUIDE；环境氛围只写 SCENE: 行（UI 展示）。
 */

export const SCENE_HEADING_ELEMENTS = `【场景要素】
1. Slugline：INT. 或 EXT. + 地点 + 时间（DAY/NIGHT 等）→ 写入 GUIDE: SCENE_HEAD
2. 环境氛围：仅一行 SCENE:（光线、温度、压迫感），禁止在 SCENE_HEAD 重复
3. 人物渐进登场：NPC 首次开口前 GUIDE: CAST，禁止预填全员
4. 转场：节拍闭合 / 换时空 / 新关键人物须在场 → META: CUT|slugline + SCENE: 新环境；旧场景群聊自动只读`;

export const SCENE_HEAD_PROTOCOL = `【场景协议 — 群聊 = 一场戏，私聊 = 一对一密谈】
· 每个场景群聊 = 一个 slugline 场次。
· 私聊用于秘密/情报/威胁；内容默认其他 NPC 不知。
· 开场：GUIDE: SCENE_HEAD|slugline（仅 slugline，禁止附带氛围/ cast / 目的）
· 氛围：仅 SCENE: 一行，紧接 SCENE_HEAD 之后输出
· 转场：本场 Beat 闭合或时空/人物不得不变 → META: CUT|slugline + SCENE: 新环境（均在 MOOD 之前）
· 换地点、换时间、换不在场关键人物 — 必须 CUT，禁止同 thread 硬切场景`;

export const SCENE_HEAD_GUIDE_FIELD = 'SCENE_HEAD';

export const META_CUT_PREFIX = 'META: CUT';
