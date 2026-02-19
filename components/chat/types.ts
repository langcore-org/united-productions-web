export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  llmProvider?: string;
  thinking?: string;
  citations?: string[];
}

export interface ChatStreamState {
  content: string;
  thinking: string;
  isThinking: boolean;
  isComplete: boolean;
  error: string | null;
}

export interface ChatConfig {
  placeholder?: string;
  showThinking?: boolean;
  showCitations?: boolean;
  streamingEnabled?: boolean;
}

export interface ChatUIProps {
  // Messages
  messages: ChatMessage[];
  
  // Input state
  input: string;
  setInput: (value: string) => void;
  
  // Loading states
  isLoading: boolean;
  isStreaming: boolean;
  
  // Streaming state (optional)
  streamState?: ChatStreamState;
  
  // Current provider for display
  provider?: string;
  
  // Configuration
  config?: ChatConfig;
  
  // Empty state props
  emptyStateProps?: {
    title?: string;
    description?: string;
    suggestions?: string[];
    onSuggestionClick?: (suggestion: string) => void;
    icon?: React.ReactNode;
  };
  
  // Header content (optional)
  headerContent?: React.ReactNode;
  
  // Actions
  onSubmit: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  
  // Custom class names
  className?: string;
}
