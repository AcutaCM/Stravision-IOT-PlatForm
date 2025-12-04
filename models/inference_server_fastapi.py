import cv2
import numpy as np
import base64
import json
import os
import glob
import shutil
import signal
import sys
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import uvicorn

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL = "disease.onnx"
PORT = 8000

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None
current_model_name = ""
server = None

class LoadModelRequest(BaseModel):
    model_name: str

def get_available_models():
    extensions = ['*.pt', '*.onnx']
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(BASE_DIR, ext)))
    return [os.path.basename(f) for f in files]

def load_model_by_name(model_name):
    global model, current_model_name
    model_path = os.path.join(BASE_DIR, model_name)
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        return False, "Model file not found"
    
    print(f"Loading model from {model_path}...")
    try:
        # Load the model
        model = YOLO(model_path, task='detect')
        current_model_name = model_name
        print(f"Model {model_name} loaded successfully.")
        return True, "Model loaded successfully"
    except Exception as e:
        print(f"Failed to load model: {e}")
        return False, str(e)

@app.on_event("startup")
async def startup_event():
    # Try to load default or first available
    available = get_available_models()
    if DEFAULT_MODEL in available:
        load_model_by_name(DEFAULT_MODEL)
    elif available:
        load_model_by_name(available[0])
    else:
        print("No models found in directory.")

@app.get("/models")
async def list_models():
    return {
        "current_model": current_model_name,
        "available_models": get_available_models()
    }

@app.post("/models/load")
async def load_model_endpoint(request: LoadModelRequest):
    success, message = load_model_by_name(request.model_name)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "current_model": current_model_name}

@app.post("/models/upload")
async def upload_model(file: UploadFile = File(...)):
    if not (file.filename.endswith('.pt') or file.filename.endswith('.onnx')):
         raise HTTPException(status_code=400, detail="Only .pt or .onnx files are allowed")
    
    file_path = os.path.join(BASE_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"Client connected: {websocket.client}")
    
    try:
        while True:
            # Allow connection even if model is not loaded, but return error on frame
            
            try:
                # Receive message
                message = await websocket.receive_text()

                if model is None:
                    # Try to reload? Or just send error
                    await websocket.send_json({"error": "No model loaded"})
                    continue

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
                await websocket.send_json({"detections": detections})

            except Exception as e:
                print(f"Error processing frame: {e}")
                # Optional: send error back to client
                # await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Connection error: {e}")

def handle_shutdown(signum, frame):
    print(f"\nReceived signal {signum}, shutting down gracefully...")
    # Clean up resources if needed
    sys.exit(0)

if __name__ == "__main__":
    # Register signal handlers
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    config = uvicorn.Config(app, host="0.0.0.0", port=PORT, loop="asyncio")
    server = uvicorn.Server(config)
    server.run()
