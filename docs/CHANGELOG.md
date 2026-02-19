# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Sidebar Navigation Overhaul**
  - Implemented collapsible menu for Research section
    - 出演者リサーチ (/research/cast)
    - 場所リサーチ (/research/location)
    - 情報リサーチ (/research/info)
    - エビデンスリサーチ (/research/evidence)
  - Implemented collapsible menu for Transcript section
    - 文字起こしフォーマット変換 (/transcript)
    - NA原稿作成 (/transcript/na)
  - Added new top-level navigation items
    - 議事録作成 (/minutes)
    - 新企画立案 (/proposal)
  - Added 番組設定 link in bottom section (/settings/program)
  - Active page highlighting with usePathname
  - Persistent collapsible state with localStorage

- **FeatureChat Component**
  - Reusable chat UI component for all feature pages
  - Props: featureId, title, systemPrompt, placeholder, inputLabel, outputFormat
  - Streaming response support via SSE
  - Conversation history persistence (Prisma)
  - Word copy button for plaintext output mode
  - Support for both markdown and plaintext output

- **Feature Pages**
  - `/research/cast` - 出演者リサーチ (Cast Research)
  - `/research/location` - 場所リサーチ (Location Research)
  - `/research/info` - 情報リサーチ (Information Research)
  - `/research/evidence` - エビデンスリサーチ (Evidence Research)
  - `/minutes` - 議事録作成 (Meeting Minutes)
  - `/proposal` - 新企画立案 (New Proposal)
  - `/transcript` - 文字起こしフォーマット変換 (Transcript Formatting)
  - `/transcript/na` - NA原稿作成 (NA Script)
  - `/settings/program` - 番組設定 (Program Settings)

- **Prompt Management System**
  - Created `lib/prompts/` directory for system prompt management
  - Added prompt files:
    - `research-cast.ts` - Cast research system prompt
    - `research-location.ts` - Location research system prompt
    - `research-info.ts` - Information research system prompt
    - `research-evidence.ts` - Evidence research system prompt
    - `minutes.ts` - Meeting minutes system prompt
    - `proposal.ts` - Proposal system prompt (dynamic generation with program settings)
    - `transcript.ts` - Transcript formatting system prompt
    - `na-script.ts` - NA script system prompt

- **API Endpoints**
  - `/api/chat/feature`
    - GET: Retrieve conversation history by featureId
    - POST: Save conversation history
  - `/api/settings/program`
    - GET: Retrieve program settings
    - POST: Save program settings

- **Database Schema**
  - Added `ProgramSettings` model to Prisma schema
    - id: String @id @default(cuid())
    - userId: String @unique
    - programInfo: String @db.Text
    - pastProposals: String @db.Text
    - updatedAt: DateTime @updatedAt
    - Relation: User (one-to-one)

- **UI Components**
  - Added shadcn/ui components:
    - Button
    - Textarea
    - Card (Card, CardContent, CardDescription, CardHeader, CardTitle)
  - Updated MessageBubble and StreamingMessage integration

### Changed

- **Sidebar.tsx**
  - Complete rewrite with collapsible menu support
  - Added new icons from lucide-react (Users, MapPin, Info, Shield, Lightbulb, FileEdit, ChevronDown, ChevronRight, Tv)
  - Reorganized navigation structure with nested items
  - Added localStorage persistence for collapsed state
  - Improved active state detection for nested routes

- **Page Structure**
  - Moved from flat navigation to hierarchical navigation
  - Consolidated research features under `/research/*`
  - Consolidated transcript features under `/transcript/*`

### Fixed

- N/A

---

## [0.2.0] - 2026-02-19

### Added

- **Sidebar UI Improvements**
  - New chat button design enhancement
  - History item display improvements
  
- **Dashboard UI Enhancements**
  - Logo design update
  - Input bar styling improvements
  - Pill button component improvements
  
- **ResearchChat Improvements**
  - Message bubble styling enhancements
  - Streaming UI improvements
  
- **MessageBubble Component**
  - Left/right alignment configuration
  - Avatar display improvements

### Changed

- Improved overall chat interface responsiveness
- Enhanced visual consistency across components

### Fixed

- N/A

---

## Version History

<!-- Previous releases will be documented here -->

<!--
Example format for future releases:

## [1.0.0] - YYYY-MM-DD

### Added
- Feature description

### Changed
- Change description

### Deprecated
- Deprecated feature

### Removed
- Removed feature

### Fixed
- Bug fix description

### Security
- Security fix description
-->
