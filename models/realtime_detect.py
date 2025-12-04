
import cv2
from ultralytics import YOLO
import os

def main():
    # Define the model path
    model_path = r"d:\work\Stravision-IOT-PlatForm-main\models\disease.onnx"
    
    # Check if model exists
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        return

    print(f"Loading model from {model_path}...")
    try:
        # Load the ONNX model using Ultralytics YOLO
        # Ultralytics supports loading .onnx files directly for inference
        model = YOLO(model_path, task='detect') 
    except Exception as e:
        print(f"Failed to load model: {e}")
        return

    # Initialize video capture (0 is usually the default webcam)
    print("Opening webcam...")
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("Starting real-time detection. Press 'q' to quit.")

    try:
        while True:
            # Read a frame from the webcam
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to grab frame.")
                break

            # Run inference on the frame
            # stream=True returns a generator, which is more memory efficient for video streams
            results = model.predict(frame, conf=0.25, stream=True) 

            # Process results
            for result in results:
                # Visualize the results on the frame
                # plot() returns the image with bounding boxes and labels drawn
                annotated_frame = result.plot()
                
                # Display the resulting frame
                cv2.imshow('Real-time Disease Detection', annotated_frame)

            # Exit loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    except KeyboardInterrupt:
        print("Interrupted by user.")
    except Exception as e:
        print(f"An error occurred during execution: {e}")
    finally:
        # Release resources
        cap.release()
        cv2.destroyAllWindows()
        print("Resources released. Exiting.")

if __name__ == "__main__":
    main()
