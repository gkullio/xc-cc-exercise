const axios = require('axios');

/**
 * Format axios errors into user-friendly messages
 */
function formatAxiosError(error) {
  if (error.code === 'ECONNREFUSED') {
    return `Connection refused - target is not reachable at ${error.address || 'host'}:${error.port || 'port'}`;
  }
  if (error.code === 'ENOTFOUND') {
    return `DNS lookup failed - hostname not found`;
  }
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return `Connection timed out - target did not respond`;
  }
  if (error.code === 'EPROTO') {
    return `SSL/TLS error - target may not support HTTPS (try http://)`;
  }
  if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return `SSL certificate error - ${error.code}`;
  }
  if (error.response) {
    return `HTTP ${error.response.status}: ${error.response.statusText}`;
  }
  return error.message || 'Unknown error';
}

/**
 * Run WAF protection test
 */
async function testWaf(baseUrl, sendUpdate) {
  const results = {
    name: 'WAF Protection',
    test: 'waf',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'verify',
      status: normalResponse.status
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Normal request succeeded' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Attack - SQL injection
    sendUpdate({ phase: 'Testing SQL injection protection...' });
    const sqlResponse = await axios.get(`${baseUrl}/products?search=' OR '1'='1`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'sql-injection',
      url: `/products?search=' OR '1'='1`,
      status: sqlResponse.status
    });

    if (sqlResponse.status === 403) {
      results.details.push({ phase: 'SQL Injection', result: 'Blocked (403)' });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'SQL Injection', result: `Not blocked (${sqlResponse.status})` });
    }

    // Phase 3: Attack - XSS
    sendUpdate({ phase: 'Testing XSS protection...' });
    const xssResponse = await axios.get(`${baseUrl}/products?search=<script>alert(1)</script>`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'xss',
      url: `/products?search=<script>alert(1)</script>`,
      status: xssResponse.status
    });

    if (xssResponse.status === 403) {
      results.details.push({ phase: 'XSS Attack', result: 'Blocked (403)' });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'XSS Attack', result: `Not blocked (${xssResponse.status})` });
    }

    // Phase 4: Attack - Path traversal
    sendUpdate({ phase: 'Testing path traversal protection...' });
    const pathResponse = await axios.get(`${baseUrl}/../../etc/passwd`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'path-traversal',
      url: `/../../etc/passwd`,
      status: pathResponse.status
    });

    if (pathResponse.status === 403 || pathResponse.status === 400) {
      results.details.push({ phase: 'Path Traversal', result: `Blocked (${pathResponse.status})` });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'Path Traversal', result: `Not blocked (${pathResponse.status})` });
    }

    // Determine overall status
    if (results.powerLevel >= 3000) {
      results.status = 'pass';
    }

  } catch (error) {
    const errorMsg = formatAxiosError(error);
    results.details.push({ phase: 'Error', result: errorMsg });
    results.debug.error = errorMsg;
  }

  return results;
}

/**
 * Run bot protection test
 */
