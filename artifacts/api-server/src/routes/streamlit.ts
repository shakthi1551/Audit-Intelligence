import { Router } from "express";
import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import {
  engagementsTable,
  fraudEvaluationHandoffsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  ExchangeFraudEvaluationHandoffBody,
  ExchangeFraudEvaluationHandoffResponse,
  GetFraudEvaluationSummaryParams,
  GetFraudEvaluationSummaryQueryParams,
  GetFraudEvaluationSummaryResponse,
} from "@workspace/api-zod";
import type { AuthenticatedRequest } from "../lib/auth.js";
import { requireFraudEvaluationAuth, signJwt } from "../lib/auth.js";
import { calculateFraudEvaluationSummary } from "../lib/fraud-evaluation.js";

const router = Router();
const evaluationSessionLifetimeSeconds = 15 * 60;

router.post("/handoff/exchange", async (req, res): Promise<void> => {
  try {
    const body = ExchangeFraudEvaluationHandoffBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const now = new Date();
    const codeHash = createHash("sha256").update(body.data.code).digest("hex");
    const [handoff] = await db.update(fraudEvaluationHandoffsTable)
      .set({ usedAt: now })
      .where(and(
        eq(fraudEvaluationHandoffsTable.codeHash, codeHash),
        isNull(fraudEvaluationHandoffsTable.usedAt),
        gt(fraudEvaluationHandoffsTable.expiresAt, now),
      ))
      .returning({
        userId: fraudEvaluationHandoffsTable.userId,
        engagementId: fraudEvaluationHandoffsTable.engagementId,
      });
    if (!handoff) {
      res.status(401).json({ error: "Handoff code is invalid, expired, or already used" });
      return;
    }

    const [engagement] = await db.select({ id: engagementsTable.id }).from(engagementsTable)
      .where(and(
        eq(engagementsTable.id, handoff.engagementId),
        eq(engagementsTable.userId, handoff.userId),
      ));
    const [user] = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
    }).from(usersTable).where(eq(usersTable.id, handoff.userId));
    if (!engagement || !user) {
      res.status(401).json({ error: "Handoff code is no longer valid" });
      return;
    }

    const expiresAt = new Date(Date.now() + evaluationSessionLifetimeSeconds * 1000);
    const accessToken = signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      scope: "fraud-evaluation",
      engagementId: handoff.engagementId,
    }, evaluationSessionLifetimeSeconds);

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.json(ExchangeFraudEvaluationHandoffResponse.parse({
      accessToken,
      engagementId: handoff.engagementId,
      expiresAt: expiresAt.toISOString(),
    }));
  } catch (err) {
    req.log.error({ err }, "Exchange fraud evaluation handoff error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/engagements/:id/fraud-evaluation",
  requireFraudEvaluationAuth,
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const params = GetFraudEvaluationSummaryParams.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
      }
      const query = GetFraudEvaluationSummaryQueryParams.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({ error: query.error.message });
        return;
      }

      const engagementId = params.data.id;
      const [engagement] = await db.select({ id: engagementsTable.id }).from(engagementsTable)
        .where(and(
          eq(engagementsTable.id, engagementId),
          eq(engagementsTable.userId, req.userId!),
        ));
      if (!engagement) {
        res.status(404).json({ error: "Engagement not found" });
        return;
      }

      const summary = await calculateFraudEvaluationSummary(engagementId, query.data.threshold);
      res.setHeader("Cache-Control", "no-store");
      res.json(GetFraudEvaluationSummaryResponse.parse(summary));
    } catch (err) {
      req.log.error({ err }, "Streamlit fraud evaluation summary error");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;