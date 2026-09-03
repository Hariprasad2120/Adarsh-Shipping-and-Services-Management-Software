/**
 * Stage 2 — enterprise platform: reusable maker-checker / approval engine.
 *
 * `decision.*` — pure chain state machine + segregation-of-duties rules.
 * `policy.*`   — ApprovalPolicy configuration + effective-policy resolution.
 * `engine.*`   — openApprovalRequest / submitApprovalDecision / cancel / queries.
 */
export * from "./decision";
export * from "./policy";
export * from "./engine";
