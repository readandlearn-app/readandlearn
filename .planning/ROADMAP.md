# Roadmap: Read & Learn

## Overview

Transform the French-only Chrome extension into a production-ready, self-hostable language learning platform supporting all EU CEFR languages. The journey progresses from hardening infrastructure, expanding language support, adding PDF reading capabilities, establishing code quality foundations, documenting the design system, and enabling one-click deployment for non-technical users.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Production Infrastructure** - Remove hardcoded URLs, environment configuration, security fixes ✓
- [x] **Phase 2: Multi-Language Foundation** - Language detection, CEFR expansion beyond French ✓
- [x] **Phase 3: PDF Reading** - Local and browser PDF extraction and analysis ✓
- [x] **Phase 4: Code Quality** - Test coverage, error handling, modularize monolithic files ✓
- [x] **Phase 5: Design System** - Document existing visual patterns and accessibility guidelines ✓
- [x] **Phase 6: Deployment Templates** - Railway/Render one-click deploy, documentation ✓
- [x] **Phase 7: Housekeeping** - License change to Apache 2.0, final cleanup ✓

## Phase Details

### Phase 1: Production Infrastructure
**Goal**: Make the codebase deployable anywhere without code changes
**Depends on**: Nothing (first phase)
**Research**: Unlikely (internal refactoring, established patterns)
**Plans**: TBD

Key work:
- Replace hardcoded `localhost:3000` URLs with configurable backend
- Environment-based configuration for all settings
- Fix CORS configuration (restrict from `*` to extension origin)
- Input validation and XSS mitigation
- API key validation at startup

### Phase 2: Multi-Language Foundation
**Goal**: Expand from French-only to all EU CEFR languages
**Depends on**: Phase 1
**Research**: Likely (language detection, CEFR criteria per language)
**Research topics**: Language detection APIs/libraries, CEFR vocabulary lists per language, multilingual frequency dictionaries
**Plans**: TBD

Key work:
- Auto-detect article language with manual override
- Extend CEFR analysis prompts for all EU languages
- Language-specific frequency dictionaries
- Update UI for language selection

### Phase 3: PDF Reading
**Goal**: Enable CEFR analysis of PDF documents
**Depends on**: Phase 2
**Research**: Likely (PDF extraction libraries, browser PDF handling)
**Research topics**: PDF.js integration, text extraction accuracy, browser PDF viewer integration
**Plans**: TBD

Key work:
- Read and analyze local PDF files
- Read and analyze online PDFs in browser
- PDF text extraction pipeline
- Integration with existing CEFR analysis

### Phase 4: Code Quality
**Goal**: Establish test coverage and modular architecture
**Depends on**: Phase 3
**Research**: Unlikely (internal restructuring, test framework setup)
**Plans**: TBD

Key work:
- Set up Vitest test framework
- Test coverage for critical paths (CEFR analysis, deck operations)
- Split `content.js` (1813 lines) into modules
- Split `server.js` (1237 lines) into routes/services
- Extract duplicated Claude API call pattern

### Phase 5: Design System
**Goal**: Document visual identity and accessibility patterns
**Depends on**: Phase 4
**Research**: Unlikely (documenting existing patterns)
**Plans**: TBD

Key work:
- Document color palette (purple gradient, CEFR level colors)
- Document typography (Cinzel font, sizing)
- Component patterns and spacing guidelines
- Readability-focused design principles
- Accessibility guidelines (contrast ratios, font sizes)

### Phase 6: Deployment Templates
**Goal**: Enable one-click deployment for non-technical users
**Depends on**: Phase 5
**Research**: Likely (Railway/Render configuration)
**Research topics**: Railway template format, Render blueprint.yaml, Docker environment handling
**Plans**: TBD

Key work:
- Railway one-click deploy template
- Render one-click deploy template
- Updated README with deployment guide
- Docker setup documentation

### Phase 7: Housekeeping
**Goal**: License and final polish
**Depends on**: Phase 6
**Research**: Unlikely (file changes, cleanup)
**Plans**: TBD

Key work:
- Change license from AGPL-3.0 to Apache 2.0
- Update LICENSE file
- Final code cleanup
- Pre-release verification

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Production Infrastructure | 2/2 | Complete | 2026-01-14 |
| 2. Multi-Language Foundation | 2/2 | Complete | 2026-01-14 |
| 3. PDF Reading | 2/2 | Complete | 2026-01-15 |
| 4. Code Quality | 3/3 | Complete | 2026-01-15 |
| 5. Design System | 2/2 | Complete | 2026-01-15 |
| 6. Deployment Templates | 1/1 | Complete | 2026-01-15 |
| 7. Housekeeping | 1/1 | Complete | 2026-01-15 |

---
*Created: 2026-01-14*
