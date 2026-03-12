import { readFileSync } from "fs";

const file = process.argv[2];
const data = JSON.parse(readFileSync(file, "utf8"));

console.log("総数:", data.length);
console.log("回数一覧:", data.map(e => e.episodeNumber).join(", "));

let emptyContent = 0;
data.forEach(e => { if (!e.content) emptyContent++; });
console.log("content空の件数:", emptyContent);

const naviCount = data.filter(e => /ナビ|合同/.test(e.episodeNumber)).length;
console.log("ナビ/合同の件数:", naviCount);
console.log("本放送の件数:", data.length - naviCount);

// 放送休止チェック
data.forEach(e => {
  if (e.content && e.content.includes("放送休止")) {
    console.log(`注意: #${e.episodeNumber} に放送休止テキストが混入`);
  }
});
