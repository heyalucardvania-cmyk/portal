import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/stores/notification-store";
import { useSessionStatuses } from "@/hooks/use-opencode";
import type { SessionStatus } from "@opencode-ai/sdk/v2";

export function useNotificationSound() {
  const enabled = useNotificationStore((s) => s.enabled);
  const interval = useNotificationStore((s) => s.interval);
  const soundName = useNotificationStore((s) => s.soundName);
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const soundNameRef = useRef(soundName);
  soundNameRef.current = soundName;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const prevRef = useRef<Record<string, SessionStatus>>({});

  const { data: statuses } = useSessionStatuses();

  useEffect(() => {
    if (!enabled) return;

    const prev = prevRef.current;
    const current = statuses ?? {};
    prevRef.current = current;

    const allIds = new Set([...Object.keys(prev), ...Object.keys(current)]);
    for (const id of allIds) {
      const wasBusy = prev[id]?.type === "busy" || prev[id]?.type === "retry";
      const isNowIdle = !current[id] || current[id]?.type === "idle";
      const wasIdle = !prev[id] || prev[id]?.type === "idle";
      const isNowBusy = current[id]?.type === "busy" || current[id]?.type === "retry";

      if (wasIdle && isNowBusy) {
        if (loopTimerRef.current !== null) {
          clearInterval(loopTimerRef.current);
          loopTimerRef.current = null;
        }
      }

      if (wasBusy && isNowIdle) {
        const url = `/sound/${soundNameRef.current}.mp3`;
        if (!audioRef.current || audioRef.current.dataset.sound !== url) {
          const audio = new Audio(url);
          audio.dataset.sound = url;
          audioRef.current = audio;
        }
        const audio = audioRef.current;
        audio.currentTime = 0;
        audio.loop = false;
        audio.play().catch(() => {});

        if (intervalRef.current > 0) {
          if (loopTimerRef.current !== null) {
            clearInterval(loopTimerRef.current);
          }
          loopTimerRef.current = window.setInterval(() => {
            const a = audioRef.current;
            if (a) {
              a.currentTime = 0;
              a.play().catch(() => {});
            }
          }, intervalRef.current * 1000);
        }

        break;
      }
    }
  }, [enabled, statuses]);

  useEffect(() => {
    return () => {
      if (loopTimerRef.current !== null) {
        clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
}
