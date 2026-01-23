const USERS = ['Vegeta', 'Goku', 'Trunks', 'Piccolo'];
const SAFETY_THRESHOLDS = {
  'Vegeta': 450,
  'Goku': 500,
  'Trunks': 300,
  'Piccolo': 350
};

class GravitySimulator {
  constructor() {
    this.status = 'idle';
    this.gravityLevel = 1;
    this.user = null;
    this.sessionStart = null;
    this.targetDuration = 0;
    this.userIndex = 0;
    this.idleCountdown = 5; // Start first session after 5 seconds
    this.emergencyCountdown = 0;
  }

  getSafetyThreshold() {
    return this.user ? SAFETY_THRESHOLDS[this.user] : 100;
  }

  getPowerOutput() {
    // Power scales exponentially with gravity
    return Math.round(this.gravityLevel * 5.65 * 10) / 10;
  }

  getState() {
    const now = new Date();
    return {
      chamber: {
        status: this.status,
        gravityLevel: this.gravityLevel,
        safetyThreshold: this.getSafetyThreshold(),
        powerOutput: this.getPowerOutput()
      },
      session: {
        user: this.user,
        startedAt: this.sessionStart ? this.sessionStart.toISOString() : null,
        duration: this.sessionStart ? Math.floor((now - this.sessionStart) / 1000) : 0,
        targetDuration: this.targetDuration
      },
      timestamp: now.toISOString()
    };
  }

  tick() {
    if (this.status === 'emergency') {
      this.emergencyCountdown--;
      if (this.emergencyCountdown <= 0) {
        // Emergency resolved, go to idle
        this.status = 'idle';
        this.gravityLevel = 1;
        this.user = null;
        this.sessionStart = null;
        this.idleCountdown = 10;
      }
      return;
    }

    if (this.status === 'idle') {
      this.idleCountdown--;
      if (this.idleCountdown <= 0) {
        this.startSession();
      }
      return;
    }

    if (this.status === 'active') {
      const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);

      // Random emergency chance (1% per tick)
      if (Math.random() < 0.01 && this.gravityLevel > 100) {
        this.triggerEmergency();
        return;
      }

      // Gradually increase gravity during session
      const progress = elapsed / this.targetDuration;
      const targetGravity = Math.min(
        Math.floor(50 + progress * (this.getSafetyThreshold() - 50)),
        this.getSafetyThreshold()
      );

      // Smooth ramping
      if (this.gravityLevel < targetGravity) {
        this.gravityLevel = Math.min(this.gravityLevel + Math.ceil(Math.random() * 3), targetGravity);
      }

      // Session complete
      if (elapsed >= this.targetDuration) {
        this.endSession();
      }
    }
  }

  startSession() {
    this.user = USERS[this.userIndex];
    this.userIndex = (this.userIndex + 1) % USERS.length;
    this.status = 'active';
    this.sessionStart = new Date();
    this.targetDuration = 60 + Math.floor(Math.random() * 120); // 60-180 seconds
    this.gravityLevel = 10;
  }

  endSession() {
    this.status = 'idle';
    this.gravityLevel = 1;
    this.user = null;
    this.sessionStart = null;
    this.idleCountdown = 15 + Math.floor(Math.random() * 15); // 15-30 seconds idle
  }

  triggerEmergency() {
    this.status = 'emergency';
    this.gravityLevel = Math.min(this.gravityLevel + 50, 500); // Spike!
    this.emergencyCountdown = 8; // 8 seconds of emergency
  }
}

module.exports = { GravitySimulator };
