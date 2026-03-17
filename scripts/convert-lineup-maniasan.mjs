/**
 * マニアさんOAラインナップxlsx → JSON変換スクリプト
 *
 * Usage: node scripts/convert-lineup-maniasan.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

// xlsx-cli uses SheetJS internally; we use it directly
const XLSX_PATH =
  "docs/assets/excels_and_words/オンエアラインナップ/マニアさん長期ラインナップ0227.xlsx";

async function main() {
  const XLSX = await import("xlsx");
  const buf = readFileSync(XLSX_PATH);
  const workbook = XLSX.read(buf);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays (preserve raw cell values)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // ヘッダー行を探す（"OA日" を含む行）
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (row.some((cell) => String(cell).includes("OA日"))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    console.error("ヘッダー行が見つかりません");
    process.exit(1);
  }

  const headers = rows[headerRowIdx].map((h) => String(h).trim());
  console.log(
    "ヘッダー:",
    headers.filter((h) => h),
  );

  // マニアさんのカラムマッピング
  // col 0: 回数, col 1: OA日, col 2: 収録日, col 3: 演出, col 4: PV・MIX,
  // col 5: ロケ日, col 6: 内容, col 7: ロケ, col 8: 作家, col 9: 担当P,
  // col 10: 担当D, col 11: スタジオ, col 12: 備考, col 13: 視聴率, col 14: 裏番組

  const episodes = [];
  let currentEpisode = null;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] ?? "").trim();

    // 回数番号で始まる行 = 新しいエピソード
    if (/^\d+$/.test(col0)) {
      // 前のエピソードを保存
      if (currentEpisode) {
        episodes.push(currentEpisode);
      }

      currentEpisode = {
        episodeNumber: col0,
        broadcastDateRaw: cleanCell(row[1]),
        recordingDate: cleanCell(row[2]),
        director: cleanCell(row[3]),
        content: cleanCell(row[6]),
        studioCast: cleanCell(row[11]),
        rating: cleanCell(row[13]),
        competingPrograms: "",
        notes: cleanCell(row[12]),
        production: {},
      };

      // 制作スタッフ情報
      if (cleanCell(row[4])) currentEpisode.production["PV・MIX"] = cleanCell(row[4]);
      if (cleanCell(row[5])) currentEpisode.production.ロケ日 = cleanCell(row[5]);
      if (cleanCell(row[7])) currentEpisode.production.ロケ = cleanCell(row[7]);
      if (cleanCell(row[8])) currentEpisode.production.作家 = cleanCell(row[8]);
      if (cleanCell(row[9])) currentEpisode.production.担当P = cleanCell(row[9]);
      if (cleanCell(row[10])) currentEpisode.production.担当D = cleanCell(row[10]);

      // 裏番組情報を集める
      const competing = collectCompeting(row, 14);
      if (competing) currentEpisode.competingPrograms = competing;
    } else if (currentEpisode) {
      // 放送休止行・日付のみ行はスキップ
      const contentCell = cleanCell(row[6]);
      if (contentCell.includes("放送休止")) continue;
      // OA日のみ記載の行（次のエピソードではないスキップ週）もスキップ
      const col1 = cleanCell(row[1]);
      if (col1 && !contentCell && !cleanCell(row[11]) && !cleanCell(row[13])) continue;

      // 継続行: 情報を追記
      appendIfPresent(currentEpisode, "content", contentCell);
      appendIfPresent(currentEpisode, "studioCast", cleanCell(row[11]));
      appendIfPresent(currentEpisode, "rating", cleanCell(row[13]));
      appendIfPresent(currentEpisode, "notes", cleanCell(row[12]));

      // ロケ日・内容の追加行
      if (cleanCell(row[5])) {
        currentEpisode.production.ロケ日 = appendStr(
          currentEpisode.production.ロケ日,
          cleanCell(row[5]),
        );
      }
      if (cleanCell(row[7])) {
        currentEpisode.production.ロケ = appendStr(
          currentEpisode.production.ロケ,
          cleanCell(row[7]),
        );
      }

      // 裏番組の追加行
      const competing = collectCompeting(row, 14);
      if (competing) {
        currentEpisode.competingPrograms = appendStr(currentEpisode.competingPrograms, competing);
      }
    }
  }

  // 最後のエピソード
  if (currentEpisode) {
    episodes.push(currentEpisode);
  }

  // production の空オブジェクトを除去
  for (const ep of episodes) {
    if (Object.keys(ep.production).length === 0) {
      delete ep.production;
    }
  }

  console.log(`\n取得エピソード数: ${episodes.length}`);
  console.log("最初:", JSON.stringify(episodes[0], null, 2));
  console.log("最後:", JSON.stringify(episodes[episodes.length - 1], null, 2));

  // JSON出力
  writeFileSync("scripts/output-maniasan.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log("\n出力: scripts/output-maniasan.json");
}

function cleanCell(val) {
  if (val === undefined || val === null) return "";
  // Excelシリアル日付値（数値で30000〜50000程度）をYYYY/MM/DD形式に変換
  if (typeof val === "number" && val > 25000 && val < 60000) {
    const date = new Date((val - 25569) * 86400 * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }
  return String(val).trim();
}

function appendIfPresent(obj, key, val) {
  if (!val) return;
  if (obj[key]) {
    obj[key] += `\n${val}`;
  } else {
    obj[key] = val;
  }
}

function appendStr(existing, val) {
  if (!existing) return val;
  return `${existing}\n${val}`;
}

function collectCompeting(row, startCol) {
  const parts = [];
  for (let c = startCol; c < row.length; c++) {
    const v = cleanCell(row[c]);
    if (v) parts.push(v);
  }
  return parts.join(" | ");
}

main().catch(console.error);
