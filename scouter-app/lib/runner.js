const radarTests = require('./tests/radar');
const storeTests = require('./tests/store');
const chamberTests = require('./tests/chamber');

const testSuites = {
  radar: radarTests,
  store: storeTests,
  chamber: chamberTests
};

/**
 * Run tests for a target and stream results via callback
 */
async function runTests(sendEvent, target, fqdn, tests) {
  const suite = testSuites[target];
  if (!suite) {
    sendEvent({
      type: 'error',
      target: target,
      message: `Unknown target: ${target}`
    });
    return;
  }

  // Ensure HTTPS protocol
  let baseUrl = fqdn;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  let totalPowerLevel = 0;
  let maxPossible = 0;

  for (const testName of tests) {
    const testFn = suite[testName];
    if (!testFn) {
      sendEvent({
        type: 'error',
        target: target,
        message: `Unknown test: ${testName}`
      });
      continue;
    }

    // Send test start
    sendEvent({
      type: 'test-start',
      target: target,
      test: testName,
      name: getTestDisplayName(testName)
    });

    // Run test with update callback
    const sendUpdate = (update) => {
      console.log(`[${target}/${testName}] ${update.phase}`);
    };

    try {
      const result = await testFn(baseUrl, sendUpdate);
      result.target = target;
      totalPowerLevel += result.powerLevel;
      maxPossible += getMaxPowerLevel(testName);

      sendEvent({
        type: 'test-result',
        ...result
      });
    } catch (error) {
      sendEvent({
        type: 'test-result',
        target: target,
        test: testName,
        name: getTestDisplayName(testName),
        status: 'fail',
        powerLevel: 0,
        details: [{ phase: 'Error', result: error.message }],
        debug: { error: error.stack }
      });
    }
  }

  // Send scan complete
  sendEvent({
    type: 'scan-complete',
    target: target,
    totalPowerLevel: totalPowerLevel,
    maxPossible: maxPossible,
    message: totalPowerLevel > 9000 ? "IT'S OVER 9000!" : null
  });
}

function getTestDisplayName(testName) {
  const names = {
    'rate-limiting': 'Rate Limiting',
    'oas-validation': 'OAS Validation',
    'performance': 'Global Performance',
    'security': 'API Security',
    'waf': 'WAF Protection',
    'bot': 'Bot Protection',
    'ddos': 'DDoS Mitigation',
    'pci': 'PCI Compliance',
    'availability': 'Chamber Availability',
    'private-network': 'Private Network'
  };
  return names[testName] || testName;
}

function getMaxPowerLevel(testName) {
  const maxLevels = {
    'rate-limiting': 4000,
    'oas-validation': 4000,
    'performance': 3000,
    'security': 3000,
    'waf': 4000,
    'bot': 3100,
    'ddos': 3000,
    'pci': 2500,
    'availability': 3000,
    'private-network': 3000
  };
  return maxLevels[testName] || 3000;
}

module.exports = { runTests };
