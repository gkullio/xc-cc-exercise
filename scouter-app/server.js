const express = require('express');
const path = require('path');
const { runTests } = require('./lib/runner');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    message: 'Scouter ready to scan power levels',
    timestamp: new Date().toISOString()
  });
});

// SSE endpoint for scan streaming
app.get('/api/scan/stream', async (req, res) => {
  const { target, fqdn, tests } = req.query;

  if (!target || !fqdn || !tests) {
    return res.status(400).json({ error: 'Missing required parameters: target, fqdn, tests' });
  }

  const testList = tests.split(',');

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  console.log(`SSE scan starting for ${target}: ${fqdn}`);

  // Create a send function that writes to SSE
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runTests(sendEvent, target, fqdn, testList);
  } catch (error) {
    sendEvent({ type: 'error', message: error.message });
  }

  res.end();
});

app.listen(PORT, () => {
  console.log(`Scouter App operational on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/scan/stream (SSE)');
  console.log('  GET  / (static files)');
});
