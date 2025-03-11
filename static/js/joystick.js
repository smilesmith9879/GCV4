/**
 * Joystick Controller for AI Smart Car
 * Handles touch and mouse events for virtual joysticks
 */

class Joystick {
    constructor(element, options = {}) {
        this.element = element;
        this.knob = element.querySelector('.joystick-knob');
        this.id = element.id;
        this.active = false;
        this.value = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.center = { x: 0, y: 0 };
        this.radius = options.radius || 50;
        this.onMove = options.onMove || function() {};
        this.onEnd = options.onEnd || function() {};
        
        // Calculate center position
        this.calculateCenter();
        
        // Add event listeners
        this.bindEvents();
        
        // Auto-center the knob
        this.centerKnob();
    }
    
    calculateCenter() {
        const rect = this.element.getBoundingClientRect();
        this.center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        this.maxDistance = (rect.width / 2) - (this.knob.offsetWidth / 2);
    }
    
    bindEvents() {
        // Mouse events
        this.element.addEventListener('mousedown', this.handleStart.bind(this));
        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('mouseup', this.handleEnd.bind(this));
        
        // Touch events
        this.element.addEventListener('touchstart', this.handleStart.bind(this));
        document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleEnd.bind(this));
        
        // Recalculate center on resize
        window.addEventListener('resize', this.calculateCenter.bind(this));
    }
    
    handleStart(e) {
        e.preventDefault();
        this.active = true;
        this.calculateCenter();
        
        // Store the offset if the user doesn't click exactly on the knob
        if (e.type === 'mousedown') {
            const clientX = e.clientX;
            const clientY = e.clientY;
            const knobRect = this.knob.getBoundingClientRect();
            this.offset = {
                x: clientX - (knobRect.left + knobRect.width / 2),
                y: clientY - (knobRect.top + knobRect.height / 2)
            };
        } else if (e.type === 'touchstart') {
            const touch = e.touches[0];
            const clientX = touch.clientX;
            const clientY = touch.clientY;
            const knobRect = this.knob.getBoundingClientRect();
            this.offset = {
                x: clientX - (knobRect.left + knobRect.width / 2),
                y: clientY - (knobRect.top + knobRect.height / 2)
            };
        }
    }
    
    handleMove(e) {
        if (!this.active) return;
        e.preventDefault();
        
        let clientX, clientY;
        
        if (e.type === 'mousemove') {
            clientX = e.clientX - this.offset.x;
            clientY = e.clientY - this.offset.y;
        } else if (e.type === 'touchmove') {
            const touch = e.touches[0];
            clientX = touch.clientX - this.offset.x;
            clientY = touch.clientY - this.offset.y;
        }
        
        // Calculate distance from center
        const deltaX = clientX - this.center.x;
        const deltaY = clientY - this.center.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Normalize to values between -1 and 1
        if (distance > this.maxDistance) {
            // Limit to the joystick's radius
            const angle = Math.atan2(deltaY, deltaX);
            clientX = this.center.x + Math.cos(angle) * this.maxDistance;
            clientY = this.center.y + Math.sin(angle) * this.maxDistance;
        }
        
        // Update knob position
        this.knob.style.transform = `translate(${clientX - this.center.x}px, ${clientY - this.center.y}px)`;
        
        // Calculate normalized values (-1 to 1)
        this.value = {
            x: (clientX - this.center.x) / this.maxDistance,
            y: (clientY - this.center.y) / this.maxDistance * -1 // Invert Y so up is positive
        };
        
        // Call the move callback
        this.onMove(this.id, this.value);
    }
    
    handleEnd(e) {
        if (!this.active) return;
        this.active = false;
        
        // Auto-center the knob with animation
        this.centerKnob();
        
        // Reset values
        this.value = { x: 0, y: 0 };
        
        // Call the end callback
        this.onEnd(this.id);
    }
    
    centerKnob() {
        this.knob.style.transition = 'transform 0.2s ease-out';
        this.knob.style.transform = 'translate(0, 0)';
        
        // Remove transition after animation completes
        setTimeout(() => {
            this.knob.style.transition = '';
        }, 200);
    }
}

// Initialize joysticks when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the page to fully load to ensure elements are available
    window.addEventListener('load', () => {
        // Initialize joysticks if they exist
        const leftJoystickElement = document.getElementById('leftJoystick');
        const rightJoystickElement = document.getElementById('rightJoystick');
        
        if (leftJoystickElement && rightJoystickElement) {
            // Create joystick instances
            window.joysticks = {
                left: new Joystick(leftJoystickElement),
                right: new Joystick(rightJoystickElement)
            };
            
            console.log('Joysticks initialized');
        }
    });
}); 