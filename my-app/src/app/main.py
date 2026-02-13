import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

MODEL_PATH = "hand_landmarker.task"

HAND_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,4),
    (0,5),(5,6),(6,7),(7,8),
    (5,9),(9,10),(10,11),(11,12),
    (9,13),(13,14),(14,15),(15,16),
    (13,17),(17,18),(18,19),(19,20),(0,17)
]

def draw_landmarks(frame, detection_result):
    h, w = frame.shape[:2]
    for hand_landmarks in detection_result.hand_landmarks:
        for start, end in HAND_CONNECTIONS:
            x0 = int(hand_landmarks[start].x * w)
            y0 = int(hand_landmarks[start].y * h)
            x1 = int(hand_landmarks[end].x * w)
            y1 = int(hand_landmarks[end].y * h)
            cv2.line(frame, (x0, y0), (x1, y1), (0, 255, 0), 2)
        for lm in hand_landmarks:
            cx, cy = int(lm.x * w), int(lm.y * h)
            cv2.circle(frame, (cx, cy), 5, (255, 0, 0), -1)

def is_thumb_only(hand_landmarks):
    """Check that all fingers except thumb are curled down."""
    # Finger tip and pip (middle knuckle) indices
    fingers = [
        (8, 6),   # index
        (12, 10), # middle
        (16, 14), # ring
        (20, 18), # pinky
    ]
    for tip, pip in fingers:
        if hand_landmarks[tip].y < hand_landmarks[pip].y:
            return False  # finger is extended
    return True

def get_thumb_gesture(hand_landmarks):
    """Returns 'happy', 'okay', or 'sad' based on thumb direction."""
    if not is_thumb_only(hand_landmarks):
        return None

    thumb_tip = hand_landmarks[4]
    thumb_base = hand_landmarks[2]

    dx = thumb_tip.x - thumb_base.x
    dy = thumb_tip.y - thumb_base.y

    angle = np.degrees(np.arctan2(-dy, dx))  # -dy because y is flipped in image coords

    if angle > 45:       # pointing up
        return "happy"
    elif angle < -45:    # pointing down
        return "sad"
    else:                # pointing sideways
        return "okay"

def draw_emoji(frame, emoji_text):
    """Draw an emoji on the frame using PIL."""
    pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)

    # Try to load a font that supports emoji, fall back to default
    try:
        font = ImageFont.truetype("seguiemj.ttf", 120)  # Windows emoji font
    except:
        font = ImageFont.load_default()

    draw.text((30, 30), emoji_text, font=font, embedded_color=True)
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

def run_hand_tracking_on_webcam():
    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cam = cv2.VideoCapture(0)
    with vision.HandLandmarker.create_from_options(options) as landmarker:
        while cam.isOpened():
            success, frame = cam.read()
            if not success:
                print("Empty frame! Skipping.")
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            results = landmarker.detect(mp_image)

            gesture = None
            if results.hand_landmarks:
                draw_landmarks(frame, results)
                for hand_landmarks in results.hand_landmarks:
                    detected = get_thumb_gesture(hand_landmarks)
                    if detected:
                        gesture = detected
                        break

            # Pick emoji based on gesture
            if gesture == "happy":
                emoji = "😊"
            elif gesture == "sad":
                emoji = "😢"
            elif gesture == "okay":
                emoji = "😐"
            else:
                emoji = None

            if emoji:
                frame = draw_emoji(frame, emoji)

            cv2.imshow("Hand Tracking", cv2.flip(frame, 1))
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cam.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_hand_tracking_on_webcam()