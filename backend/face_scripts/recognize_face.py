import requests
import cv2
import face_recognition
import numpy as np
import os
import sys
import time

# Add backend directory to sys path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import FaceEncoding

db = SessionLocal()

print("Loading encodings from Database...")
db_encodings = db.query(FaceEncoding).all()

if not db_encodings:
    print("No face encodings found in database. Register faces first!")
    db.close()
    exit()

known_ids = [enc.employee_id for enc in db_encodings]
known_encodings = [np.array(enc.encoding) for enc in db_encodings]

print(f"Loaded {len(known_ids)} face encodings.")

TOLERANCE = 0.48  # Strict threshold

video = cv2.VideoCapture(0)
print("Starting Face Recognition... Press 'q' to quit")

frame_count = 0
recent_matches = {}
MATCH_THRESHOLD = 3
last_match_reset = time.time()

while True:
    ret, frame = video.read()
    if not ret:
        break

    frame_count += 1
    if frame_count % 2 != 0:
        cv2.imshow("Face Recognition", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        continue

    if time.time() - last_match_reset > 3.0:
        recent_matches = {}
        last_match_reset = time.time()

    small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_small_frame)
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

    for face_encoding, face_location in zip(face_encodings, face_locations):
        face_distances = face_recognition.face_distance(known_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        distance = face_distances[best_match_index]

        name = "Unknown"
        confidence_str = ""
        color = (0, 0, 255)

        if distance <= TOLERANCE:
            employee_id = known_ids[best_match_index]
            confidence = (1 - distance) * 100
            
            recent_matches[employee_id] = recent_matches.get(employee_id, 0) + 1
            
            if recent_matches[employee_id] >= MATCH_THRESHOLD:
                name = f"ID: {employee_id}"
                confidence_str = f"{confidence:.1f}%"
                color = (0, 255, 0)
                
                try:
                    recent_matches[employee_id] = 0
                    response = requests.post(
                        "http://127.0.0.1:8000/attendance",
                        json={
                            "employee_id": int(employee_id),
                            "status": "Present",
                            "confidence": float(1 - distance)
                        }
                    )
                    print("Attendance API Response:", response.json())
                except Exception as e:
                    print("API Error:", e)
            else:
                name = f"Verifying {employee_id}..."
                color = (0, 255, 255)
        else:
            confidence = (1 - distance) * 100
            name = f"Unknown ({confidence:.1f}%)"

        top, right, bottom, left = face_location
        top *= 2
        right *= 2
        bottom *= 2
        left *= 2

        cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
        cv2.putText(frame, name, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        if confidence_str:
            cv2.putText(frame, confidence_str, (left, bottom + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    cv2.imshow("Face Recognition", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

video.release()
cv2.destroyAllWindows()
db.close()