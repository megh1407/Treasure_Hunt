import { Router } from "express";
import {
  investigateObject,
  requestHint,
  runScanner,
  submitAnswer,
} from "../controllers/game.controller";
import { requireDatabase } from "../middleware/dbCheck";

const router = Router();

// Ensure DB is active for all game operations; returns 503 if disconnected
router.use(requireDatabase);

// POST /api/game/investigate
router.post("/investigate", investigateObject);

// POST /api/game/submit-answer
router.post("/submit-answer", submitAnswer);

// POST /api/game/hint
router.post("/hint", requestHint);

// POST /api/game/scan
router.post("/scan", runScanner);

export default router;
