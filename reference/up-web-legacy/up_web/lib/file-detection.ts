/**
 * File detection utility for matching file mentions in messages
 * against team_file_refs from Google Drive
 */

import type { FileReference, TeamFileRef } from "@/components/chat";

export interface DetectedFile {
  file: TeamFileRef;
  matchType: "exact" | "partial" | "fuzzy";
  matchedText: string;
}

/**
 * Normalize text for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Normalize Japanese/Unicode characters
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC") // Normalize Japanese width variants
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Remove file extension from filename
 */
function removeExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return fileName;
  return fileName.substring(0, lastDot);
}

/**
 * Extract significant words from a filename
 * Splits by common delimiters: _, -, spaces, Japanese particles
 */
function extractSignificantWords(text: string): string[] {
  // Split by common delimiters
  const words = text.split(/[_\-\s　・]+/);
  // Filter short words and common particles
  return words.filter((w) => w.length >= 3);
}

/**
 * Detect file references in user message
 * Returns files from teamFiles that are mentioned in the message
 *
 * Detection strategies:
 * 1. Exact match: Full filename appears in message
 * 2. Partial match: Filename without extension appears
 * 3. Fuzzy match: Significant words from filename appear
 */
export function detectFileMentions(
  message: string,
  teamFiles: TeamFileRef[]
): DetectedFile[] {
  const detected: DetectedFile[] = [];
  const normalizedMessage = normalizeText(message);
  const detectedIds = new Set<string>();

  for (const file of teamFiles) {
    // Skip folders - only detect file references
    if (file.ref_type === "folder") continue;

    // Skip if already detected
    if (detectedIds.has(file.drive_id)) continue;

    const fileName = file.drive_name;
    const normalizedFileName = normalizeText(fileName);
    const nameWithoutExt = removeExtension(fileName);
    const normalizedNameWithoutExt = normalizeText(nameWithoutExt);

    // Strategy 1: Exact name match (including extension)
    if (normalizedMessage.includes(normalizedFileName)) {
      detected.push({ file, matchType: "exact", matchedText: fileName });
      detectedIds.add(file.drive_id);
      continue;
    }

    // Strategy 2: Name without extension (min 4 chars to avoid false positives)
    if (
      nameWithoutExt.length >= 4 &&
      normalizedMessage.includes(normalizedNameWithoutExt)
    ) {
      detected.push({
        file,
        matchType: "partial",
        matchedText: nameWithoutExt,
      });
      detectedIds.add(file.drive_id);
      continue;
    }

    // Strategy 3: Significant word match
    const significantWords = extractSignificantWords(nameWithoutExt);
    for (const word of significantWords) {
      const normalizedWord = normalizeText(word);
      // Require minimum 4 chars for fuzzy match to avoid false positives
      if (normalizedWord.length >= 4 && normalizedMessage.includes(normalizedWord)) {
        detected.push({ file, matchType: "fuzzy", matchedText: word });
        detectedIds.add(file.drive_id);
        break;
      }
    }
  }

  return detected;
}

/**
 * Merge detected files with @mentioned files
 * Avoids duplicates by checking file IDs
 */
export function mergeFileReferences(
  mentionedFiles: FileReference[],
  detectedFiles: DetectedFile[]
): FileReference[] {
  const merged = [...mentionedFiles];
  const existingIds = new Set(mentionedFiles.map((f) => f.id));

  for (const { file } of detectedFiles) {
    if (!existingIds.has(file.drive_id)) {
      merged.push({
        id: file.drive_id,
        name: file.drive_name,
        mimeType: file.mime_type || "application/octet-stream",
        source: "auto-detect" as const,
      });
      existingIds.add(file.drive_id);
    }
  }

  return merged;
}
