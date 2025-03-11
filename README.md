# AI Smart Four-Wheel Drive Car

A comprehensive solution for an AI-powered smart car based on Raspberry Pi 5, integrating a high-precision camera, four-wheel-drive chassis, visual SLAM, voice interaction, and web remote control.

## Features

- **Web Control**: Remote control via WebSocket + Flask API, supporting virtual joysticks for car and camera gimbal operation.
- **Real-time Video Transmission**: Uses WebRTC + HUANER wide-angle camera for low-latency HD video streaming.
- **Voice Interaction**: Integrated with Whisper + Ollama + DeepSeekR1 1.5B for local voice recognition and intelligent responses.
- **Four-Motor Control**: Utilizes the LOBOROBOT function library for precise car movement control.
- **AI Autonomous Navigation**: Uses a monocular camera with ORB-SLAM 3 for real-time environment mapping and path planning.
- **Text-to-Speech (TTS)**: The car can read out DeepSeekR1's responses, supporting Chinese and English, with adjustable volume and speed.
- **Integration with ROS 2 + MPU6050**: Enables autonomous navigation and obstacle avoidance.

## Hardware Requirements

- **Computing Unit**: Raspberry Pi 5
- **Camera**: HUANER USB 160° 4K (1920×1080P MJPG resolution, supports night vision)
- **Chassis**: Four-Wheel Drive Chassis
- **Servo Gimbal**: MG996R + PCA9685
- **Speaker**: USB Speaker
- **MPU6050**: IMU Sensor

## Software Requirements

- **Operating System**: Ubuntu Server 24.04 LTS
- **Python**: 3.10 or higher
- **Ollama**: For running DeepSeekR1 1.5B locally
- **ROS 2**: For autonomous navigation (optional)
- **ORB-SLAM 3**: For visual SLAM (optional)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/ai-smart-car.git
   cd ai-smart-car
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Install Ollama and DeepSeekR1 model:
   ```
   # Install Ollama (follow instructions at https://ollama.ai)
   ollama pull deepseek-r1-1.5b
   ```

4. (Optional) Install ROS 2 and ORB-SLAM 3 following their respective documentation.

## Usage

1. Start the server:
   ```
   python smart_car.py
   ```

2. Open a web browser and navigate to:
   ```
   http://<raspberry-pi-ip>:5000
   ```

3. Use the web interface to control the car:
   - Left joystick: Controls car movement (forward, backward, left, right)
   - Right joystick: Controls camera gimbal rotation (up, down, left, right)
   - Voice button: Press and hold to give voice commands
   - Text input: Type commands for AI interaction

## Web Interface

The web interface features:
- Dual joystick layout optimized for mobile landscape mode
- Real-time video feed with HUD overlay
- Voice command button
- Text input for AI interaction
- Settings panel for language and volume control
- Autonomous mode toggle

## Voice Commands

Examples of voice commands:
- "Move forward for 3 seconds"
- "Turn left"
- "Stop"
- "Activate autonomous mode"
- Ask questions like "What do you see?" or "Navigate to the kitchen"

## Project Structure

- `smart_car.py`: Main Python script for the AI smart car
- `LOBOROBOT.py`: Robot control library for motor and servo control
- `templates/`: Contains HTML templates for the web interface
- `static/`: Contains CSS and JavaScript files for the web interface

## Customization

You can customize various aspects of the project:
- Adjust motor speeds and turning parameters in `smart_car.py`
- Modify the web interface design in the CSS files
- Add new AI capabilities by extending the DeepSeekR1 integration

## Troubleshooting

- **Camera not working**: Check if the camera is properly connected and the correct device is selected in `init_camera()`
- **Motors not responding**: Verify PCA9685 connections and power supply
- **Voice recognition issues**: Ensure microphone permissions are granted and you're using HTTPS or localhost
- **AI model not loading**: Check if Ollama is running and the DeepSeekR1 model is properly installed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- LOBOROBOT library by Hunan Chuanglobo Intelligent Technology Co., Ltd.
- OpenAI's Whisper for voice recognition
- DeepSeek AI for the DeepSeekR1 model
- ORB-SLAM 3 by UZ-SLAMLab 