async function testBot(baseUrl, sendUpdate) {
  const results = {
    name: 'Bot Protection',
    test: 'bot',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works (with browser-like headers)
    sendUpdate({ phase: 'Verifying normal request with browser headers...' });
    const normalResponse = await axios.get(`${baseUrl}/`, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    results.debug.responses.push({
      phase: 'verify',
      status: normalResponse.status
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Browser request succeeded' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Attack - Bad User-Agent
    sendUpdate({ phase: 'Testing bot User-Agent detection...' });
    const botResponse = await axios.get(`${baseUrl}/api/products`, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'python-requests/2.25.1'
      }
    });

    results.debug.responses.push({
      phase: 'bad-user-agent',
      status: botResponse.status,
      headers: botResponse.headers
    });

    // Check for bot challenge (could be 403, 429, or redirect to challenge page)
    if (botResponse.status === 403 || botResponse.status === 429 ||
        (botResponse.headers['content-type'] || '').includes('text/html')) {
      results.details.push({ phase: 'Bot User-Agent', result: `Challenged/Blocked (${botResponse.status})` });
      results.powerLevel += 700;
    } else {
      results.details.push({ phase: 'Bot User-Agent', result: `Not detected (${botResponse.status})` });
    }

    // Phase 3: Attack - Rapid login attempts
    sendUpdate({ phase: 'Testing credential stuffing protection...' });
    const loginPromises = [];
    for (let i = 0; i < 10; i++) {
      loginPromises.push(
        axios.post(`${baseUrl}/api/auth/login`, {
          username: 'test' + i,
          password: 'wrongpassword'
        }, {
          timeout: 10000,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json'
          }
        }).catch(err => ({ status: 0, error: err.message }))
      );
    }

    const loginResponses = await Promise.all(loginPromises);
    const blocked = loginResponses.filter(r => r.status === 429 || r.status === 403).length;
    const failed401 = loginResponses.filter(r => r.status === 401).length;

    results.debug.responses.push({
      phase: 'credential-stuffing',
      total: loginResponses.length,
      blocked: blocked,
      failed401: failed401
    });

    if (blocked > 0) {
      results.details.push({ phase: 'Credential Stuffing', result: `${blocked}/10 attempts blocked` });
      results.powerLevel += 700;
    } else {
      results.details.push({ phase: 'Credential Stuffing', result: 'Not rate limited' });
    }

    // Phase 4: Attack - No headers at all
    sendUpdate({ phase: 'Testing headerless request detection...' });
    const noHeaderResponse = await axios.get(`${baseUrl}/api/products`, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {}
    });

    results.debug.responses.push({
      phase: 'no-headers',
      status: noHeaderResponse.status
    });

    if (noHeaderResponse.status === 403 || noHeaderResponse.status === 429) {
      results.details.push({ phase: 'Headerless Request', result: `Blocked (${noHeaderResponse.status})` });
      results.powerLevel += 700;
    } else {
      results.details.push({ phase: 'Headerless Request', result: `Not blocked (${noHeaderResponse.status})` });
    }

    // Determine overall status
    if (results.powerLevel >= 2400) {
      results.status = 'pass';
    }

  } catch (error) {
    const errorMsg = formatAxiosError(error);
    results.details.push({ phase: 'Error', result: errorMsg });
    results.debug.error = errorMsg;
  }

  return results;
}

/**
 * Run DDoS mitigation test
 */
