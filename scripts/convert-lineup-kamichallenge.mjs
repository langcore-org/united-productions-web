/**
 * 神業チャレンジOA長期スケジュールxlsx → JSON変換スクリプト
 *
 * Usage: node scripts/convert-lineup-kamichallenge.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const XLSX_PATH = "docs/assets/excels_and_words/オンエアラインナップ/神業【OA長期スケ】 (4).xlsx";

async function main() {
  const XLSX = await import("xlsx");
  const buf = readFileSync(XLSX_PATH);
  const workbook = XLSX.read(buf);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // ヘッダー行を探す（"OA日" を含む行）
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
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

  // 神業のカラムマッピング（ヘッダー行から特定）
  // col 0: (空), col 1: ＃, col 2: OA日, col 3: 収録日, col 4: 演出,
  // col 5: Ｗ(作家), col 6: ﾘｻｰﾁ, col 7: 本編PV, col 8: サブPV,
  // col 9: 担当P, col 10: ｷｬｽＰ, col 11: 担当D, col 12: ロケ日,
  // col 13: 企画, col 14-15: (企画続き), col 16: ロケ出演者,
  // col 17: (出演者続き), col 18: 候補者, col 19: 視聴率,
  // col 20: スタジオ, col 21: メモ, col 22: 裏番組

  const episodes = [];
  let currentEpisode = null;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col1 = String(row[1] ?? "").trim();

    // 回数番号 or "ナビ" で始まる行 = 新しいエピソード
    const isNewEpisode = /^\d+$/.test(col1) || /^ナビ/.test(col1) || /^合同/.test(col1);

    if (isNewEpisode) {
      if (currentEpisode) {
        episodes.push(currentEpisode);
      }

      currentEpisode = {
        episodeNumber: col1,
        broadcastDateRaw: cleanCell(row[2]),
        recordingDate: cleanCell(row[3]),
        director: cleanCell(row[4]),
        content: cleanCell(row[13]),
        locationCast: cleanCell(row[16]),
        studioCast: cleanCell(row[20]),
        rating: cleanCell(row[19]),
        competingPrograms: "",
        notes: cleanCell(row[21]),
        production: {},
      };

      // 企画の追加カラム
      const content14 = cleanCell(row[14]);
      const content15 = cleanCell(row[15]);
      if (content14) currentEpisode.content = appendStr(currentEpisode.content, content14);
      if (content15) currentEpisode.content = appendStr(currentEpisode.content, content15);

      // ロケ出演者の追加カラム
      const cast17 = cleanCell(row[17]);
      if (cast17) currentEpisode.locationCast = appendStr(currentEpisode.locationCast, cast17);

      // 候補者
      const candidates = cleanCell(row[18]);
      if (candidates) currentEpisode.production.候補者 = candidates;

      // 制作スタッフ
      if (cleanCell(row[5])) currentEpisode.production.作家 = cleanCell(row[5]);
      if (cleanCell(row[6])) currentEpisode.production.リサーチ = cleanCell(row[6]);
      if (cleanCell(row[7])) currentEpisode.production.本編PV = cleanCell(row[7]);
      if (cleanCell(row[8])) currentEpisode.production.サブPV = cleanCell(row[8]);
      if (cleanCell(row[9])) currentEpisode.production.担当P = cleanCell(row[9]);
      if (cleanCell(row[10])) currentEpisode.production.キャスP = cleanCell(row[10]);
      if (cleanCell(row[11])) currentEpisode.production.担当D = cleanCell(row[11]);
      if (cleanCell(row[12])) currentEpisode.production.ロケ日 = cleanCell(row[12]);

      // 裏番組（col 22以降）
      const competing = collectCompeting(row, 22);
      if (competing) currentEpisode.competingPrograms = competing;
    } else if (currentEpisode) {
      // 継続行
      appendIfPresent(currentEpisode, "content", cleanCell(row[13]));
      if (cleanCell(row[14])) appendIfPresent(currentEpisode, "content", cleanCell(row[14]));
      if (cleanCell(row[15])) appendIfPresent(currentEpisode, "content", cleanCell(row[15]));
      appendIfPresent(currentEpisode, "locationCast", cleanCell(row[16]));
      if (cleanCell(row[17])) appendIfPresent(currentEpisode, "locationCast", cleanCell(row[17]));
      appendIfPresent(currentEpisode, "studioCast", cleanCell(row[20]));
      appendIfPresent(currentEpisode, "rating", cleanCell(row[19]));
      appendIfPresent(currentEpisode, "notes", cleanCell(row[21]));

      // 制作スタッフ追記
      if (cleanCell(row[9])) {
        currentEpisode.production.担当P = appendStr(
          currentEpisode.production.担当P,
          cleanCell(row[9]),
        );
      }
      if (cleanCell(row[11])) {
        currentEpisode.production.担当D = appendStr(
          currentEpisode.production.担当D,
          cleanCell(row[11]),
        );
      }
      if (cleanCell(row[12])) {
        currentEpisode.production.ロケ日 = appendStr(
          currentEpisode.production.ロケ日,
          cleanCell(row[12]),
        );
      }
      if (cleanCell(row[18])) {
        currentEpisode.production.候補者 = appendStr(
          currentEpisode.production.候補者,
          cleanCell(row[18]),
        );
      }

      const competing = collectCompeting(row, 22);
      if (competing) {
        currentEpisode.competingPrograms = appendStr(currentEpisode.competingPrograms, competing);
      }
    }
  }

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

  writeFileSync("scripts/output-kamichallenge.json", JSON.stringify(episodes, null, 2), "utf-8");
  console.log("\n出力: scripts/output-kamichallenge.json");
}

function cleanCell(val) {
  if (val === undefined || val === null) return "";
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
