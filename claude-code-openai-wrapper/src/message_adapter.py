from typing import List, Optional, Dict, Any
from src.models import Message
import re
import json


class MessageAdapter:
    """Converts between OpenAI message format and Claude Code prompts."""

    @staticmethod
    def messages_to_prompt(messages: List[Message]) -> tuple[str, Optional[str]]:
        """
        Convert OpenAI messages to Claude Code prompt format.
        Returns (prompt, system_prompt)
        """
        system_prompt = None
        conversation_parts = []

        for message in messages:
            if message.role == "system":
                # Use the last system message as the system prompt
                system_prompt = message.content
            elif message.role == "user":
                conversation_parts.append(f"Human: {message.content}")
            elif message.role == "assistant":
                conversation_parts.append(f"Assistant: {message.content}")

        # Join conversation parts
        prompt = "\n\n".join(conversation_parts)

        # If the last message wasn't from the user, add a prompt for assistant
        if messages and messages[-1].role != "user":
            prompt += "\n\nHuman: Please continue."

        return prompt, system_prompt

    @staticmethod
    def filter_content(content: str, show_thinking: bool = False) -> str:
        """
        Filter content for unsupported features and tool usage.
        Remove thinking blocks, tool calls, and image references.

        Args:
            content: The content to filter
            show_thinking: If True, preserve thinking blocks for display
        """
        if not content:
            return content

        # Handle thinking blocks based on show_thinking flag
        if show_thinking:
            # Convert thinking blocks to styled format for display
            thinking_pattern = r"<thinking>(.*?)</thinking>"
            content = re.sub(
                thinking_pattern,
                r"\n\n💭 **Agent Thinking:**\n\1\n\n---\n",
                content,
                flags=re.DOTALL
            )
        else:
            # Remove thinking blocks
            thinking_pattern = r"<thinking>.*?</thinking>"
            content = re.sub(thinking_pattern, "", content, flags=re.DOTALL)

        # Extract content from attempt_completion blocks (these contain the actual user response)
        attempt_completion_pattern = r"<attempt_completion>(.*?)</attempt_completion>"
        attempt_matches = re.findall(attempt_completion_pattern, content, flags=re.DOTALL)
        if attempt_matches:
            # Use the content from the attempt_completion block
            extracted_content = attempt_matches[0].strip()

            # If there's a <result> tag inside, extract from that
            result_pattern = r"<result>(.*?)</result>"
            result_matches = re.findall(result_pattern, extracted_content, flags=re.DOTALL)
            if result_matches:
                extracted_content = result_matches[0].strip()

            if extracted_content:
                content = extracted_content
        else:
            # Remove other tool usage blocks (when tools are disabled but Claude tries to use them)
            tool_patterns = [
                r"<read_file>.*?</read_file>",
                r"<write_file>.*?</write_file>",
                r"<bash>.*?</bash>",
                r"<search_files>.*?</search_files>",
                r"<str_replace_editor>.*?</str_replace_editor>",
                r"<args>.*?</args>",
                r"<ask_followup_question>.*?</ask_followup_question>",
                r"<attempt_completion>.*?</attempt_completion>",
                r"<question>.*?</question>",
                r"<follow_up>.*?</follow_up>",
                r"<suggest>.*?</suggest>",
            ]

            for pattern in tool_patterns:
                content = re.sub(pattern, "", content, flags=re.DOTALL)

        # Pattern to match image references or base64 data
        image_pattern = r"\[Image:.*?\]|data:image/.*?;base64,.*?(?=\s|$)"

        def replace_image(match):
            return "[Image: Content not supported by Claude Code]"

        content = re.sub(image_pattern, replace_image, content)

        # Clean up extra whitespace and newlines
        content = re.sub(r"\n\s*\n\s*\n", "\n\n", content)  # Multiple newlines to double
        content = content.strip()

        # If content is now empty or only whitespace, provide a fallback
        if not content or content.isspace():
            return "I understand you're testing the system. How can I help you today?"

        return content

    @staticmethod
    def format_claude_response(
        content: str, model: str, finish_reason: str = "stop"
    ) -> Dict[str, Any]:
        """Format Claude response for OpenAI compatibility."""
        return {
            "role": "assistant",
            "content": content,
            "finish_reason": finish_reason,
            "model": model,
        }

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """
        Rough estimation of token count.
        OpenAI's rule of thumb: ~4 characters per token for English text.
        """
        return len(text) // 4

    @staticmethod
    def format_tool_use(tool_name: str, tool_input: Dict[str, Any]) -> str:
        """Format a tool use block for display."""
        # Tool-specific formatting with icons
        tool_icons = {
            "Read": "📄",
            "Write": "✏️",
            "Edit": "📝",
            "Bash": "💻",
            "Grep": "🔍",
            "Glob": "📁",
            "WebSearch": "🌐",
            "WebFetch": "🌐",
            "Task": "🤖",
            "TodoWrite": "📋",
            "Skill": "🎯",
        }

        icon = tool_icons.get(tool_name, "🔧")

        # Format based on tool type
        if tool_name == "Read":
            file_path = tool_input.get("file_path", "unknown")
            return f"\n\n{icon} **Reading file:** `{file_path}`\n"

        elif tool_name == "Write":
            file_path = tool_input.get("file_path", "unknown")
            return f"\n\n{icon} **Writing file:** `{file_path}`\n"

        elif tool_name == "Edit":
            file_path = tool_input.get("file_path", "unknown")
            return f"\n\n{icon} **Editing file:** `{file_path}`\n"

        elif tool_name == "Bash":
            command = tool_input.get("command", "")
            desc = tool_input.get("description", "")
            if desc:
                return f"\n\n{icon} **Running:** {desc}\n```bash\n{command}\n```\n"
            return f"\n\n{icon} **Running command:**\n```bash\n{command}\n```\n"

        elif tool_name == "Grep":
            pattern = tool_input.get("pattern", "")
            path = tool_input.get("path", ".")
            return f"\n\n{icon} **Searching:** `{pattern}` in `{path}`\n"

        elif tool_name == "Glob":
            pattern = tool_input.get("pattern", "")
            path = tool_input.get("path", ".")
            return f"\n\n{icon} **Finding files:** `{pattern}` in `{path}`\n"

        elif tool_name == "WebSearch":
            query = tool_input.get("query", "")
            return f"\n\n{icon} **Web search:** {query}\n"

        elif tool_name == "WebFetch":
            url = tool_input.get("url", "")
            return f"\n\n{icon} **Fetching:** {url}\n"

        elif tool_name == "Task":
            description = tool_input.get("description", "")
            subagent_type = tool_input.get("subagent_type", "")
            return f"\n\n{icon} **Agent task:** {description} ({subagent_type})\n"

        elif tool_name == "Skill":
            skill = tool_input.get("skill", "")
            return f"\n\n{icon} **Using skill:** {skill}\n"

        elif tool_name == "TodoWrite":
            return f"\n\n{icon} **Updating task list**\n"

        else:
            # Generic format for unknown tools
            try:
                input_str = json.dumps(tool_input, indent=2, ensure_ascii=False)
                if len(input_str) > 200:
                    input_str = input_str[:200] + "..."
                return f"\n\n{icon} **{tool_name}:**\n```json\n{input_str}\n```\n"
            except:
                return f"\n\n{icon} **{tool_name}**\n"

    @staticmethod
    def format_tool_result(tool_name: str, result: Any, is_error: bool = False) -> str:
        """Format a tool result for display."""
        if is_error:
            return f"\n⚠️ **{tool_name} error:** {str(result)[:200]}\n"

        # For successful results, show brief summary
        if isinstance(result, str):
            if len(result) > 300:
                return f"\n✓ *{tool_name} completed* ({len(result)} chars)\n"
            return f"\n✓ *{tool_name} completed*\n"

        return f"\n✓ *{tool_name} completed*\n"
