import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationState {
  enabled: boolean;
  interval: number;
  soundName: string;
  setEnabled: (enabled: boolean) => void;
  setInterval: (interval: number) => void;
  setSoundName: (name: string) => void;
}

export const soundOptions = Array.from({ length: 10 }, (_, i) => ({
  id: `sound-${i + 1}`,
  title: `Sound ${i + 1}`,
}));

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: true,
      interval: 0,
      soundName: "sound-1",
      setEnabled: (enabled) => set({ enabled }),
      setInterval: (interval) => set({ interval }),
      setSoundName: (name) => set({ soundName: name }),
    }),
    {
      name: "opencode-notification",
    },
  ),
);
