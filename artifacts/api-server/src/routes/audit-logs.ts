import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string ?? "1", 10);
    const pageSize = 50;
    const engagementId = req.query.engagementId ? parseInt(req.query.engagementId as string, 10) : undefined;

    const logs = await db.select().from(auditLogsTable)
      .where(engagementId ? eq(auditLogsTable.engagementId, engagementId) : sql`1=1`)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "List audit logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
