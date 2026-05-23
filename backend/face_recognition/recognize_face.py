import requests
import cv2
import face_recognition
import pickle
import numpy as np
import os

ENCODINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "encodings.pkl")

# Load encodings
if not os.path.exists(ENCODINGS_FILE):
    print("No encodings found. Register faces first!")
    exit()

with open(ENCODINGS_FILE, "rb") as f:
    known_faces = pickle.load(f)

# Flatten encodings to parallel lists of ids and encodings (supports both list and single format)
known_ids = []
known_encodings = []
for emp_id, encs in known_faces.items():
    if isinstance(encs, list):
        for enc in encs:
            known_ids.append(emp_id)
            known_encodings.append(enc)
    else:
        known_ids.append(emp_id)
        known_encodings.append(encs)

if not known_encodings:
    print("No face encodings found. Register faces first!")
    exit()

TOLERANCE = 0.5

video = cv2.VideoCapture(0)

print("Starting Face Recognition... Press 'q' to quit")

while True:
    ret, frame = video.read()

    if not ret:
        break

    # Resize for faster processing (0.5 scale for higher landmark detection accuracy)
    small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    # Detect faces
    face_locations = face_recognition.face_locations(rgb_small_frame)
    face_encodings = face_recognition.face_encodings(
        rgb_small_frame,
        face_locations
    )

    for face_encoding, face_location in zip(face_encodings, face_locations):

        matches = face_recognition.compare_faces(
            known_encodings,
            face_encoding,
            tolerance=TOLERANCE
        )

        face_distances = face_recognition.face_distance(
            known_encodings,
            face_encoding
        )

        best_match_index = np.argmin(face_distances)

        name = "Unknown"
        employee_id = None

        if matches[best_match_index]:
            employee_id = known_ids[best_match_index]
            name = f"Employee {employee_id}"

            print(f"Recognized: Employee ID {employee_id}")

            # Send attendance to FastAPI
            try:
                response = requests.post(
                    "http://127.0.0.1:8000/attendance",
                    json={
                        "employee_id": int(employee_id),
                        "status": "Present"
                    }
                )

                print("Attendance API Response:", response.json())

            except Exception as e:
                print("API Error:", e)

        # Draw box
        top, right, bottom, left = face_location

        top *= 2
        right *= 2
        bottom *= 2
        left *= 2

        cv2.rectangle(
            frame,
            (left, top),
            (right, bottom),
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            name,
            (left, top - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

    cv2.imshow("Face Recognition", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

video.release()
cv2.destroyAllWindows()