const axios = require('axios');

// Test configurations
const RATE_LIMIT_REQUESTS = 50;
const RATE_LIMIT_WINDOW_MS = 2000;

/**
 * Run rate limiting test
 */
async function testRateLimiting(baseUrl, sendUpdate) {
  const results = {
    name: 'Rate Limiting',
    test: 'rate-limiting',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/api/radar/scan`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'verify',
      status: normalResponse.status,
      headers: normalResponse.headers
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Normal request succeeded' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Attack - Rapid requests
    sendUpdate({ phase: 'Sending rapid requests to trigger rate limiting...' });

    const rapidPromises = [];
    for (let i = 0; i < RATE_LIMIT_REQUESTS; i++) {
      rapidPromises.push(
        axios.get(`${baseUrl}/api/radar/scan`, {
          timeout: 10000,
          validateStatus: () => true
        }).catch(err => ({ status: 0, error: err.message }))
      );
    }

    // Wait for rate limit window
    await new Promise(resolve => setTimeout(resolve, 100));

    const rapidResponses = await Promise.all(rapidPromises);
    const blocked = rapidResponses.filter(r => r.status === 429).length;
    const succeeded = rapidResponses.filter(r => r.status === 200).length;

    results.debug.responses.push({
      phase: 'attack',
      total: rapidResponses.length,
      blocked: blocked,
      succeeded: succeeded
    });

    if (blocked > 0) {
      results.details.push({ phase: 'Attack', result: `${blocked}/${RATE_LIMIT_REQUESTS} requests blocked (429)` });
      results.powerLevel += Math.min(blocked * 50, 3000);
      results.status = 'pass';
    } else {
      results.details.push({ phase: 'Attack', result: `No requests blocked - rate limiting not configured` });
    }

  } catch (error) {
    const errorMsg = formatAxiosError(error);
    results.details.push({ phase: 'Error', result: errorMsg });
    results.debug.error = errorMsg;
  }

  return results;
}

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
 * Run OAS validation test
 * Tests that F5 XC is enforcing OpenAPI spec by blocking undocumented endpoints
 */
async function testOasValidation(baseUrl, sendUpdate) {
  const results = {
    name: 'OAS Validation',
    test: 'oas-validation',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify documented endpoint works
    sendUpdate({ phase: 'Verifying documented endpoint (/api/radar/scan)...' });
    const validResponse = await axios.get(`${baseUrl}/api/radar/scan`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'documented-endpoint',
      url: '/api/radar/scan',
      status: validResponse.status
    });

    if (validResponse.status === 200) {
      results.details.push({ phase: 'Documented endpoint', result: '200 OK - /api/radar/scan accessible' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Documented endpoint', result: `${validResponse.status} - /api/radar/scan failed` });
      return results;
    }

    // Phase 2: Test undocumented endpoint (should be blocked by OAS enforcement)
    sendUpdate({ phase: 'Testing undocumented endpoint (/api/radar/shadow-protocol)...' });
    const shadowResponse = await axios.get(`${baseUrl}/api/radar/shadow-protocol`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'undocumented-endpoint',
      url: '/api/radar/shadow-protocol',
      status: shadowResponse.status,
      headers: shadowResponse.headers
    });

    if (shadowResponse.status === 403) {
      results.details.push({ phase: 'Shadow endpoint', result: 'Blocked (403) - OAS enforcement active' });
      results.powerLevel += 3000;
      results.status = 'pass';
    } else if (shadowResponse.status === 200) {
      results.details.push({ phase: 'Shadow endpoint', result: '200 OK - Not blocked (OAS enforcement not configured)' });
      results.details.push({ phase: 'Action needed', result: 'Upload OpenAPI spec to F5 XC and enable enforcement' });
    } else {
      results.details.push({ phase: 'Shadow endpoint', result: `${shadowResponse.status} - Unexpected response` });
    }

  } catch (error) {
    const errorMsg = formatAxiosError(error);
    results.details.push({ phase: 'Error', result: errorMsg });
    results.debug.error = errorMsg;
  }

  return results;
}

/**
 * Run global performance test
 */
async function testPerformance(baseUrl, sendUpdate) {
  const results = {
    name: 'Global Performance',
    test: 'performance',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    sendUpdate({ phase: 'Measuring response time...' });

    // Take multiple measurements
    const timings = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const response = await axios.get(`${baseUrl}/api/radar/scan`, {
        timeout: 10000,
        validateStatus: () => true
      });
      const elapsed = Date.now() - start;
      timings.push(elapsed);

      results.debug.responses.push({
        attempt: i + 1,
        status: response.status,
        timing: elapsed,
        headers: {
          'x-response-time': response.headers['x-response-time'],
          'x-edge-location': response.headers['x-edge-location'],
          'server': response.headers['server']
        }
      });
    }

    const avgTime = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
    const minTime = Math.min(...timings);

    results.details.push({ phase: 'Average latency', result: `${avgTime}ms` });
    results.details.push({ phase: 'Best latency', result: `${minTime}ms` });

    // Score based on latency
    if (avgTime < 50) {
      results.powerLevel = 3000;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: '✓ Excellent (<50ms)' });
    } else if (avgTime < 100) {
      results.powerLevel = 2500;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: '✓ Good (<100ms)' });
    } else if (avgTime < 150) {
      results.powerLevel = 2000;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: '✓ Acceptable (<150ms)' });
    } else if (avgTime < 200) {
      results.powerLevel = 1500;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: 'Marginal (<200ms)' });
    } else {
      results.powerLevel = 500;
      results.details.push({ phase: 'Rating', result: 'Poor (>200ms)' });
    }

  } catch (error) {
    const errorMsg = formatAxiosError(error);
    results.details.push({ phase: 'Error', result: errorMsg });
    results.debug.error = errorMsg;
  }

  return results;
}

/**
 * Run API security test
 */
async function testSecurity(baseUrl, sendUpdate) {
  const results = {
    name: 'API Security',
    test: 'security',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/api/radar/scan`, {
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

    // Phase 2: Attack - SQL injection in path
    sendUpdate({ phase: 'Testing SQL injection protection...' });
    const sqlResponse = await axios.get(`${baseUrl}/api/radar/ball/1' OR '1'='1`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'sql-injection',
      url: `/api/radar/ball/1' OR '1'='1`,
      status: sqlResponse.status
    });

    if (sqlResponse.status === 403 || sqlResponse.status === 400) {
      results.details.push({ phase: 'SQL Injection', result: `Blocked (${sqlResponse.status})` });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'SQL Injection', result: `Not blocked (${sqlResponse.status})` });
    }

    // Phase 3: Attack - Path traversal
    sendUpdate({ phase: 'Testing path traversal protection...' });
    const pathResponse = await axios.get(`${baseUrl}/api/radar/../../etc/passwd`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'path-traversal',
      url: `/api/radar/../../etc/passwd`,
      status: pathResponse.status
    });

    if (pathResponse.status === 403 || pathResponse.status === 400) {
      results.details.push({ phase: 'Path Traversal', result: `Blocked (${pathResponse.status})` });
      results.powerLevel += 500;
    } else {
      results.details.push({ phase: 'Path Traversal', result: `Not blocked (${pathResponse.status})` });
    }

    // Phase 4: Attack - Oversized header
    sendUpdate({ phase: 'Testing oversized header protection...' });
    try {
      const oversizedResponse = await axios.get(`${baseUrl}/api/radar/scan`, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'X-Custom-Header': 'A'.repeat(10000)
        }
      });

      results.debug.responses.push({
        phase: 'oversized-header',
        status: oversizedResponse.status
      });

      if (oversizedResponse.status === 403 || oversizedResponse.status === 431) {
        results.details.push({ phase: 'Oversized Header', result: `Blocked (${oversizedResponse.status})` });
        results.powerLevel += 500;
      } else {
        results.details.push({ phase: 'Oversized Header', result: `Not blocked (${oversizedResponse.status})` });
      }
    } catch (err) {
      // Connection reset or similar might indicate blocking
      if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
        results.details.push({ phase: 'Oversized Header', result: 'Blocked (connection reset)' });
        results.powerLevel += 500;
      } else {
        results.details.push({ phase: 'Oversized Header', result: `Error: ${err.message}` });
      }
    }

    // Determine overall status
    if (results.powerLevel >= 2500) {
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
  'rate-limiting': testRateLimiting,
  'oas-validation': testOasValidation,
  'performance': testPerformance,
  'security': testSecurity
};