async function testDdos(baseUrl, sendUpdate) {
  const results = {
    name: 'DDoS Mitigation',
    test: 'ddos',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  const BURST_SIZE = 100;

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/`, {
      timeout: 10000,
      validateStatus: () => true
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Normal request succeeded' });
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Burst traffic
    sendUpdate({ phase: `Sending ${BURST_SIZE} concurrent requests...` });

    const burstPromises = [];
    const startTime = Date.now();

    for (let i = 0; i < BURST_SIZE; i++) {
      burstPromises.push(
        axios.get(`${baseUrl}/api/products`, {
          timeout: 30000,
          validateStatus: () => true
        }).catch(err => ({ status: 0, error: err.message }))
      );
    }

    const burstResponses = await Promise.all(burstPromises);
    const elapsed = Date.now() - startTime;

    const succeeded = burstResponses.filter(r => r.status === 200).length;
    const throttled = burstResponses.filter(r => r.status === 429).length;
    const errors = burstResponses.filter(r => r.status === 0 || r.status >= 500).length;

    results.debug.responses.push({
      phase: 'burst',
      total: BURST_SIZE,
      succeeded: succeeded,
      throttled: throttled,
      errors: errors,
      elapsed: elapsed
    });

    results.details.push({ phase: 'Total Requests', result: `${BURST_SIZE}` });
    results.details.push({ phase: 'Succeeded (200)', result: `${succeeded}` });
    results.details.push({ phase: 'Throttled (429)', result: `${throttled}` });
    results.details.push({ phase: 'Errors', result: `${errors}` });
    results.details.push({ phase: 'Time Elapsed', result: `${elapsed}ms` });

    // Scoring
    const throttledPercent = (throttled / BURST_SIZE) * 100;

    if (throttled === 0 && errors === 0) {
      // No protection detected
      results.powerLevel = 500;
      results.details.push({ phase: 'Assessment', result: 'No rate limiting detected' });
    } else if (throttledPercent >= 50) {
      // Strong protection
      results.powerLevel = 3000;
      results.status = 'pass';
      results.details.push({ phase: 'Assessment', result: `✓ Strong protection (${throttledPercent.toFixed(0)}% throttled)` });
    } else if (throttledPercent >= 20) {
      // Moderate protection
      results.powerLevel = 2000;
      results.status = 'pass';
      results.details.push({ phase: 'Assessment', result: `✓ Moderate protection (${throttledPercent.toFixed(0)}% throttled)` });
    } else if (throttled > 0 || errors > 0) {
      // Some protection
      results.powerLevel = 1500;
      results.details.push({ phase: 'Assessment', result: `Weak protection (${throttledPercent.toFixed(0)}% throttled)` });
    }

  } catch (error) {
    const errorMsg = formatAxiosError(error);
    results.details.push({ phase: 'Error', result: errorMsg });
    results.debug.error = errorMsg;
  }

  return results;
}

/**
 * Run PCI compliance test
 */
async function testPci(baseUrl, sendUpdate) {
  const results = {
    name: 'PCI Compliance',
    test: 'pci',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  const requiredHeaders = [
    { name: 'X-Frame-Options', expected: ['DENY', 'SAMEORIGIN'] },
    { name: 'X-Content-Type-Options', expected: ['nosniff'] },
    { name: 'Strict-Transport-Security', expected: null }, // Just needs to be present
    { name: 'Content-Security-Policy', expected: null }
  ];

  try {
    // Phase 1: Check security headers
    sendUpdate({ phase: 'Checking security headers...' });
    const response = await axios.get(`${baseUrl}/checkout`, {
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 0
    }).catch(err => {
      if (err.response) return err.response;
      throw err;
    });

    results.debug.responses.push({
      phase: 'headers',
      status: response.status,
      headers: response.headers
    });

    let headersFound = 0;
    for (const header of requiredHeaders) {
      const value = response.headers[header.name.toLowerCase()];
      if (value) {
        if (header.expected === null || header.expected.some(e => value.toUpperCase().includes(e.toUpperCase()))) {
          results.details.push({ phase: header.name, result: `✓ ${value}` });
          results.powerLevel += 500;
          headersFound++;
        } else {
          results.details.push({ phase: header.name, result: `Present but unexpected: ${value}` });
        }
      } else {
        results.details.push({ phase: header.name, result: 'Missing' });
      }
    }

    // Phase 2: Check HTTPS redirect (for HTTP URL)
    sendUpdate({ phase: 'Checking HTTPS enforcement...' });

    // We can only really test this by checking if the original URL was HTTP and got redirected
    // Since we're testing via HTTPS typically, we'll note it
    const isHttps = baseUrl.startsWith('https://');
    if (isHttps) {
      results.details.push({ phase: 'HTTPS', result: '✓ Connection is secure' });
      results.powerLevel += 500;
    } else {
      results.details.push({ phase: 'HTTPS', result: 'Not using HTTPS' });
    }

    // Phase 3: Check that sensitive params in URL are handled
    sendUpdate({ phase: 'Testing sensitive data in URL protection...' });
    const sensitiveResponse = await axios.get(`${baseUrl}/checkout?card=4242424242424242`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'sensitive-url',
      status: sensitiveResponse.status
    });

    if (sensitiveResponse.status === 403 || sensitiveResponse.status === 400) {
      results.details.push({ phase: 'Sensitive URL Params', result: 'Blocked' });
      results.powerLevel += 500;
    } else {
      results.details.push({ phase: 'Sensitive URL Params', result: `Not blocked (${sensitiveResponse.status})` });
    }

    // Determine overall status
    if (results.powerLevel >= 2000) {
      results.status = 'pass';
    }

  } catch (error) {
    const errorMsg = formatAxiosError(error);
    results.details.push({ phase: 'Error', result: errorMsg });
    results.debug.error = errorMsg;
  }

  return results;
}

module.exports = {
  'waf': testWaf,
  'bot': testBot,
  'ddos': testDdos,
  'pci': testPci
};
