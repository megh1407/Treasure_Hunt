import { Router } from "express";
import {
  createPlayer,
  getPlayerById,
  listPlayers,
} from "../controllers/player.controller";
import { requireDatabase } from "../middleware/dbCheck";

const router = Router();

// Ensure DB is active for all player operations; returns 503 if disconnected
router.use(requireDatabase);

// GET /api/players
router.get("/", listPlayers);

// POST /api/players
router.post("/", createPlayer);

// GET /api/players/:id
router.get("/:id", getPlayerById);

export default router;
