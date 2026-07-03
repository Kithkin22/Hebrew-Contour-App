# Parallel pane generation — manual test checklist

Use this when verifying parallel passage generation after changes to pane state or generate handlers.

## Prerequisites

- Desktop width ≥ 1024px (side-by-side parallel view visible)
- Parallel checkbox enabled
- Hebrew WLC or BHSA source available

## Test A — left then right then left again

1. Enable **Parallel**.
2. In the **left** pane reference field, enter `Ruth 1:1-5` and press **Enter**.
3. Confirm left pane shows Ruth 1:1–5.
4. In the **right** pane reference field, enter `Job 19:21-27` and press **Enter**.
5. Confirm right pane shows Job 19:21–27 and left still shows Ruth.
6. In the **left** pane reference field, enter `Psalm 73:23-26` and press **Enter**.
7. Confirm left shows Psalm 73:23–26 and right still shows Job 19:21–27.

## Test B — right then left

1. New project or clear both panes.
2. Enable **Parallel**.
3. Generate **right** first (`Job 19:21-27`).
4. Generate **left** second (`Ruth 1:1-5`).
5. Confirm each pane keeps its own passage.

## Test C — toolbar generate targets active pane only

1. Enable **Parallel** with Ruth on the left and Job on the right.
2. Click the **right** pane header or a word in the right pane (active pane highlight).
3. Use **Generate text** for a different reference.
4. Confirm **only the right pane** changes; left Ruth is unchanged.

## Test D — parallel off/on preserves panes

1. Load different passages in left and right.
2. Uncheck **Parallel**.
3. Re-check **Parallel**.
4. Confirm both passages are still present.

## Automated check

```bash
node scripts/verify-parallel-pane-generation.mjs
```
