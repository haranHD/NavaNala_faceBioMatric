import cv2
import face_recognition
import os
import sys
import numpy as np

# Add backend directory to sys path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import FaceEncoding, Employee

db = SessionLocal()

employee_id = input("Enter Employee ID: ").strip()
if not employee_id:
    print("Employee ID cannot be empty.")
    exit()

# Verify Employee exists
emp = db.query(Employee).filter(Employee.employee_id == int(employee_id)).first()
if not emp:
    print("Employee ID not found in database. Create the employee first.")
    exit()

video = cv2.VideoCapture(0)

print("Press 's' to capture face")
print("Press 'q' to quit")

REQUIRED_CAPTURES = 5
captured_encodings = []

while True:
    ret, frame = video.read()
    if not ret:
        break

    display_frame = frame.copy()
    num_captured = len(captured_encodings)
    hud_text = f"Emp ID: {employee_id} | Captured: {num_captured}/{REQUIRED_CAPTURES}"
    
    cv2.putText(display_frame, hud_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    cv2.putText(display_frame, "Press 's' to Capture | 'q' to Finish", (20, display_frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    cv2.imshow("Register Face", display_frame)

    key = cv2.waitKey(1)

    if key == ord('s'):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb)

        if len(face_locations) > 0:
            encodings = face_recognition.face_encodings(rgb, face_locations, num_jitters=10)
            if len(encodings) > 0:
                captured_encodings.append(encodings[0])
                print(f"Face saved successfully! Total captured: {len(captured_encodings)}")
                
                if len(captured_encodings) >= REQUIRED_CAPTURES:
                    print("Requirement met. Calculating average encoding...")
                    averaged_encoding = np.mean(captured_encodings, axis=0)
                    
                    new_enc = FaceEncoding(
                        employee_id=emp.employee_id,
                        encoding=averaged_encoding.tolist()
                    )
                    db.add(new_enc)
                    db.commit()
                        
                    print("Registration complete! Saved to database.")
                    break
            else:
                print("Could not encode face. Try again.")
        else:
            print("No face detected!")

    if key == ord('q'):
        print("Registration aborted.")
        break

video.release()
cv2.destroyAllWindows()
db.close()