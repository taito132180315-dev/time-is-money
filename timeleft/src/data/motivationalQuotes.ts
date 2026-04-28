export interface MotivationalQuote {
  text: string;
  author: string;
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  { text: "やってみせ、言って聞かせて、させてみせ、ほめてやらねば人は動かじ", author: "山本五十六" },
  { text: "今日できることを明日に延ばすな", author: "ベンジャミン・フランクリン" },
  { text: "知ることは、できることの半分にすぎない", author: "ゲーテ" },
  { text: "考えるより動け。動きながら考えろ", author: "ナポレオン・ボナパルト" },
  { text: "千里の道も一歩から", author: "老子" },
  { text: "機会は準備された心にしか訪れない", author: "ルイ・パスツール" },
  { text: "始めることが、仕事の半分だ", author: "アリストテレス" },
  { text: "失敗とは、より賢く再挑戦するための機会である", author: "ヘンリー・フォード" },
  { text: "七転び八起き", author: "日本の格言" },
  { text: "成功は最終的なものではなく、失敗は致命的なものではない。大切なのは続ける勇気だ", author: "ウィンストン・チャーチル" },
  { text: "石の上にも三年", author: "日本の格言" },
  { text: "私は失敗したことがない。ただ、うまくいかない方法を1万通り見つけただけだ", author: "トーマス・エジソン" },
  { text: "負けを知ることで、本当の強さが生まれる", author: "宮本武蔵" },
  { text: "嵐の後には必ず静けさがくる", author: "ウィリアム・シェイクスピア" },
  { text: "天才とは1%のひらめきと99%の努力である", author: "トーマス・エジソン" },
  { text: "できると思えばできる、できないと思えばできない", author: "ヘンリー・フォード" },
  { text: "自分自身を信じることが、成功への第一歩だ", author: "ウィリアム・ジェームズ" },
  { text: "我思う、ゆえに我あり", author: "ルネ・デカルト" },
  { text: "人は信じる通りになる", author: "マハトマ・ガンジー" },
  { text: "夢なき者に理想なし、理想なき者に計画なし", author: "吉田松陰" },
  { text: "われ以外みなわが師", author: "吉川英治" },
  { text: "学んで思わざれば則ち罔し、思うて学ばざれば則ち殆し", author: "孔子" },
  { text: "一日一日を大切に生きよ、それが一生となる", author: "モーツァルト" },
  { text: "過去を変えることはできない。しかし未来は自分で作れる", author: "アブラハム・リンカーン" },
  { text: "人生は短く、技術を習得する時間は長い", author: "ヒポクラテス" },
  { text: "自分を知ることが、すべての知恵の始まりだ", author: "アリストテレス" },
  { text: "不可能とは、努力しない者の言い訳である", author: "ナポレオン・ボナパルト" },
  { text: "情熱なき天才は、燃えない薪のようなものだ", author: "パブロ・ピカソ" },
  { text: "道は開ける", author: "デール・カーネギー" },
  { text: "偉大な仕事をするための唯一の方法は、自分のやることを愛することだ", author: "スティーブ・ジョブズ" },
];

export function getRandomMotivationalQuote(): MotivationalQuote {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export function formatQuote(q: MotivationalQuote): string {
  return `「${q.text}」— ${q.author}`;
}
