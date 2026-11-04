# Changelog

Changes to the Western MBA – PSO application form since the first prototype (`2b703f0`).
Front-end only: the backend, database, admin views and emails must be updated to match the **data contract changes** below.

## 2026-11-04

Commits: `aa1e08e`, `b702074`, `f29268c`, `ea9b145`, `6b92152`.

### Data contract changes (backend must follow)

| Field | Change |
|---|---|
| `I02` intake | New value `"other"`. |
| `I03` *(new)* | String "Preferred intake". Required only when `I02 === "other"`. Consider it in the duplicate check (email/ID + intake). |
| `P06` country of birth | **Removed.** |
| `P05` place of birth | Now free text (was a province code when born in Vietnam). |
| `S01[].major` | Value is the English major name from a fixed list (e.g. `"Business Administration"`), or `"other"`. Master-only options (MBA, EMBA, Master of Management, Master of Finance, Master of Accounting, Master of Marketing, Master of Data Science / Business Analytics) are only valid when `level === "master"`. |
| `S01[].major_other` *(new)* | String, required only when `major === "other"`. |
| `S01[].school` | Label renamed "School / University" (key unchanged). |
| `S02[]` professional certificates | Still optional (array may be empty). If a row exists, `name`, `year` and `issuer` are all required. |
| `S03` English certificate | Enum: `ielts`, `toefl`, `pte`, `vstep`, `peic`, `aptis`, `none`. Old value `equiv` no longer exists. |
| `S04` equivalent certificate name | **Removed.** |
| `S05` overall score | Present only for certificates that have one (all except `peic` and `none`). Ranges below. |
| `S06` sub-scores `{L, R, W, S}` | Optional, present for `ielts`, `toefl`, `pte`, `vstep`, `aptis`. Ranges below. |
| `S09` *(new)* CEFR level | `peic`: `A1`, `L1`, `L2`, `L3`, `L4`, `L5` (Level 1 = A2 … Level 5 = C2). `aptis`: `A1`, `A2`, `B1`, `B2`, `C`. Required for those two only. |
| `S10` *(new)* result | `peic` only: `pass`, `merit`, `distinction`. |
| `S07` test date / `S08` expected test date | `S07` when a certificate is selected, `S08` when `S03 === "none"`. |
| `U08` *(new upload)* | "Scholarship Application Letter": PDF, max 1 file, required. Add to upload API, storage, admin checklist and the "missing documents" flow. |

Score rules (validate server-side too):

| `S03` | `S05` overall | `S06` each skill | Extra rule |
|---|---|---|---|
| `ielts` | 0–9, step 0.5 | 0–9, step 0.5 | Invalid if all four sub-scores are higher than overall |
| `toefl` | 0–120, integer | 0–30, integer | |
| `pte` | 10–90, integer | 10–90, integer | |
| `vstep` | 0–10, step 0.5 | 0–10, step 0.5 | Same rule as IELTS. Form shows the band: 4.0–5.5 B1, 6.0–8.0 B2, 8.5–10 C1 |
| `peic` | — | — | `S09` + `S10` instead of scores |
| `aptis` | 0–200, integer | 0–50, integer | Overall must equal the sum of the four skills; `S09` required |

Other backend notes:
- Scholarship flag **F5** (`computeFlags`) still auto-scores IELTS only (≥ `thresholds.ielts`); every other certificate returns `review`. Admission needs to define equivalence thresholds if they want auto-scoring.
- The scholarship requirements box still says "IELTS 5.5 or an equivalent certificate recognised by WSU". Confirm the wording with Admission.
- Honeypot field renamed to `name="wmba_hp_x7"` so browser autofill doesn't fill it. A filled honeypot still ends silently on a fake "done" screen; consider logging it server-side.
- Draft `localStorage` key is now `wmba-pso-draft-v5`; the draft also stores finished uploads (`{id, name, size, kind, serverId, status: 'done'}`). The server must keep uploaded files referenced by `serverId` until the application is submitted or the draft expires.
- Uploaded file names are sent in full (only the display is shortened).

### Form behaviour

- Intake: added "Other" with a "Preferred intake" text field.
- Studies: "Degrees" and "Professional certificates" shown as section headings, like "English proficiency" (repeater option `section: true`).
- Major: searchable combobox (type to filter, accent-insensitive); "Other (please specify)" at the end opens a text field.
- English certificate: dropdown; the result fields, ranges and help text follow the selected certificate; switching certificate forces re-selecting the level/result.
- Test validity warning (2 years) for IELTS, TOEFL iBT and PTE Academic.
- Documents: added "Scholarship Application Letter" (also listed on the intro card).
- Footer and consent: "Privacy Policy" linking to https://pso.edu.vn/chinh-sach-bao-mat/.

### Fixes

- Date of birth typing: "1/3/1990" now becomes `01/03/1990` (was `13/19/90`).
- Uploaded files are kept when a draft is restored.
- Edits are saved immediately when leaving a step (including Back to the intro) and on `pagehide`; the draft is not re-saved after submit.
- Calendar PageUp/PageDown clamps the day (31/3 → 28/2 instead of jumping to March).
- Impossible dates (e.g. 31/02) show "Please enter a valid date." instead of a misleading message.
- Dependent errors re-check when the field they depend on changes: W02 → W03, P07 → P08, S06 → S05.
- Ward/commune: a saved ward is restored if the ward list loads late; focus is kept if the list fails to load.
- Long file names are shortened in the middle, keeping the extension (full name on hover); long words in hints, warnings and the done page wrap instead of overflowing on phones.
- Text selection is now visible (it used the same grey as the input background).
- "Complete" badge on the Review page is green.

### Known issue

- After changing Country or Province, the step redraws on the next click, so a text selection made in another field at that moment is lost. No data is affected.
