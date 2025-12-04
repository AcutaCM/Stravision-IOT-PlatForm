
from ultralytics import YOLO
import os

def convert_model(model_path):
    print(f"Converting {model_path} to ONNX...")
    try:
        # Load the model
        model = YOLO(model_path)
        
        # Export the model
        path = model.export(format='onnx')
        
        print(f"Successfully converted {model_path} to {path}")
    except Exception as e:
        print(f"Error converting {model_path}: {e}")

if __name__ == "__main__":
    # Check if files exist
    files = ["disease.pt", "mature.pt"]
    for f in files:
        if os.path.exists(f):
            convert_model(f)
        else:
            print(f"File {f} not found.")
