# Prompt: Generate REPORT.md for a Philippine Government Department from GAA Aggregates

> This is a **template prompt** for an LLM (Claude or equivalent) that will produce a critical, journalistic analysis of a single department's seven-year General Appropriations Act (GAA) data.
>
> The orchestrator script (`build_dept_dossiers.py`) splits this file at the `RENDER:START` HTML-comment marker below, renders the placeholders only in the body, and writes the resulting prompt into each department's directory. To run it: open the rendered `REPORT_PROMPT.md` in the dept's directory and paste it as a user message into a Claude Code session, or `cat REPORT_PROMPT.md | claude`.

---

## Placeholders the orchestrator will fill in

(The placeholders below use the literal `{{ }}` syntax in the body of the prompt. They are written here in code spans so they do not get substituted in this header.)

| Placeholder | Example |
|---|---|
| `\{\{DEPT_ID\}\}` | `37` |
| `\{\{DEPT_NAME\}\}` | `Department of Information and Communications Technology (DICT)` |
| `\{\{DEPT_DIR\}\}` | `public/data/gaa/dict/37` |
| `\{\{TOTAL_ROWS\}\}` | `10026` |
| `\{\{YEARS\}\}` | `2020, 2021, 2022, 2023, 2024, 2025, 2026` |
| `\{\{FIRST_YEAR\}\}` / `\{\{LAST_YEAR\}\}` | `2020` / `2026` |

---

<!-- RENDER:START -->

You are an investigative data journalist analyzing seven years of Philippine government budget data for a single department. Your output will be the source material for a public mini-site about how this department spends taxpayer money. The tone should be **analytical, critical, and journalistic** — neither cheerleading nor cynical. Back every claim with a number that a reader can verify against the JSON.

### Department under review

- **Department code:** `{{DEPT_ID}}`
- **Department name:** `{{DEPT_NAME}}`
- **Source data location:** `{{DEPT_DIR}}/`
- **Years covered:** `{{YEARS}}`
- **Source line items:** `{{TOTAL_ROWS}}` (filtered from the national GAA parquet)

### Files you will analyze

All files live in `{{DEPT_DIR}}/`. Read them in this order:

1. `yearly_totals.json` — department-wide annual totals; use for the headline trend.
2. `agencies.json` — bureaus/attached agencies under this department (Level 2).
3. `fpaps.json` — programs / activities / projects (Level 3, "FPAP" = Financial Plan and Activity Program).
4. `fund_subcategories.json` — funding sources (Level 5: regular GAA, special funds, foreign loans).
5. `expenses.json` — expense categories (Level 6: Personnel Services / MOOE / Capital Outlays).
6. `objects.json` — sub-object code line items (Level 7, finest grain — but see caveat below).
7. `operating_units.json` — implementing units (Level 4); useful for spotting central-vs-regional concentration.

If a `full_extract.csv` is also present, treat it as the audit trail — you do **not** need to read it to write the report, but cite its existence so readers know the granular data is available.

### Required units & conventions

- **All `amount` fields are in PHP thousands.** When you write a number in the report, render it in a way that makes scale obvious. Examples:
  - Raw `18,217,677` → `₱18.2 B` or `₱18.22 billion`
  - Raw `755,345` → `₱755 M` or `₱755 million`
  - Raw `11,261` → `₱11.3 M`
- Never display a raw thousands-denominated number without a unit conversion.
- Year-over-year (YoY) changes: percentage with sign, e.g., `+58.7%` or `−15.9%`.

### Analytical approach (mandatory steps)

Before writing, do this analysis. You can use a small inline Python script (via the Bash tool) if it helps; show your work for the numbers you cite.

1. **Headline trend.** Compute YoY % change for every year in `yearly_totals.json`. Note any contraction years, the largest single-year jump, and the cumulative growth from the first to the last year.
2. **Agency-level divergence.** For each agency in `agencies.json`, compute (a) 7-year total, (b) 2020→latest growth %, and (c) share of department's 7-year total. **Flag any agency whose share or trajectory is anomalous** — sharp decline, sharp growth, or wildly different from siblings.
3. **Program (FPAP) concentration.** In the latest year, what share of the department's total budget is accounted for by the top 1, top 5, and top 10 programs? Flag single-program concentration above 15%.
4. **Program renaming detection.** Identify FPAPs that had ≥₱200M in 2020/2021/2022 but show ≈₱0 in the latest year. For each, suggest the **likely successor program** by name similarity (e.g., "Wi-Fi" → "Internet Access", "Plan" → "Program"). This list is a **mandatory section** of the report.
5. **Expense mix shift.** Compute the share of Personnel / MOOE / Capital Outlays for the first year and the latest year. Has the department shifted from building things (Capital Outlays) to buying services (MOOE)? Or the reverse?
6. **Funding source mix.** From `fund_subcategories.json`, identify any non-regular funding: special funds (earmarked), foreign loans (debt-financed), trust receipts. Flag these — they have different accountability and reallocation rules than regular GAA.
7. **What the latest-year money buys.** From `objects.json` filtered to the latest year, list the top 10 line items by amount. This grounds abstract program names in concrete spending.

### Caveats you MUST surface in the report

