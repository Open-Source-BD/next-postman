<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


<claude-mem-context>
# Memory Context

# [next-postman] recent context, 2026-06-18 11:51pm GMT+6

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 2 obs (1,518t read) | 64,180t work | 98% savings

### Jun 18, 2026
910 9:49p ⚖️ next-postman Phase 1+2 Plan — Collection Runner + Git-native Storage Architecture
915 9:51p 🔵 next-postman — Critical Code-Path Findings for Phase 1 Runner Plan
S134 Brutally honest technical review of next-postman Phase 1+2 plan — find logical gaps, unstated assumptions, feasibility risks, sequencing problems (Jun 18 at 9:51 PM)
**Investigated**: Complete codebase audit of next-postman (Next.js 16/React 19/Zustand Postman-clone) including: PmSandbox constructor and callback wiring, useRequestRunner hook internals, sendViaProxy full implementation, store.setEnvVar implementation, selectActiveVars merge logic, persist.ts localStorage strategy, collectionTree.ts traversal, proxy/route.ts timeout handling, importExport.ts, types.ts full type surface

**Learned**: - PmSandbox onEnvSet is currently wired to state.setEnvVar (real store mutation) — pm.environment.set DOES persist into the real saved env today
    - sendViaProxy receives vars snapshot taken BEFORE pre-request scripts run, so any pm.environment.set mutations in pre-request scripts do NOT affect the actual request's variable interpolation in the current codebase
    - PmSandbox.pm.variables and envMap are the same object reference, so set/get within one execution are consistent internally, but the vars passed to resolveEnv in sendViaProxy are the original pre-script EnvVar[]
    - Neither sendViaProxy nor proxy/route.ts have AbortController, signal, or timeout — hung requests block forever
    - useRequestRunner uses alert() for pre-request errors — must be removed in executeRequest extraction
    - selectActiveVars merges globals first, then active env vars (active env overrides) — run-scoped bag must replicate this order for seeding
    - store.setEnvVar upserts into active environment or falls back to globals — no run-scoping concept exists
    - File System Access API is completely absent from the codebase (no showDirectoryPicker, showOpenFilePicker, IndexedDB usage)
    - persist.ts is localStorage-only; File objects in KvItem.file are silently dropped on serialization
    - collectionTree.findNode does not search collection roots, only their children — runner nodeId targeting needs clarification

**Completed**: Full technical gap analysis delivered covering:
    Phase 1: (1) Pre-request mutations don't flow into sendViaProxy in current code — chaining will be broken without threading the mutated bag; (2) pm.environment.set dual-mode problem (runner isolation vs single-send persistence); (3) "pure framework-free" claim is wrong (browser APIs throughout); (4) failure semantics completely undefined across 7+ failure modes; (5) timeout/cancel requires AbortController threaded through the stack + Worker for script loops; (6) data iteration scope rules undefined; (7) variable scope flattening diverges from real Postman; (8) runner results model missing; (9) store.runFolder is wrong ownership boundary; (10) tree traversal target ambiguity
    Phase 2: (1) FSA permission persistence requires IndexedDB for handles + re-query on reload; (2) "live tree" misleading — no reliable cross-browser file watching; (3) zip fallback creates two different product modes; (4) on-disk schema undefined for IDs/ordering/metadata; (5) secrets become a Git problem; (6) file body null = silently lossy replay; (7) atomicity missing; (8) OpenAPI $ref handling gaps (cycles, component refs, 3.1 JSON Schema 2020-12); (9) security scheme mapping ambiguous; (10) server URL/variables handling missing

**Next Steps**: Session appears complete — the full review response was delivered. No further tool executions are expected unless the user follows up with implementation questions or requests fixes.


Access 64k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>