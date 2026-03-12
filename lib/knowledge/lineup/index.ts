import type { LineupEpisodeInfo } from "../types";
import maniasanData from "./maniasan.json";
import kamichallengeData from "./kamichallenge.json";

export const maniasanLineup: LineupEpisodeInfo[] =
  maniasanData as LineupEpisodeInfo[];
export const kamichallengeLineup: LineupEpisodeInfo[] =
  kamichallengeData as LineupEpisodeInfo[];

/** 番組IDからラインナップデータを取得 */
export function getLineupByProgramId(
  programId: string
): LineupEpisodeInfo[] | undefined {
  const map: Record<string, LineupEpisodeInfo[]> = {
    maniasan: maniasanLineup,
    kamichallenge: kamichallengeLineup,
  };
  return map[programId];
}
