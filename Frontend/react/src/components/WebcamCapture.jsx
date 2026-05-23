import Webcam from "react-webcam";
import { useRef } from "react";

function WebcamCapture({ setImage }) {

    const webcamRef = useRef(null);

    const capture = () => {

        const imageSrc =
            webcamRef.current.getScreenshot();

        setImage(imageSrc);
    };

    return (

        <div className="
    relative
    bg-gray-100
    p-5
    rounded-2xl
    shadow-md
    border
    ">

            {/* WEBCAM */}

            <Webcam
                ref={webcamRef}
                audio={false}
                height={350}
                width={500}
                screenshotFormat="image/jpeg"
                className="rounded-2xl"
            />

            {/* FACE OVERLAY */}

            <div className="
      absolute
      top-1/2
      left-1/2
      -translate-x-1/2
      -translate-y-1/2
      w-56
      h-56
      border-4
      border-blue-500
      rounded-full
      pointer-events-none
      "></div>

            {/* TEXT */}

            <p className="
      text-center
      text-gray-500
      mt-4
      font-medium
      ">
                Align your face inside the circle
            </p>

            {/* BUTTON */}

            <button
                onClick={capture}
                className="
        w-full
        mt-5
        bg-blue-600
        hover:bg-blue-700
        text-white
        py-3
        rounded-xl
        transition
        duration-300
        "
            >
                Capture Face
            </button>

        </div>

    );
}

export default WebcamCapture;