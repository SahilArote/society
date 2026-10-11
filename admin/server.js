const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3006;

// Serve static build from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: Route all frontend requests to dist/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Society App (Landing & Admin) live on port ${PORT}`);
});
