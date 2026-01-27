// Scouter App - Frontend JavaScript

// Test descriptions for info modals
const TEST_DESCRIPTIONS = {
  radar: {
    'oas-validation': {
      name: 'OAS Validation',
      description: 'Tests that F5 XC is enforcing the OpenAPI spec by first verifying a documented endpoint (/radar/scan) returns 200, then requesting an undocumented endpoint (/radar/shadow-protocol). A 403 response confirms OAS enforcement is active.'
    },
    'rate-limiting': {
      name: 'Rate Limiting',
      description: 'Sends 50 rapid requests to the /radar/scan endpoint within 2 seconds. Verifies that HTTP 429 (Too Many Requests) responses are returned when rate limits are exceeded. A successful test indicates F5 XC rate limiting policies are properly configured.'
    },
    'performance': {
      name: 'Global Performance',
      description: 'Validates the target resolves to a public IP, then measures round-trip latency across 3 requests to /radar/scan. Classifies performance as: Excellent (<50ms), Good (<100ms), Acceptable (<150ms), Marginal (<200ms), or Poor (>200ms).'
    },
    'security': {
      name: 'API Security',
      description: 'Tests SQL injection in URL paths, directory traversal attempts (../../etc/passwd), and oversized header attacks (10KB headers). Verifies that F5 XC WAF returns 403 or 400 blocking responses for each malicious payload.'
    }
  },
  store: {
    'waf': {
      name: 'WAF Protection',
      description: 'Sends OWASP Top 10 attack patterns including XSS payloads, SQL injection strings, and command injection attempts. Counts blocked vs allowed requests to measure WAF effectiveness and signature coverage.'
    },
    'bot': {
      name: 'Bot Protection',
      description: 'Tests with automated user-agent strings (curl, python-requests, headless browsers) and suspicious request patterns (rapid sequential requests, missing headers). Verifies bot mitigation rules trigger appropriate challenges or blocks.'
    },
    'ddos': {
      name: 'DDoS Mitigation',
      description: 'Simulates burst traffic patterns with concurrent request floods. Checks for rate limiting responses, JavaScript challenges, and CAPTCHA triggers. Validates that legitimate traffic patterns are not impacted.'
    },
    'pci': {
      name: 'PCI Compliance',
      description: 'Validates TLS version (1.2+ required), cipher suite strength, HSTS headers, and security headers (X-Frame-Options, X-Content-Type-Options). Checks for PCI-DSS 4.0 compliance requirements on payment API endpoints.'
    }
  }
};

class ScouterApp {
  constructor() {
    this.ws = null;
    this.activeScans = new Set();
    this.modal = document.getElementById('test-modal');
    this.initEventListeners();
  }

  initEventListeners() {
    // Radar scan button
    document.getElementById('radar-scan').addEventListener('click', () => {
      this.startScan('radar');
    });

    // Store scan button
    document.getElementById('store-scan').addEventListener('click', () => {
      this.startScan('store');
    });

    // Info button clicks
    document.querySelectorAll('.info-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const testId = btn.dataset.test;
        const panel = btn.dataset.panel;
        this.showTestInfo(panel, testId);
      });
    });

    // Modal close button
    this.modal.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    // Click outside modal to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  showTestInfo(panel, testId) {
    const testData = TEST_DESCRIPTIONS[panel]?.[testId];
    if (!testData) return;

    this.modal.querySelector('.modal-title').textContent = testData.name;
    this.modal.querySelector('.modal-description').textContent = testData.description;
    this.modal.classList.add('active');
    this.modal.setAttribute('aria-hidden', 'false');

    // Focus trap for accessibility
    this.modal.querySelector('.modal-close').focus();
  }

  closeModal() {
    this.modal.classList.remove('active');
    this.modal.setAttribute('aria-hidden', 'true');
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

    // Validation
    if (!fqdn) {
      this.showError(target, 'Please enter a target FQDN');
      return;
    }

    if (tests.length === 0) {
      this.showError(target, 'Please select at least one test');
      return;
    }

    // Check if already scanning this target
    if (this.activeScans.has(target)) {
      return;
    }

    // Clear previous results
    this.clearResults(target);

    // Start scanning state
    this.setScanning(target, true);

    // Connect WebSocket and send scan request
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

    // Remove placeholder if exists
    const placeholder = resultsArea.querySelector('.results-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    // Add running result card
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

    // Build details HTML
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

    // Build debug HTML
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

    // Animate power level counting up
    this.animatePowerLevel(powerValue, data.totalPowerLevel, data.target);

    // Add message if over 9000
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

      // Easing function
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.scouter = new ScouterApp();
});
