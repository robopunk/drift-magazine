# Antigravity Rules & Workspace Context

**Core Directive:**
1. **Claude Code is Primary:** Claude Code running in VS Code is the primary development agent for this project.
2. **Complementary Role:** Antigravity (Gemini) strictly acts as a complementary agent (testing, browser agent runs, deep research, generation, structural mapping) and will NOT blindly overwrite or conflict with code being actively edited in VS Code.
3. **Single Source of Truth:** `CLAUDE.md` and the `.planning/` directory are the absolute sources of truth for rules, momentum statuses, and GSD planning phases. Antigravity must read these before undertaking planning or UI/UX tasks.
4. **Skills Location:** Rely on the user's global Claude skills located at `C:\Users\stefa\.claude\skills\` (e.g., `ui-ux-pro-max`, `frontend-design`) to maintain a single set of instructions for design rules. Do not duplicate these unless asked.
