---
name: Fraud evaluation metrics
description: Product rules for measuring AuditIQ fraud predictions against auditor-reviewed outcomes.
---

Keep reviewer-confirmed outcomes separate from risk predictions. Treat `CONFIRMED_FRAUD` as the positive class and `LEGITIMATE` as the negative class; exclude inconclusive and unreviewed entries. Derive predicted classes from the unmodified numeric risk score, not the displayed risk level, because the displayed level can be manually overridden. Report excluded labels and unscored rows so the evaluation sample is interpretable.

**Why:** Using an auditor override as a prediction would leak the review decision into the metric and falsely improve or degrade model performance.

**How to apply:** Any additional evaluation metric, threshold, or report should use the recorded outcome as ground truth and the prediction state before reviewer overrides.