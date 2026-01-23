const { WebSocket } = require('ws');
const dns = require('dns').promises;

// RFC1918 private address ranges
const PRIVATE_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },      // 10.0.0.0/8
  { start: '172.16.0.0', end: '172.31.255.255' },   // 172.16.0.0/12
  { start: '192.168.0.0', end: '192.168.255.255' }  // 192.168.0.0/16
];

function ipToLong(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isPrivateIP(ip) {
  const ipLong = ipToLong(ip);
  return PRIVATE_RANGES.some(range => {
    const startLong = ipToLong(range.start);
    const endLong = ipToLong(range.end);
    return ipLong >= startLong && ipLong <= endLong;
  });
}

/**
 * Test chamber availability via WebSocket
 */
async function testAvailability(baseUrl, sendUpdate) {
  const results = {
    name: 'Chamber Availability',
    test: 'availability',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: {}
  };

  // Extract hostname and port from URL
  let hostname, port;
  try {
    // baseUrl might be https://... or just hostname
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const parsed = new URL(url);
    hostname = parsed.hostname;
    port = parsed.port || '3003';
  } catch (err) {
    results.details.push({ phase: 'Parse URL', result: `Failed: ${err.message}` });
    return results;
  }

  results.debug.hostname = hostname;
  results.debug.port = port;

  sendUpdate({ phase: 'Connecting to Gravity Chamber...' });

  return new Promise((resolve) => {
    const wsUrl = `ws://${hostname}:${port}/chamber`;
    results.debug.wsUrl = wsUrl;

    let ws;
    const timeout = setTimeout(() => {
      if (ws) ws.close();
      results.details.push({ phase: 'Connect', result: 'Timeout - no response within 10s' });
      resolve(results);
    }, 10000);

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      clearTimeout(timeout);
      results.details.push({ phase: 'Connect', result: `Failed: ${err.message}` });
      resolve(results);
      return;
    }

    ws.on('open', () => {
      results.details.push({ phase: 'Connect', result: 'WebSocket connection established' });
      results.powerLevel = 1500;
    });

    ws.on('message', (data) => {
      clearTimeout(timeout);
      try {
        const state = JSON.parse(data.toString());
        results.debug.receivedState = state;

        if (state.chamber && state.chamber.status) {
          results.details.push({ phase: 'State', result: `Received chamber state (status: ${state.chamber.status})` });
          results.powerLevel = 3000;
          results.status = 'pass';
        } else {
          results.details.push({ phase: 'State', result: 'Received data but invalid format' });
        }
      } catch (err) {
        results.details.push({ phase: 'State', result: `Failed to parse: ${err.message}` });
      }
      ws.close();
      resolve(results);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      results.details.push({ phase: 'Connect', result: `Error: ${err.message}` });
      results.debug.error = err.message;
      resolve(results);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (results.powerLevel === 0) {
        results.details.push({ phase: 'Connect', result: 'Connection closed without receiving data' });
      }
      resolve(results);
    });
  });
}

/**
 * Test that FQDN resolves to RFC1918 private address
 */
async function testPrivateNetwork(baseUrl, sendUpdate) {
  const results = {
    name: 'Private Network',
    test: 'private-network',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: {}
  };

  // Extract hostname from URL
  let hostname;
  try {
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const parsed = new URL(url);
    hostname = parsed.hostname;
  } catch (err) {
    results.details.push({ phase: 'Parse URL', result: `Failed: ${err.message}` });
    return results;
  }

  results.debug.hostname = hostname;

  sendUpdate({ phase: 'Resolving FQDN...' });

  try {
    const addresses = await dns.resolve4(hostname);
    results.debug.resolvedAddresses = addresses;

    if (addresses.length === 0) {
      results.details.push({ phase: 'DNS Lookup', result: 'No A records found' });
      return results;
    }

    const ip = addresses[0];
    results.details.push({ phase: 'DNS Lookup', result: `Resolved to ${ip}` });
    results.powerLevel = 1000;

    if (isPrivateIP(ip)) {
      results.details.push({ phase: 'RFC1918 Check', result: `✓ ${ip} is a private address` });
      results.powerLevel = 3000;
      results.status = 'pass';
    } else {
      results.details.push({ phase: 'RFC1918 Check', result: `✗ ${ip} is a public address` });
      results.details.push({ phase: 'Warning', result: 'Chamber should not be publicly accessible' });
    }
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      results.details.push({ phase: 'DNS Lookup', result: `Hostname not found: ${hostname}` });
    } else {
      results.details.push({ phase: 'DNS Lookup', result: `Failed: ${err.message}` });
    }
    results.debug.error = err.message;
  }

  return results;
}

module.exports = {
  'availability': testAvailability,
  'private-network': testPrivateNetwork
};
