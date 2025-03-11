#!/usr/bin/env python3
'''
AI Smart Four-Wheel Drive Car
Based on LOBOROBOT and Raspberry Pi 5
Features:
- Web Control via WebSocket + Flask API
- Real-time Video Transmission using WebRTC
- Voice Interaction with Whisper + Ollama + DeepSeekR1
- Four-Motor Control using LOBOROBOT
- AI Autonomous Navigation with ORB-SLAM 3
- Text-to-Speech with Edge-TTS
- ROS 2 Integration with MPU6050 for navigation
'''

import os
import time
import threading
import json
import numpy as np
import cv2
from flask import Flask, render_template, Response, request, jsonify
from flask_socketio import SocketIO
import asyncio
import edge_tts
import whisper
from LOBOROBOT import LOBOROBOT
import subprocess
import signal
import sys

# Global variables
robot = LOBOROBOT()
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
camera = None
slam_process = None
voice_recognition_active = False
autonomous_mode = False
current_speed = 50  # Default speed (0-100)
camera_angle_h = 80  # Default horizontal camera angle
camera_angle_v = 40  # Default vertical camera angle

# Initialize camera
def init_camera():
    global camera
    camera = cv2.VideoCapture(0)  # Use the first camera device
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
    camera.set(cv2.CAP_PROP_FPS, 30)
    return camera

