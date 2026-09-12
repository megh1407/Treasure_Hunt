import { Router } from "express";
import healthRoutes from "./health.routes";
import playerRoutes from "./player.routes";
import sessionRoutes from "./session.routes";
import gameRoutes from "./game.routes";
import leaderboardRoutes from "./leaderboard.routes";
import adminRoutes from "./admin.routes";

const router = Router();

// Mount modules
router.use("/health", healthRoutes);
router.use("/players", playerRoutes);
router.use("/sessions", sessionRoutes);
router.use("/game", gameRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/admin", adminRoutes);

export default router;
