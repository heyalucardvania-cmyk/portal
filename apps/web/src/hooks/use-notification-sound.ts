import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/stores/notification-store";
import { backendBasePath, type BackendProvider } from "@/lib/backend-url";

export function useNotificationSound(
  port: number | null | undefined,
  provider?: BackendProvider,
) {
  const enabled = useNotificationStore((s) => s.enabled);
  const interval = useNotificationStore((s) => s.interval);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!port || !enabled) return;

    const basePath = backendBasePath(provider, port);
    const source = new EventSource(`${basePath}/events`);

    const playSound = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sound/notif.mp3");
      }

      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.loop = false;
      audio.play().catch(() => {});

      if (interval > 0) {
        if (loopTimerRef.current !== null) {
          clearInterval(loopTimerRef.current);
        }
        loopTimerRef.current = window.setInterval(() => {
          const a = audioRef.current;
          if (a) {
            a.currentTime = 0;
            a.play().catch(() => {});
          }
        }, interval * 1000);
      }
    };

    const stopLoop = () => {
      if (loopTimerRef.current !== null) {
        clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };

    source.onmessage = (message) => {
      let event;
      try {
        event = JSON.parse(message.data);
      } catch {
        return;
      }

      if (!event || !event.type) return;

      if (event.type === "session.next.step.ended") {
        stopLoop();
        playSound();
      }

      if (
        event.type === "session.next.step.started" ||
        event.type === "session.next.prompted"
      ) {
        stopLoop();
      }
    };

    return () => {
      source.close();
      stopLoop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [port, provider, enabled, interval]);
}
