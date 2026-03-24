/**
 * useLLMStream 用 Reducer
 *
 * 9個の独立した useState を useReducer に統合。
 * エージェントループ実装時の状態追加が容易になる基盤。
 */

import type {
  CitationInfo,
  ConnectionStatus,
  FollowUpInfo,
  StreamPhase,
  SummarizationEvent,
  ToolCallInfo,
  UsageInfo,
} from "./types";

// =============================================================================
// State
// =============================================================================

export interface StreamState {
  content: string;
  phase: StreamPhase;
  error: string | null;
  usage: UsageInfo | null;
  toolCalls: ToolCallInfo[];
  citations: CitationInfo[];
  summarizationEvents: SummarizationEvent[];
  followUp: FollowUpInfo;
  connectionStatus: ConnectionStatus;
}

export const initialStreamState: StreamState = {
  content: "",
  phase: "idle",
  error: null,
  usage: null,
  toolCalls: [],
  citations: [],
  summarizationEvents: [],
  followUp: { questions: [], isLoading: false, error: null },
  connectionStatus: { status: null, message: "" },
};

// =============================================================================
// Actions
// =============================================================================

export type StreamAction =
  | { type: "PREPARE" }
  | { type: "START_STREAMING" }
  | { type: "APPEND_CONTENT"; delta: string }
  | { type: "UPSERT_TOOL_CALL"; toolCall: ToolCallInfo }
  | { type: "ADD_CITATION"; citation: CitationInfo }
  | { type: "SET_CONNECTION_STATUS"; status: ConnectionStatus }
  | { type: "COMPLETE"; usage: UsageInfo | undefined }
  | { type: "SET_ERROR"; message: string }
  | { type: "CANCEL" }
  | { type: "RESET" }
  | { type: "UPSERT_SUMMARIZATION_EVENT"; event: SummarizationEvent }
  | { type: "SET_FOLLOW_UP"; followUp: FollowUpInfo };

// =============================================================================
// Reducer
// =============================================================================

export function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case "PREPARE":
      return {
        ...initialStreamState,
        phase: "preparing",
      };

    case "START_STREAMING":
      return { ...state, phase: "streaming" };

    case "APPEND_CONTENT":
      return { ...state, content: state.content + action.delta };

    case "UPSERT_TOOL_CALL": {
      const existing = state.toolCalls.findIndex((t) => t.id === action.toolCall.id);
      if (existing >= 0) {
        const updated = [...state.toolCalls];
        updated[existing] = { ...updated[existing], ...action.toolCall };
        return { ...state, toolCalls: updated };
      }
      return { ...state, toolCalls: [...state.toolCalls, action.toolCall] };
    }

    case "ADD_CITATION": {
      if (state.citations.some((c) => c.url === action.citation.url)) return state;
      return { ...state, citations: [...state.citations, action.citation] };
    }

    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.status };

    case "COMPLETE":
      return {
        ...state,
        usage: action.usage ?? null,
        phase: "complete",
        connectionStatus: { status: null, message: "" },
      };

    case "SET_ERROR":
      return { ...state, error: action.message, phase: "error" };

    case "CANCEL":
      return { ...state, phase: "cancelled" };

    case "RESET":
      return initialStreamState;

    case "UPSERT_SUMMARIZATION_EVENT": {
      const idx = state.summarizationEvents.findIndex((e) => e.id === action.event.id);
      if (idx >= 0) {
        const updated = [...state.summarizationEvents];
        updated[idx] = action.event;
        return { ...state, summarizationEvents: updated };
      }
      return {
        ...state,
        summarizationEvents: [...state.summarizationEvents, action.event],
      };
    }

    case "SET_FOLLOW_UP":
      return { ...state, followUp: action.followUp };
  }
}
