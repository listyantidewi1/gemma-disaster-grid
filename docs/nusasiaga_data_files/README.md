# NusaSiaga drop-in data files

Three TypeScript files for the NusaSiaga teammate to drop into their repo.

| This file | Goes to | Purpose |
|---|---|---|
| `types.ts` | `nusasiaga/src/lib/types.ts` | Type definitions matching our Pydantic schemas |
| `edge-reports-scenario-a.ts` | `nusasiaga/src/lib/reports.ts` (replaces the existing file) | The 12 field reports for Jakarta flood scenario |
| `synthesis-scenario-a.ts` | `nusasiaga/src/lib/synthesis-scenario-a.ts` | The command-center synthesis result |

Once dropped in, run `npm run build` in the nusasiaga repo to confirm TypeScript compiles cleanly. Then follow `docs/nusasiaga_integration_brief.md` (one level up) for the file-by-file UI update list.

The data here was generated from a Colab E4B run on 2026-05-13. **On Day 4 the synthesis file will be regenerated from Kaggle 31B for higher quality** — just replace `synthesis-scenario-a.ts` with the new content at that point. Schema stays identical.
