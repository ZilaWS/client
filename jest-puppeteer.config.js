module.exports = {
  launch: {
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  },
  browserContext: 'default'
};