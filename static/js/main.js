/**
 * Main JavaScript for AI Smart Car Control
 * Handles socket connections, voice recognition, and UI interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Socket.io connection
    const socket = io();
    
    // DOM Elements
    const videoFeed = document.getElementById('videoFeed');
    const speedValue = document.getElementById('speedValue');
    const directionValue = document.getElementById('directionValue');
    const cameraValue = document.getElementById('cameraValue');
    const chatMessages = document.getElementById('chatMessages');
    const textCommand = document.getElementById('textCommand');
    const sendBtn = document.getElementById('sendBtn');
    const voiceBtn = document.getElementById('voiceBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedSliderValue = document.getElementById('speedSliderValue');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const languageSelect = document.getElementById('languageSelect');
    const requestPermissionsBtn = document.getElementById('requestPermissionsBtn');
    const permissionModal = document.getElementById('permissionModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const autonomousBtn = document.getElementById('autonomousBtn');
    
    // State variables
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = [];
    let currentSpeed = 50;
    let currentDirection = 'Stopped';
    let cameraAngleH = 80;
    let cameraAngleV = 40;
    let isAutonomous = false;
    let volume = 80;
    let language = 'en-US';
    let joystickUpdateInterval = null;
    
    // Initialize joystick handlers
    function initJoysticks() {
        if (!window.joysticks) return;
        
        // Set callbacks for joysticks
        window.joysticks.left.onMove = handleJoystickMove;
        window.joysticks.right.onMove = handleJoystickMove;
        window.joysticks.left.onEnd = handleJoystickEnd;
        window.joysticks.right.onEnd = handleJoystickEnd;
        
        // Start interval to send joystick updates (reduces network traffic)
        joystickUpdateInterval = setInterval(() => {
            if (window.joysticks.left.active) {
                sendJoystickData('left', window.joysticks.left.value);
            }
            if (window.joysticks.right.active) {
                sendJoystickData('right', window.joysticks.right.value);
            }
        }, 100); // Send updates every 100ms
    }
    
    // Handle joystick movement
    function handleJoystickMove(id, value) {
        // Update UI based on joystick position
        if (id === 'leftJoystick') {
            // Update direction indicator
            if (Math.abs(value.y) > 0.2) {
                if (value.y > 0) {
                    directionValue.textContent = 'Forward';
                } else {
                    directionValue.textContent = 'Backward';
                }
                
                if (Math.abs(value.x) > 0.3) {
                    if (value.x > 0) {
                        directionValue.textContent += ' Right';
                    } else {
                        directionValue.textContent += ' Left';
                    }
                }
            } else if (Math.abs(value.x) > 0.3) {
                if (value.x > 0) {
                    directionValue.textContent = 'Right';
                } else {
                    directionValue.textContent = 'Left';
                }
            } else {
                directionValue.textContent = 'Stopped';
            }
            
            currentDirection = directionValue.textContent;
        } else if (id === 'rightJoystick') {
            // Update camera angle indicator
            cameraAngleH = Math.max(35, Math.min(125, 80 + Math.round(value.x * 45)));
            cameraAngleV = Math.max(0, Math.min(80, 40 - Math.round(value.y * 40)));
            cameraValue.textContent = `H:${cameraAngleH}° V:${cameraAngleV}°`;
        }
    }
    
    // Handle joystick release
    function handleJoystickEnd(id) {
        if (id === 'leftJoystick') {
            // Send stop command when joystick is released
            directionValue.textContent = 'Stopped';
            currentDirection = 'Stopped';
            sendJoystickData('left', { x: 0, y: 0 });
        }
    }
    
    // Send joystick data to server
    function sendJoystickData(joystick, value) {
        socket.emit('joystick_movement', {
            joystick: joystick === 'leftJoystick' ? 'left' : 'right',
            x: value.x,
            y: value.y
        });
    }
    
    // Initialize voice recognition
    function initVoiceRecognition() {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            addMessage('Your browser does not support voice recognition', 'system');
            voiceBtn.style.display = 'none';
            return;
        }
        
        // Set up voice button
        voiceBtn.addEventListener('mousedown', startRecording);
        voiceBtn.addEventListener('touchstart', startRecording);
        voiceBtn.addEventListener('mouseup', stopRecording);
        voiceBtn.addEventListener('touchend', stopRecording);
        voiceBtn.addEventListener('mouseleave', stopRecording);
        
        // Check if using HTTPS
        if (window.location.protocol !== 'https:') {
            permissionModal.style.display = 'flex';
        }
    }
    
    // Start recording audio
    function startRecording(e) {
        e.preventDefault();
        
        if (isRecording) return;
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                isRecording = true;
                voiceBtn.classList.add('active');
                addMessage('Listening...', 'system');
                
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });
                
                mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    sendAudioToServer(audioBlob);
                    
                    // Stop all tracks to release microphone
                    stream.getTracks().forEach(track => track.stop());
                });
                
                mediaRecorder.start();
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                addMessage('Error accessing microphone. Check permissions.', 'system');
                permissionModal.style.display = 'flex';
            });
    }
    
    // Stop recording audio
    function stopRecording(e) {
        if (e) e.preventDefault();
        
        if (!isRecording || !mediaRecorder) return;
        
        isRecording = false;
        voiceBtn.classList.remove('active');
        
        mediaRecorder.stop();
    }
    
    // Send audio to server for processing
    function sendAudioToServer(audioBlob) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const arrayBuffer = reader.result;
            socket.emit('voice_data', { audio: arrayBuffer });
        };
        reader.readAsArrayBuffer(audioBlob);
    }
    
    // Add message to chat
    function addMessage(text, type) {
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        chatMessages.appendChild(message);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Initialize UI event listeners
    function initUIListeners() {
        // Speed slider
        speedSlider.addEventListener('input', () => {
            currentSpeed = speedSlider.value;
            speedValue.textContent = currentSpeed;
            speedSliderValue.textContent = currentSpeed;
            socket.emit('speed_change', { speed: parseInt(currentSpeed) });
        });
        
        // Text command input
        textCommand.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendTextCommand();
            }
        });
        
        sendBtn.addEventListener('click', sendTextCommand);
        
        // Settings panel
        settingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'block';
        });
        
        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'none';
        });
        
        // Volume slider
        volumeSlider.addEventListener('input', () => {
            volume = volumeSlider.value;
        });
        
        // Language select
        languageSelect.addEventListener('change', () => {
            language = languageSelect.value;
        });
        
        // Request permissions button
        requestPermissionsBtn.addEventListener('click', () => {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    addMessage('Microphone access granted', 'system');
                    settingsPanel.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error accessing microphone:', error);
                    addMessage('Error accessing microphone. Check browser settings.', 'system');
                });
        });
        
        // Close modal button
        closeModalBtn.addEventListener('click', () => {
            permissionModal.style.display = 'none';
        });
        
        // Autonomous mode button
        autonomousBtn.addEventListener('click', () => {
            isAutonomous = !isAutonomous;
            if (isAutonomous) {
                autonomousBtn.classList.add('active');
                addMessage('Autonomous mode activated', 'system');
                socket.emit('text_command', { command: 'activate autonomous mode' });
            } else {
                autonomousBtn.classList.remove('active');
                addMessage('Autonomous mode deactivated', 'system');
                socket.emit('text_command', { command: 'deactivate autonomous mode' });
            }
        });
    }
    
    // Send text command to server
    function sendTextCommand() {
        const command = textCommand.value.trim();
        if (!command) return;
        
        addMessage(command, 'user');
        socket.emit('text_command', { command });
        textCommand.value = '';
    }
    
    // Socket event handlers
    function initSocketListeners() {
        socket.on('connect', () => {
            addMessage('Connected to server', 'system');
        });
        
        socket.on('disconnect', () => {
            addMessage('Disconnected from server', 'system');
        });
        
        socket.on('voice_command', (data) => {
            addMessage(`You said: ${data.command}`, 'user');
        });
        
        socket.on('ai_response', (data) => {
            addMessage(data.response, 'ai');
        });
    }
    
    // Initialize everything
    function init() {
        initJoysticks();
        initVoiceRecognition();
        initUIListeners();
        initSocketListeners();
    }
    
    // Start initialization when page is loaded
    window.addEventListener('load', init);
}); 