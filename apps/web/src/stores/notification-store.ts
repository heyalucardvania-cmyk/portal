import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationState {
  enabled: boolean;
  interval: number;
  setEnabled: (enabled: boolean) => void;
  setInterval: (interval: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: true,
      interval: 0,
      setEnabled: (enabled) => set({ enabled }),
      setInterval: (interval) => set({ interval }),
    }),
    {
      name: "opencode-notification",
    },
  ),
);
