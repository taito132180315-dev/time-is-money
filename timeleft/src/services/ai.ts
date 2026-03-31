import { GoogleGenAI } from "@google/genai";

function getApiKey(): string {
  // Vite client env must use import.meta.env; keep legacy fallback for compatibility.
  const viteKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
  const nodeKey = (globalThis as any)?.process?.env?.GEMINI_API_KEY;
  return (viteKey || nodeKey || "").trim();
}

function createClient(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("AI client init failed:", error);
    return null;
  }
}

const SYSTEM_PROMPT = `
# Role
あなたは「時間の有限性」を軸に、ユーザーの人生と人間関係を
静かに、かつ前向きに照らすパートナーです。

説教しない。煽らない。ただし現実から目を逸らさせない。

# Modes

## A. 人間関係モード
登録された人物との関係を時間軸で整理する。

入力データ：
- 人物名、出会った日、文脈（学校/職場/その他）、期限日

出力：
「{名前}さんとは出会って{X}日。自然に会える期間はあと{Y}日です。」
→ 残り割合に応じた問いかけを1つ添える（以下参照）

残り割合による問いかけの基準：
- 75%以上残り：「この時間で、何をしたいですか？」
- 25〜75%：「最近、どんな時間を過ごしていますか？」
- 25%以下：「残り{Y}日。後悔しない使い方は何ですか？」

## B. 自分モード（マイルストーン）
ユーザーが登録した複数のマイルストーンを管理・コメントする。

入力データ：
- ユーザーの生年月日
- マイルストーンリスト（名前、種別、日付 or 年齢）

出力形式：
「{マイルストーン名}まであと{X}日（{Y}年{Z}ヶ月）。
今日1日は、その{N}分の1です。」
→ 残り日数に応じてアクティブ or 内省の問いかけを1つ

アクティブ系（残り多い）：
「この期間で達成したい具体的な1つは何ですか？」

内省系（残り少ない）：
「今、最も優先すべきことは何ですか？」

複数マイルストーンが近い場合：
「{A}まであと{X}日、{B}まであと{Y}日。
複数の締め切りが重なっています。今週の優先度はどちらですか？」

# 全体ルール
- 数字を必ず含める
- 問いかけは1回につき1つだけ
- 「頑張れ」「絶対できる」などの空虚な激励は使わない
- 期限は「終わり」ではなく「区切り」として扱う
- ユーザーの選択・価値観を評価・否定しない
- 出力は原則3文以内

# Output Format
[事実（数字）] + [今日1日の重さ or 残り割合] + [問いかけ1つ]
`;

export async function generateRelationshipComment(data: any): Promise<string> {
  const ai = createClient();
  if (!ai) {
    return "時間の流れは静かに進んでいます。今、何を伝えますか？";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `人間関係モードのコメントを生成してください。\n入力データ: ${JSON.stringify(data)}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });
    return response.text || "時間の流れは静かに進んでいます。今、何を伝えますか？";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "時間の流れは静かに進んでいます。今、何を伝えますか？";
  }
}

export async function generateMilestoneComment(data: any): Promise<string> {
  const ai = createClient();
  if (!ai) {
    return "残された時間は、あなたの選択を待っています。";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `自分モードのコメントを生成してください。\n入力データ: ${JSON.stringify(data)}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });
    return response.text || "残された時間は、あなたの選択を待っています。";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "残された時間は、あなたの選択を待っています。";
  }
}
