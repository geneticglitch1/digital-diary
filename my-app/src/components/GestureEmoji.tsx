"use client";
import { useEffect, useState, useRef } from "react";

type Gesture = "happy" | "okay" | "sad" | null;

const EMOJI_MAP: Record<NonNullable<Gesture>, string> = {
    happy: "😊",
    okay: "😐",
    sad: "😢",
};

interface GestureEmojiProps {
    onGestureSelect?: (emoji: string) => void;
}

export default function GestureEmoji({ onGestureSelect }: GestureEmojiProps) {
    const [gesture, setGesture] = useState<Gesture>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [cameraAvailable, setCameraAvailable] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Check if camera stream is available
    useEffect(() => {
        fetch("http://127.0.0.1:8000/video")
            .then(() => setCameraAvailable(true))
            .catch(() => setCameraAvailable(false));
    }, []);

    // Poll for gesture
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/gesture");
                const data = await res.json();
                setGesture(data.gesture);
                setConfirmed(false);
            } catch (e) {
                // Server not running
            }
        }, 200);

        return () => clearInterval(interval);
    }, []);

    const handleSelect = () => {
        if (gesture && onGestureSelect) {
            onGestureSelect(EMOJI_MAP[gesture]);
            setConfirmed(true);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3">

            {/* Mini camera feed */}
            {cameraAvailable && (
                <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200 shadow-md w-48 h-36">
                    <img
                        src="http://127.0.0.1:8000/video"
                        alt="Camera feed"
                        className="w-full h-full object-cover"
                        onError={() => setCameraAvailable(false)}
                        style={{ imageRendering: "auto" }}
                    />
                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
                        🔴 Live
                    </div>
                </div>
            )}

            {/* Detected emoji */}
            <div style={{ fontSize: "60px" }}>
                {gesture ? EMOJI_MAP[gesture] : "🤚"}
            </div>

            <p className="text-sm text-gray-500 text-center">
                {gesture
                    ? `Detected: ${gesture} — click to confirm`
                    : "Show a thumbs up, sideways, or down"}
            </p>

            {gesture && onGestureSelect && (
                <button
                    type="button"
                    onClick={handleSelect}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                    {confirmed ? "✓ Selected!" : `Use ${EMOJI_MAP[gesture]} as my mood`}
                </button>
            )}
        </div>
    );
}