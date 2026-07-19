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
import driveRouter from "./drive.js";
import webhooksRouter from "./webhooks.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/engagements", engagementsRouter);
// Journal entry upload and list under engagements/:id
router.use("/engagements", journalEntriesRouter);
// Google Drive import: /engagements/:id/import-drive
router.use("/engagements", driveRouter);
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
// Google Drive file listing
router.use("/drive", driveRouter);
// Webhook automation endpoints (for MAKE and similar tools)
router.use("/webhooks", webhooksRouter);

export default router;
