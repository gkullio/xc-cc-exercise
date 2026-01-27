// Scouter - Security Configuration Validator

// Test descriptions for info modals
const TEST_DESCRIPTIONS = {
  radar: {
    'rate-limiting': {
      name: 'Rate Limiting',
      description: 'Sends 50 rapid requests to the /api/radar/scan endpoint within 2 seconds. Verifies that HTTP 429 (Too Many Requests) responses are returned when rate limits are exceeded. A successful test indicates F5 XC rate limiting policies are properly configured.'
    },
    'oas-validation': {
      name: 'OAS Validation',
      description: 'Tests OpenAPI Specification enforcement by calling documented endpoints (should succeed) and undocumented shadow endpoints like /api/radar/shadow-protocol (should be blocked with 403). Validates that F5 XC API Discovery is enforcing the uploaded API spec.'
    },
    'performance': {
      name: 'Global Performance',
      description: 'Validates the target resolves to a public IP, then measures round-trip latency across 3 requests to /api/radar/scan. Classifies performance as: Excellent (<50ms), Good (<100ms), Acceptable (<150ms), Marginal (<200ms), or Poor (>200ms).'
    },
    'security': {
      name: 'API Security',
      description: 'Tests SQL injection in URL paths, directory traversal attempts (../../etc/passwd), and oversized header attacks (10KB headers). Verifies that F5 XC WAF returns 403 or 400 blocking responses for each malicious payload.'
    }
  },
  store: {
    'waf': {
      name: 'WAF Protection',
      description: 'Sends OWASP Top 10 attack patterns including XSS payloads (<script>alert(1)</script>), SQL injection strings, and command injection attempts. Counts blocked vs allowed requests to measure WAF effectiveness and signature coverage.'
    },
    'bot': {
      name: 'Bot Protection',
      description: 'Tests with automated user-agent strings (curl, python-requests, headless browsers) and suspicious request patterns (rapid sequential requests, missing headers). Verifies bot mitigation rules trigger appropriate challenges or blocks.'
    },
    'ddos': {
      name: 'DDoS Mitigation',
      description: 'Simulates burst traffic patterns with concurrent request floods. Checks for rate limiting responses (429), JavaScript challenges, and CAPTCHA triggers. Validates that legitimate traffic patterns are not impacted by protection rules.'
    },
    'pci': {
      name: 'PCI Compliance',
      description: 'Validates TLS version (1.2+ required), cipher suite strength, HSTS headers, and security headers (X-Frame-Options, X-Content-Type-Options, Content-Security-Policy). Checks for PCI-DSS 4.0 compliance requirements on payment API endpoints.'
    }
  },
  chamber: {
    'availability': {
      name: 'Chamber Availability',
      description: 'Establishes a WebSocket connection to the Gravity Chamber control system at ws://[host]:3003/chamber. Verifies the chamber responds with valid state data including status information. Tests real-time connectivity to the chamber backend.'
    },
    'private-network': {
      name: 'Private Network (RFC1918)',
      description: 'Resolves the target FQDN to an IP address and verifies it falls within RFC1918 private ranges (10.0.0.0/8, 172.16.0.0/12, or 192.168.0.0/16). The Gravity Chamber should NOT be publicly accessible - this test confirms proper network segmentation via F5 XC.'
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
    document.getElementById('radar-scan').addEventListener('click', () => {
      this.startScan('radar');
    });

    document.getElementById('store-scan').addEventListener('click', () => {
      this.startScan('store');
    });

    document.getElementById('chamber-scan').addEventListener('click', () => {
      this.startScan('chamber');
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

    // Focus close button for accessibility
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
    const value = input.value.trim();
    // Fall back to placeholder hint if empty
    return value || input.placeholder;
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
    // Build SSE URL with query params
    const params = new URLSearchParams({
      target: target,
      fqdn: fqdn,
      tests: tests.join(',')
    });
    const sseUrl = `/ws/scan/stream?${params}`;  // Goes through nginx proxy to scouter-app

    console.log(`Starting SSE scan for ${target}:`, sseUrl);

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);

      // Close EventSource after scan completes
      if (data.type === 'scan-complete') {
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.showError(target, 'Connection error - please try again');
      this.setScanning(target, false);
      eventSource.close();
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

    // Re-enable the scan button
    this.setScanning(data.target, false);
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
