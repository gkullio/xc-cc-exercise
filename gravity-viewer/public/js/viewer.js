// Gravity Chamber Viewer - WebSocket Client (Proxied)

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;
let currentFqdn = '';

// DOM Elements
const fqdnInput = document.getElementById('fqdn');
const connectBtn = document.getElementById('connect-btn');
const connectionStatus = document.getElementById('connection-status');
const gravityValue = document.getElementById('gravity-value');
const gaugeFill = document.getElementById('gauge-fill');
const chamberStatus = document.getElementById('chamber-status');
const sessionUser = document.getElementById('session-user');
const sessionTime = document.getElementById('session-time');
const sessionTarget = document.getElementById('session-target');
const powerOutput = document.getElementById('power-output');
const safetyThreshold = document.getElementById('safety-threshold');
const errorOverlay = document.getElementById('error-overlay');
const errorMessage = document.getElementById('error-message');
const errorDismiss = document.getElementById('error-dismiss');

// Event Listeners
connectBtn.addEventListener('click', handleConnect);
fqdnInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleConnect();
});
errorDismiss.addEventListener('click', hideError);

function handleConnect() {
  const fqdn = fqdnInput.value.trim();
  if (!fqdn) {
    showError('Please enter a valid FQDN');
    return;
  }

  currentFqdn = fqdn;
  connect(fqdn);
}

function connect(fqdn) {
  // Close existing connection
  if (ws) {
    ws.close();
  }

  setStatus('connecting');
  connectBtn.disabled = true;
  connectBtn.textContent = 'CONNECTING...';

  // Connect to our own server's WebSocket proxy
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = window.location.pathname.replace(/\/$/, '');
  const wsUrl = `${protocol}//${window.location.host}${basePath}/ws/chamber`;

  console.log('Connecting to viewer proxy:', wsUrl);

  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    showError('Failed to connect to viewer: ' + err.message);
    resetConnection();
    return;
  }

  ws.onopen = () => {
    console.log('Connected to viewer proxy, requesting chamber connection');
    // Ask the server to connect to the gravity chamber
    ws.send(JSON.stringify({
      action: 'connect',
      fqdn: fqdn
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'status':
          handleStatusMessage(data);
          break;
        case 'state':
          updateDisplay(data);
          break;
        case 'error':
          showError(data.message);
          resetConnection();
          break;
        default:
          // Legacy format - treat as state
          if (data.chamber) {
            updateDisplay(data);
          }
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  ws.onclose = (event) => {
    console.log('Connection closed:', event.code, event.reason);

    if (connectionStatus.textContent === 'ESTABLISHING LINK...') {
      showError('Failed to connect to viewer proxy');
    } else if (connectionStatus.textContent === 'CONNECTED') {
      // Unexpected disconnect, try reconnect
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        setStatus('connecting');
        setTimeout(() => connect(currentFqdn), 2000);
        return;
      } else {
        showError('Connection lost. Max reconnection attempts reached.');
      }
    }

    resetConnection();
  };
}

function handleStatusMessage(data) {
  switch (data.status) {
    case 'connecting':
      console.log('Server connecting to chamber:', data.target);
      setStatus('connecting');
      break;
    case 'connected':
      console.log('Connected to gravity chamber via proxy');
      setStatus('connected');
      reconnectAttempts = 0;
      connectBtn.textContent = 'DISCONNECT';
      connectBtn.disabled = false;
      connectBtn.onclick = disconnect;
      break;
    case 'disconnected':
      console.log('Disconnected from chamber:', data.reason);
      if (connectionStatus.textContent === 'CONNECTED') {
        // Unexpected disconnect
        if (reconnectAttempts < MAX_RECONNECT && currentFqdn) {
          reconnectAttempts++;
          setStatus('connecting');
          setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: 'connect', fqdn: currentFqdn }));
            }
          }, 2000);
          return;
        }
      }
      resetConnection();
      break;
  }
}

function disconnect() {
  if (ws) {
    ws.send(JSON.stringify({ action: 'disconnect' }));
    ws.close();
    ws = null;
  }
  resetConnection();
}

function resetConnection() {
  setStatus('disconnected');
  connectBtn.textContent = 'CONNECT';
  connectBtn.disabled = false;
  connectBtn.onclick = handleConnect;
  clearDisplay();
}

function setStatus(status) {
  connectionStatus.className = 'status ' + status;
  connectionStatus.textContent = status.toUpperCase();
  if (status === 'connecting') {
    connectionStatus.textContent = 'ESTABLISHING LINK...';
  }
}

function updateDisplay(state) {
  const { chamber, session } = state;

  if (!chamber) return;

  // Gravity value
  gravityValue.textContent = chamber.gravityLevel;

  // Update gauge (max 500x gravity = full circle)
  const percentage = chamber.gravityLevel / 500;
  const circumference = 534; // 2 * PI * 85
  const offset = circumference - (percentage * circumference);
  gaugeFill.style.strokeDashoffset = offset;

  // Color based on threshold proximity
  const thresholdRatio = chamber.gravityLevel / chamber.safetyThreshold;
  if (thresholdRatio >= 1 || chamber.status === 'emergency') {
    gravityValue.className = 'gravity-value danger';
    gaugeFill.className.baseVal = 'gauge-fill danger';
  } else if (thresholdRatio >= 0.8) {
    gravityValue.className = 'gravity-value warning';
    gaugeFill.className.baseVal = 'gauge-fill warning';
  } else {
    gravityValue.className = 'gravity-value';
    gaugeFill.className.baseVal = 'gauge-fill';
  }

  // Chamber status
  chamberStatus.textContent = chamber.status.toUpperCase();
  chamberStatus.className = 'info-value status-value ' + chamber.status;

  // Session info
  if (session) {
    sessionUser.textContent = session.user || '---';
    sessionTime.textContent = session.user ? formatTime(session.duration) : '--:--';
    sessionTarget.textContent = session.user ? formatTime(session.targetDuration) : '--:--';
  }

  // Power and safety
  powerOutput.textContent = chamber.powerOutput + ' kW';
  safetyThreshold.textContent = chamber.safetyThreshold + 'x';
}

function clearDisplay() {
  gravityValue.textContent = '---';
  gravityValue.className = 'gravity-value';
  gaugeFill.style.strokeDashoffset = 534;
  gaugeFill.className.baseVal = 'gauge-fill';
  chamberStatus.textContent = '---';
  chamberStatus.className = 'info-value status-value';
  sessionUser.textContent = '---';
  sessionTime.textContent = '--:--';
  sessionTarget.textContent = '--:--';
  powerOutput.textContent = '--- kW';
  safetyThreshold.textContent = '---x';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showError(message) {
  errorMessage.textContent = message;
  errorOverlay.classList.remove('hidden');
}

function hideError() {
  errorOverlay.classList.add('hidden');
}
