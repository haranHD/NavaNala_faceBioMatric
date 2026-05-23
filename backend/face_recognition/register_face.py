import cv2
import face_recognition
import pickle
import os

ENCODINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "encodings.pkl")

# Load existing encodings
if os.path.exists(ENCODINGS_FILE):
    with open(ENCODINGS_FILE, "rb") as f:
        known_faces = pickle.load(f)
    # Ensure all existing entries are loaded as lists of encodings
    for key in list(known_faces.keys()):
        if not isinstance(known_faces[key], list):
            known_faces[key] = [known_faces[key]]
else:
    known_faces = {}

employee_id = input("Enter Employee ID: ").strip()
if not employee_id:
    print("Employee ID cannot be empty.")
    exit()

video = cv2.VideoCapture(0)

print("Press 's' to capture face")
print("Press 'q' to quit")

while True:
    ret, frame = video.read()

    if not ret:
        break

    # Create HUD on a copy of the frame
    display_frame = frame.copy()
    num_captured = len(known_faces.get(employee_id, []))
    hud_text = f"Emp ID: {employee_id} | Captured: {num_captured}"
    cv2.putText(
        display_frame,
        hud_text,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )
    cv2.putText(
        display_frame,
        "Press 's' to Capture | 'q' to Finish",
        (20, display_frame.shape[0] - 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (0, 255, 255),
        2
    )

    cv2.imshow("Register Face", display_frame)

    key = cv2.waitKey(1)

    # SAVE FACE
    if key == ord('s'):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb)

        if len(face_locations) > 0:
            # Use 10 jitters for highly accurate encodings
            encodings = face_recognition.face_encodings(
                rgb,
                face_locations,
                num_jitters=10
            )

            if len(encodings) > 0:
                if employee_id not in known_faces:
                    known_faces[employee_id] = []
                
                known_faces[employee_id].append(encodings[0])

                with open(ENCODINGS_FILE, "wb") as f:
                    pickle.dump(known_faces, f)

                total_saved = len(known_faces[employee_id])
                print(f"Face saved successfully! Total captured for ID {employee_id}: {total_saved}")
            else:
                print("Could not encode face. Try again.")
        else:
            print("No face detected!")

    # QUIT
    if key == ord('q'):
        break

video.release()
cv2.destroyAllWindows()