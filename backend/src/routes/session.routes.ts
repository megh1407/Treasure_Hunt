import { Router } from "express";
import {
  startSession,
  completeSession,
  pauseSession,
  resumeSession,
} from "../controllers/session.controller";
import { requireDatabase } from "../middleware/dbCheck";

const router = Router();

// Ensure DB is active for all session operations; returns 503 if disconnected
router.use(requireDatabase);

// POST /api/sessions/start
router.post("/start", startSession);

// POST /api/sessions/pause
router.post("/pause", pauseSession);

// POST /api/sessions/resume
router.post("/resume", resumeSession);

// POST /api/sessions/complete
router.post("/complete", completeSession);

export default router;
