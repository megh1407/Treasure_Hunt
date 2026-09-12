import { Router } from "express";
import { getLeaderboard, getTop5Players } from "../controllers/leaderboard.controller";
import { requireDatabase } from "../middleware/dbCheck";

const router = Router();

// Ensure DB is active; returns 503 if disconnected
router.use(requireDatabase);

// GET /api/leaderboard/top5 (safe player-facing endpoint)
router.get("/top5", getTop5Players);

// GET /api/leaderboard
router.get("/", getLeaderboard);

export default router;