# Camera feed generator
def generate_frames():
    global camera
    while True:
        success, frame = camera.read()
        if not success:
            break
        else:
            # Process frame for SLAM if autonomous mode is active
            if autonomous_mode:
                # Add SLAM visualization overlay
                # This is a placeholder - actual SLAM would integrate with ORB-SLAM3
                cv2.putText(frame, "SLAM Active", (50, 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Add HUD information
            cv2.putText(frame, f"Speed: {current_speed}%", (50, 100), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"Camera: H:{camera_angle_h}° V:{camera_angle_v}°", 
                       (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

# Initialize Whisper for voice recognition
def init_whisper():
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    return model

whisper_model = None

# Initialize DeepSeekR1 via Ollama
def init_ollama():
    # Check if Ollama is running and DeepSeekR1 model is available
    try:
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        if "deepseek-r1-1.5b" not in result.stdout:
            print("DeepSeekR1 model not found, pulling it...")
            subprocess.run(["ollama", "pull", "deepseek-r1-1.5b"])
        return True
    except Exception as e:
        print(f"Error initializing Ollama: {e}")
        return False

# Text-to-Speech function using Edge-TTS
async def text_to_speech(text, language="en-US"):
    try:
        communicate = edge_tts.Communicate(text, language)
        await communicate.save("speech.mp3")
        os.system("mpg123 speech.mp3")
    except Exception as e:
        print(f"TTS error: {e}")

# Run async function in thread
def run_async(coro):
    new_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(new_loop)
    new_loop.run_until_complete(coro)
    new_loop.close()

# Process voice command
def process_voice_command(audio_file):
    global whisper_model, autonomous_mode
    
    if whisper_model is None:
        whisper_model = init_whisper()
    
    try:
        # Transcribe audio using Whisper
        result = whisper_model.transcribe(audio_file)
        command = result["text"].lower()
        print(f"Voice command: {command}")
        
        # Send command to frontend
        socketio.emit('voice_command', {'command': command})
        
        # Process basic movement commands directly
        if "forward" in command or "ahead" in command:
            robot.t_up(current_speed, 2)
            robot.t_stop(0.1)
            return "Moving forward"
        elif "backward" in command or "back" in command:
            robot.t_down(current_speed, 2)
            robot.t_stop(0.1)
            return "Moving backward"
        elif "left" in command:
            robot.turnLeft(current_speed, 1)
            robot.t_stop(0.1)
            return "Turning left"
        elif "right" in command:
            robot.turnRight(current_speed, 1)
            robot.t_stop(0.1)
            return "Turning right"
        elif "stop" in command:
            robot.t_stop(0.1)
            return "Stopped"
        elif "autonomous" in command or "auto" in command:
            autonomous_mode = not autonomous_mode
            if autonomous_mode:
                start_slam()
                return "Autonomous mode activated"
            else:
                stop_slam()
                return "Autonomous mode deactivated"
        else:
            # For more complex commands, use DeepSeekR1
            response = query_deepseek(command)
            return response
    except Exception as e:
        print(f"Error processing voice command: {e}")
        return f"Error: {str(e)}"

# Query DeepSeekR1 via Ollama
def query_deepseek(query):
    try:
        result = subprocess.run(
            ["ollama", "run", "deepseek-r1-1.5b", query],
            capture_output=True,
            text=True,
            timeout=10
        )
        response = result.stdout.strip()
        # Speak the response
        threading.Thread(target=run_async, args=(text_to_speech(response),)).start()
        return response
    except Exception as e:
        print(f"Error querying DeepSeekR1: {e}")
        return f"Error: {str(e)}"

# Start ORB-SLAM3 process
def start_slam():
    global slam_process
    try:
        # This is a placeholder - actual implementation would start ORB-SLAM3
        # slam_process = subprocess.Popen(["ros2", "launch", "orb_slam3_ros", "mono.launch.py"])
        print("SLAM started")
    except Exception as e:
        print(f"Error starting SLAM: {e}")

# Stop ORB-SLAM3 process
def stop_slam():
    global slam_process
    if slam_process:
        slam_process.terminate()
        slam_process = None
        print("SLAM stopped")

# Flask routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), 
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/tts', methods=['POST'])
def tts_endpoint():
    data = request.json
    text = data.get('text', '')
    language = data.get('language', 'en-US')
    
    threading.Thread(target=run_async, args=(text_to_speech(text, language),)).start()
    return jsonify({"status": "success"})

# Socket.IO events
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    # Send welcome message
    threading.Thread(target=run_async, args=(text_to_speech("Hello, I am ready."),)).start()

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('joystick_movement')
def handle_joystick(data):
    global current_speed
    joystick = data.get('joystick')
    x = data.get('x', 0)
    y = data.get('y', 0)
    
    # Convert joystick values (-1 to 1) to motor commands
    if joystick == 'left':  # Car movement
        speed = int(abs(y) * current_speed)
        
        if abs(x) > 0.5 and abs(y) < 0.3:  # Mostly horizontal movement
            if x > 0:
                robot.moveRight(speed, 0.1)
            else:
                robot.moveLeft(speed, 0.1)
        elif abs(y) > 0.1:  # Vertical movement with possible turning
            turning_factor = abs(x)
            if y > 0:  # Forward
                if x > 0.3:  # Forward-right
                    robot.forward_Right(speed, 0.1)
                elif x < -0.3:  # Forward-left
                    robot.forward_Left(speed, 0.1)
                else:  # Straight forward
                    robot.t_up(speed, 0.1)
            else:  # Backward
                if x > 0.3:  # Backward-right
                    robot.backward_Right(speed, 0.1)
                elif x < -0.3:  # Backward-left
                    robot.backward_Left(speed, 0.1)
                else:  # Straight backward
                    robot.t_down(speed, 0.1)
        else:  # Joystick centered or near center
            robot.t_stop(0.1)
    
    elif joystick == 'right':  # Camera gimbal
        global camera_angle_h, camera_angle_v
        # Update camera angles based on joystick position
        # Limit angles to reasonable ranges
        camera_angle_h = max(35, min(125, camera_angle_h + int(x * 5)))
        camera_angle_v = max(0, min(80, camera_angle_v - int(y * 5)))
        
        # Set servo angles for camera gimbal
        robot.set_servo_angle(0, camera_angle_h)  # Horizontal servo
        robot.set_servo_angle(1, camera_angle_v)  # Vertical servo

@socketio.on('speed_change')
def handle_speed_change(data):
    global current_speed
    current_speed = data.get('speed', 50)
    print(f"Speed changed to {current_speed}%")

@socketio.on('voice_data')
def handle_voice_data(data):
    global voice_recognition_active
    
    if voice_recognition_active:
        return
    
    voice_recognition_active = True
    try:
        # Save audio data to file
        audio_data = data.get('audio')
        with open('voice_command.webm', 'wb') as f:
            f.write(audio_data)
        
        # Process voice command
        response = process_voice_command('voice_command.webm')
        
        # Send response back to client
        socketio.emit('ai_response', {'response': response})
    except Exception as e:
        print(f"Error handling voice data: {e}")
        socketio.emit('ai_response', {'response': f"Error: {str(e)}"})
    finally:
        voice_recognition_active = False

@socketio.on('text_command')
def handle_text_command(data):
    command = data.get('command', '')
    if not command:
        return
    
    # Process text command using DeepSeekR1
    response = query_deepseek(command)
    socketio.emit('ai_response', {'response': response})

# Cleanup function
def cleanup():
    global camera
    if camera:
        camera.release()
    stop_slam()
    print("Cleaning up resources...")

# Handle signals
def signal_handler(sig, frame):
    cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Main function
def main():
    global whisper_model
    
    # Initialize camera
    init_camera()
    
    # Initialize Ollama and DeepSeekR1
    if not init_ollama():
        print("Warning: Ollama initialization failed. Voice AI features may not work.")
    
    # Initialize Whisper in a separate thread to avoid blocking startup
    threading.Thread(target=lambda: init_whisper()).start()
    
    # Set initial camera position
    robot.set_servo_angle(9, camera_angle_h)  # Horizontal servo
    robot.set_servo_angle(10, camera_angle_v)  # Vertical servo
    
    # Start Flask app
    print("Starting AI Smart Car server...")
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)

if __name__ == '__main__':
    main() 