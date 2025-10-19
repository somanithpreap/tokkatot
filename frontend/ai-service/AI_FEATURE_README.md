# 🔬 AI Disease Detection Feature

This feature adds AI-powered chicken disease identification through feces analysis to your Tokkatot Smart Poultry System using a pre-trained EfficientNetB0 model.

## 🎯 Overview

Farmers can use their mobile phones to:
- Take photos of chicken droppings
- Get instant AI-powered disease predictions
- Receive treatment recommendations
- Access educational disease information

## 🏗️ Architecture

```
Mobile Browser → Go Web Server → Python AI Service → TensorFlow 2.15.0 → EfficientNetB0 Model
```

## 📋 Setup Instructions

### Prerequisites
- Python 3.9.13 (required for TensorFlow 2.15.0 compatibility)
- Go 1.19+ 
- trained model files:
  - `chicken_disease_model_efficientnetb0_final.h5`
  - `label_encoder.pkl`

**Start services manually:**

Terminal 1 - AI Service:
```bash
cd ai-service
source venv-real-model/bin/activate  # Linux/Mac
# OR
venv-real-model\Scripts\activate     # Windows
python app.py
```

Terminal 2 - Main Server:
```bash
cd middleware
go build -o tokkatot.exe .
./tokkatot.exe
```

## 📱 Usage

1. **Access the feature:** Visit `http://10.0.0.1:4000/disease-detection`
2. **Take/upload photo:** Use camera or upload existing image
3. **Get prediction:** AI analyzes the image using the loaded model
4. **Follow recommendations:** Get treatment and prevention advice

## 🔧 API Endpoints

- `GET /api/ai/health` - Check AI service status
- `POST /api/ai/predict-disease` - Upload image for disease prediction
- `GET /api/ai/disease-info` - Get disease information and treatment

## 🎛️ Technical Specifications

### Model Details
- **Architecture:** EfficientNetB0
- **Framework:** TensorFlow 2.15.0
- **Input Size:** 224x224x3
- **Classes:** 4 disease categories
- **Python Version:** 3.9.13 (required for compatibility)

### Supported Disease Classes
This pre-trained model detects:
- **Coccidiosis** - Parasitic infection affecting intestines
- **Healthy** - Normal, healthy droppings
- **New Castle Disease** - Viral respiratory and nervous system disease  
- **Salmonella** - Bacterial infection

### Performance Specifications
- **Prediction Time:** ~2-5 seconds on CPU
- **Memory Usage:** ~400-600MB (TensorFlow + model)
- **Input Processing:** Automatic resize to 224x224, normalization

## 🎛️ Raspberry Pi Optimization

### Resource Management
- **CPU Usage:** ~15-25% during inference
- **Memory:** ~400-600MB for TensorFlow + EfficientNetB0
- **Storage:** ~100-150MB for model files

### Performance Tips
1. **Use TensorFlow Lite:** Convert the model for better Pi performance:
```python
import tensorflow as tf
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
```

2. **Optimize image preprocessing:** Resize images before sending to reduce processing time

3. **Enable GPU acceleration:** If using Pi 4 with GPU support:
```python
# Add to app.py
import tensorflow as tf
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    tf.config.experimental.set_memory_growth(gpus[0], True)
```

### Memory Optimization
Update `ai-service/app.py` for Pi deployment:

```python
# Add after model loading
import gc
import tensorflow as tf

# Clear unused memory
gc.collect()
tf.keras.backend.clear_session()

# Limit memory growth
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    tf.config.experimental.set_memory_growth(gpus[0], True)
```

## 🔒 Security Considerations

- File upload validation (size, type)
- User authentication required
- Rate limiting recommended for production
- Secure model file storage

## 🛠️ Troubleshooting

### Common Issues

**AI Service not starting:**
- Ensure Python 3.9.13 is installed (`python --version`)
- Check virtual environment: `venv-real-model/` exists
- Verify all dependencies installed: `pip list | grep tensorflow`
- Ensure model files exist in `ai-service/model/`

**Model loading errors:**
- Verify TensorFlow 2.15.0 installation: `pip show tensorflow`
- Check NumPy version 1.26.4: `pip show numpy`
- Ensure model file paths are correct in `app.py`

**Low accuracy predictions:**
- Verify image quality (good lighting, clear focus)
- Check image preprocessing matches training pipeline
- Ensure correct model file (`chicken_disease_model_efficientnetb0_final.h5`)
- Validate label encoder classes match training data

**High memory usage:**
- Use TensorFlow Lite for production
- Clear TensorFlow session after predictions
- Monitor memory with: `ps aux | grep python`

**Slow predictions:**
- Optimize image preprocessing (resize before upload)
- Use smaller input image size if possible
- Consider model quantization for deployment

### Health Checks

Monitor service health:
```bash
# Check AI service
curl http://127.0.0.1:5000/health

# Check web server
curl http://127.0.0.1:4000/api/ai/health

# Test prediction endpoint
curl -X POST -F "image=@test_image.jpg" http://127.0.0.1:5000/predict
```

### Debug Mode

Enable debug logging in `app.py`:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
app.run(host='127.0.0.1', port=5000, debug=True)
```

## 🔄 Model Updates

To update the AI model:
1. Replace files in `ai-service/model/`:
   - `chicken_disease_model_efficientnetb0_final.h5`
   - `label_encoder.pkl`
2. Restart the AI service: `python app.py`
3. No changes needed to Go server

### Model Versioning
Consider versioning the models:
```
ai-service/model/
├── v1.0/
│   ├── chicken_disease_model_efficientnetb0_final.h5
│   └── label_encoder.pkl
├── v1.1/
│   ├── chicken_disease_model_efficientnetb0_final.h5
│   └── label_encoder.pkl
└── current/ (symlink to latest version)
```

## 📈 Monitoring & Analytics

### System Metrics
- Prediction response time
- Model confidence scores
- Error rates and types
- Resource usage (CPU, memory)