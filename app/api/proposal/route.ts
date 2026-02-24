/**
 * 新企画立案API
 *
 * POST /api/proposal
 * 企画案を生成
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiHandler } from "@/lib/api/handler";
import { generateProposals } from "@/lib/proposal/service";

const proposalSchema = z.object({
  programInfo: z.string().min(1, "番組情報を入力してください"),
  theme: z.string().min(1, "テーマを入力してください"),
  targetAudience: z.string().optional(),
  duration: z.string().optional(),
  budget: z.string().optional(),
  numProposals: z.number().min(1).max(5).default(3),
});

export type ProposalRequest = z.infer<typeof proposalSchema>;

/**
 * POST /api/proposal
 */
export const POST = createApiHandler(
  async ({ data }) => {
    const response = await generateProposals(data);
    return NextResponse.json({
      success: true,
      data: response,
    });
  },
  { schema: proposalSchema },
);
