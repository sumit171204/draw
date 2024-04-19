// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/data', (req, res) => {
  // Handle API request, fetch data from database, etc.
  res.json({ message: 'API response' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
