import asyncio
import websockets
import cv2
import numpy as np
import base64
import json
import os
from ultralytics import YOLO

# Configuration
MODEL_PATH = r"d:\work\Stravision-IOT-PlatForm-main\models\disease.onnx"
PORT = 8765

# Global model variable
model = None

def load_model():
    global model
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model file not found at {MODEL_PATH}")
        return False
    
    print(f"Loading model from {MODEL_PATH}...")
    try:
        # Load the model
        model = YOLO(MODEL_PATH, task='detect')
        print("Model loaded successfully.")
        return True
    except Exception as e:
        print(f"Failed to load model: {e}")
        return False

async def handler(websocket):
    print(f"Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            if model is None:
                await websocket.send(json.dumps({"error": "Model not loaded"}))
                continue

            try:
                # Expecting base64 encoded image data (data:image/jpeg;base64,...)
                # Remove header if present
                if "," in message:
                    header, encoded = message.split(",", 1)
                else:
                    encoded = message

                # Decode base64 to bytes
                image_data = base64.b64decode(encoded)
                
                # Convert to numpy array
                nparr = np.frombuffer(image_data, np.uint8)
                
                # Decode image
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    continue

                # Run inference
                # conf=0.25 is default confidence threshold
                results = model.predict(frame, conf=0.25, verbose=False)
                
                # Process results
                detections = []
                for result in results:
                    boxes = result.boxes
                    for box in boxes:
                        # Get box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        cls = int(box.cls[0])
                        label = result.names[cls]
                        
                        detections.append({
                            "box": [x1, y1, x2, y2],
                            "conf": conf,
                            "class": cls,
                            "label": label
                        })

                # Send back results
                response = {
                    "detections": detections
                }
                await websocket.send(json.dumps(response))

            except Exception as e:
                print(f"Error processing frame: {e}")
                await websocket.send(json.dumps({"error": str(e)}))
                
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        pass

async def main():
    if not load_model():
        return

    print(f"Starting WebSocket server on port {PORT}...")
    async with websockets.serve(handler, "0.0.0.0", PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped.")
