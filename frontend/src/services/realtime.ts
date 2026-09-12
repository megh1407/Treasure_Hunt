import type { ActivityLog } from "@/game/types";
import type { RealtimeChannel } from "./types";

/**
 * Mock realtime channel. Swap the implementation for a Socket.IO client
 * (io(import.meta.env.VITE_SOCKET_URL)) without changing any consumer.
 */
class LocalRealtimeChannel implements RealtimeChannel {
  private handlers = new Set<(log: ActivityLog) => void>();
  private buffer: ActivityLog[] = [];

  subscribe(handler: (log: ActivityLog) => void) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  emit(log: Omit<ActivityLog, "id" | "createdAt">) {
    const full: ActivityLog = {
      ...log,
      id: `act_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: Date.now(),
    };
    this.buffer = [full, ...this.buffer].slice(0, 200);
    this.handlers.forEach((h) => h(full));
  }

  history(): ActivityLog[] {
    return this.buffer;
  }
}

export const realtime = new LocalRealtimeChannel();
