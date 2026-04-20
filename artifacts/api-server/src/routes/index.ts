import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import engagementsRouter from "./engagements.js";
import journalEntriesRouter from "./journal-entries.js";
import entriesRouter from "./entries.js";
import dashboardRouter from "./dashboard.js";
import engagementDashboardRouter from "./engagement-dashboard.js";
import reportsRouter from "./reports.js";
import auditLogsRouter from "./audit-logs.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/engagements", engagementsRouter);
// Journal entry upload and list under engagements/:id
router.use("/engagements", journalEntriesRouter);
// Engagement-specific dashboard endpoints: /engagements/:id/dashboard, /heatmap/*, /benford, /duplicates, /risk-distribution
router.use("/engagements", engagementDashboardRouter);
// Individual entries: /entries/:entryId
router.use("/entries", entriesRouter);
// Overall dashboard: /dashboard/overview
router.use("/dashboard", dashboardRouter);
// Reports: /engagements/:id/report/pdf and /excel
router.use("/", reportsRouter);
// Audit logs
router.use("/audit-logs", auditLogsRouter);

export default router;