These are not optional. The data has known shape problems that, if hidden, will mislead readers.

- **Amounts are in PHP thousands.** State this once, prominently.
- **Program (FPAP) renaming.** The DBM regularly renames programs; raw FPAP-level YoY trends will look like births and deaths that are actually renames. Surface concrete examples from this department.
- **UACS object code recoding.** At the L7 (object) level, multi-year trends are unreliable because the chart of accounts has been revised. Object data is safe for **single-year** breakdowns only.
- **GAA ≠ actual spending.** This is *appropriations* (what was authorized), not *obligations* (what was committed) or *disbursements* (what was paid). Do not claim the department "spent" any amount — say "was appropriated" or "received in the GAA."

### REPORT.md structure (use these sections, in this order)

```markdown
# {{DEPT_NAME}}'s Seven-Year Budget: A Critical Reading of GAA Allocations, {{FIRST_YEAR}}–{{LAST_YEAR}}

**Department:** {{DEPT_NAME}} (Code {{DEPT_ID}})
**Fiscal years analyzed:** {{YEARS}}
**Source:** General Appropriations Act, parsed from `data/gaa/gaa.parquet`
**Currency:** All amounts in PHP thousands unless noted

---

## At a glance

[Markdown table: year | appropriation (₱ thousands) | YoY % | line items]

[1–2 sentence narrative on the overall trend: total growth, contraction years, major inflection points.]

---

## 1. The headline: [a short interpretive subtitle you choose based on what the data actually shows]

[2–4 paragraphs. Describe the SHAPE of the department's budget over time — not just the numbers, but what they imply. Did the department grow, shrink, or restructure? Did its identity change?]

[Include the expense-mix table here:]

| Category | {{FIRST_YEAR}} | {{LAST_YEAR}} | Change |
|---|---:|---:|---:|

---

## 2. The agencies: [interpretive subtitle]

[For each agency: a paragraph describing its trajectory, with concrete numbers. Highlight divergences. If one agency dominates, say so. If one is being defunded while another surges, that is the story.]

| Agency | 7-year total (₱ thousands) | {{FIRST_YEAR}} → {{LAST_YEAR}} | Direction |
|---|---:|---:|---|

---

## 3. The programs (FPAPs): where the money concentrates

[Top 10 programs by latest-year amount, with origin notes (continuing / new / renamed).]

[Concentration commentary: what % of the department's latest-year budget is in the top 1 program? Top 5? Is this a healthy diversification or a single-point-of-failure portfolio?]

---

## 4. The renaming problem (a critical caveat)

[Mandatory section. List FPAPs that disappeared by the latest year despite peaking earlier, with likely successors. Explain to the reader why naive YoY charts at FPAP level mislead.]

| Disappeared by {{LAST_YEAR}} | Peak (₱ thousands) | Likely successor |
|---|---:|---|

---

## 5. What the money actually buys in {{LAST_YEAR}}

[Top object-level line items for the latest year only. Group into themes if helpful.]

| Object class | {{LAST_YEAR}} (₱ thousands) | % of {{LAST_YEAR}} budget |
|---|---:|---:|

[2–3 sentences interpreting the buy mix: vendors, capital purchases, salaries, etc.]

---

## 6. The funding source story

[Stacked breakdown of regular GAA vs special funds vs loans, with flags for any non-routine sources.]

| Fund source | 7-year total (₱ thousands) | {{LAST_YEAR}} |
|---|---:|---:|

---

## 7. Suggested mini-site structure

[Numbered list of 5–7 concrete views the data supports, each with: the chart type, the source file, and the story it tells.]

---

## 8. Stories worth pursuing for the launch

[3–5 ranked story leads, each with a specific question a journalist could investigate.]

---

## Methodology

- Source: General Appropriations Act line-item data, {{FIRST_YEAR}}–{{LAST_YEAR}}, parsed into a 7-level hierarchy per `data/gaa/HIERARCHY_V2.md`.
- Filtered to `department = "{{DEPT_ID}}"`. {{TOTAL_ROWS}} line items.
- Aggregations are sums of the `amt` field, grouped by composite hierarchy keys.
- Year-over-year comparisons are reliable at department and agency level, suspect at FPAP level (renaming), and unreliable at object level (UACS recoding).
- A full per-row CSV extract is available at `full_extract.csv` in this directory for verification.
```

### Style notes

- **Lead with what is most surprising or most consequential**, not with a chronological summary.
- **Name the agencies and programs** explicitly — not "one bureau" but "the National Telecommunications Commission."
- **Quantify everything**. Phrases like "significant increase" without a number are filler. Use percentages and absolute amounts together.
- Use **em-dashes (—) sparingly** for emphasis, not as a default.
- **Tables before walls of prose** when the data is comparative.
- Keep it **under 2,000 words**. The point is for a designer or journalist to absorb it in one sitting.
- **No emojis. No marketing language.** ("Robust", "comprehensive", "world-class" — strike on sight.)

### Output

Write the final document to `{{DEPT_DIR}}/REPORT.md`. Do not write any other files. Do not modify the JSON files.

When you finish, post a short (≤6 bullet) summary of the most important findings in the chat, the same way you would brief an editor.
