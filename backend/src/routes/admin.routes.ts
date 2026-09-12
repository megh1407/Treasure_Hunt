import { Router } from "express";
import {
  adminLogin,
  adminLogout,
  getAdminStats,
  getAdminLeaderboard,
  deletePlayer,
  searchPlayers,
} from "../controllers/admin.controller";
import { requireAdminAuth } from "../middleware/admin.middleware";

const router = Router();

// Public admin authentication endpoints
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

// Protected administrative operational endpoints
router.get("/stats", requireAdminAuth, getAdminStats);
router.get("/leaderboard", requireAdminAuth, getAdminLeaderboard);
router.get("/search", requireAdminAuth, searchPlayers);
router.delete("/players/:id", requireAdminAuth, deletePlayer);

export default router;
