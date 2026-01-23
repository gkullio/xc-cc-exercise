// Scouter - Security Configuration Validator

class ScouterApp {
  constructor() {
    this.ws = null;
    this.activeScans = new Set();
    this.initEventListeners();
  }

  initEventListeners() {
    document.getElementById('radar-scan').addEventListener('click', () => {
      this.startScan('radar');
    });

    document.getElementById('store-scan').addEventListener('click', () => {
      this.startScan('store');
    });
  }

  getSelectedTests(target) {
    const checkboxes = document.querySelectorAll(`input[name="${target}-test"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
  }

  getFqdn(target) {
    const input = document.getElementById(`${target}-fqdn`);
    return input.value.trim();
  }

  startScan(target) {
    const fqdn = this.getFqdn(target);
    const tests = this.getSelectedTests(target);

    if (!fqdn) {
      this.showError(target, 'Please enter a target FQDN');
      return;
    }

    if (tests.length === 0) {
      this.showError(target, 'Please select at least one test');
      return;
    }

    if (this.activeScans.has(target)) {
      return;
    }

    this.clearResults(target);
    this.setScanning(target, true);
    this.connectAndScan(target, fqdn, tests);
  }

  connectAndScan(target, fqdn, tests) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/scan`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket connected for ${target} scan`);
      ws.send(JSON.stringify({
        action: 'scan',
        target: target,
        fqdn: fqdn,
        tests: tests
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.showError(target, 'Connection error - please try again');
      this.setScanning(target, false);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for ${target}`);
      this.setScanning(target, false);
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'test-start':
        this.showTestStart(data);
        break;
      case 'test-result':
        this.showTestResult(data);
        break;
      case 'scan-complete':
        this.showScanComplete(data);
        break;
      case 'error':
        this.showError(data.target, data.message);
        break;
    }
  }

  showTestStart(data) {
    const resultsArea = document.getElementById(`${data.target}-results`);

    const placeholder = resultsArea.querySelector('.scouter-results-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    const card = document.createElement('div');
    card.className = 'result-card running';
    card.id = `result-${data.target}-${data.test}`;
    card.innerHTML = `
      <div class="result-header">
        <span class="result-name">${data.name}</span>
        <span class="result-status running">Scanning...</span>
      </div>
    `;
    resultsArea.appendChild(card);
  }

  showTestResult(data) {
    const card = document.getElementById(`result-${data.target}-${data.test}`);
    if (!card) return;

    const statusClass = data.status === 'pass' ? 'pass' : 'fail';
    card.className = `result-card ${statusClass}`;

    let detailsHtml = '';
    if (data.details && data.details.length > 0) {
      detailsHtml = `
        <div class="result-details">
          ${data.details.map(d => {
            const itemClass = d.result.includes('Blocked') ? 'blocked' :
                             d.result.includes('OK') || d.result.includes('✓') ? 'success' : '';
            return `<div class="result-detail-item ${itemClass}">${d.phase}: ${d.result}</div>`;
          }).join('')}
        </div>
      `;
    }

    let debugHtml = '';
    if (data.debug) {
      debugHtml = `
        <button class="debug-toggle" onclick="this.nextElementSibling.classList.toggle('visible')">
          ▸ Show Debug Data
        </button>
        <div class="debug-content">${JSON.stringify(data.debug, null, 2)}</div>
      `;
    }

    card.innerHTML = `
      <div class="result-header">
        <span class="result-name">${data.name || data.test}</span>
        <span class="result-status ${statusClass}">${data.status.toUpperCase()}</span>
      </div>
      <div class="result-power">Power Level: ${data.powerLevel.toLocaleString()}</div>
      ${detailsHtml}
      ${debugHtml}
    `;
  }

  showScanComplete(data) {
    const powerDisplay = document.getElementById(`${data.target}-power-level`);
    const powerValue = powerDisplay.querySelector('.power-value');

    powerDisplay.style.display = 'block';
    this.animatePowerLevel(powerValue, data.totalPowerLevel, data.target);

    if (data.totalPowerLevel > 9000) {
      powerDisplay.classList.add('over-9000');
      const existingMsg = powerDisplay.querySelector('.power-message');
      if (!existingMsg) {
        const msg = document.createElement('div');
        msg.className = 'power-message';
        msg.textContent = data.message || "IT'S OVER 9000!";
        powerDisplay.appendChild(msg);
      }
    } else {
      powerDisplay.classList.remove('over-9000');
    }
  }

  animatePowerLevel(element, targetValue, target) {
    const duration = 1000;
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);

      element.textContent = currentValue.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  showError(target, message) {
    const resultsArea = document.getElementById(`${target}-results`);
    resultsArea.innerHTML = `
      <div class="result-card fail">
        <div class="result-header">
          <span class="result-name">Error</span>
          <span class="result-status fail">FAILED</span>
        </div>
        <div class="result-details">
          <div class="result-detail-item">${message}</div>
        </div>
      </div>
    `;
    this.setScanning(target, false);
  }

  clearResults(target) {
    const resultsArea = document.getElementById(`${target}-results`);
    resultsArea.innerHTML = '';

    const powerDisplay = document.getElementById(`${target}-power-level`);
    powerDisplay.style.display = 'none';
    powerDisplay.classList.remove('over-9000');
    const msg = powerDisplay.querySelector('.power-message');
    if (msg) msg.remove();
  }

  setScanning(target, isScanning) {
    const button = document.getElementById(`${target}-scan`);
    const panel = document.getElementById(`${target}-panel`);

    if (isScanning) {
      this.activeScans.add(target);
      button.disabled = true;
      button.classList.add('scanning');
      panel.classList.add('scanning');
    } else {
      this.activeScans.delete(target);
      button.disabled = false;
      button.classList.remove('scanning');
      panel.classList.remove('scanning');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.scouter = new ScouterApp();
});
