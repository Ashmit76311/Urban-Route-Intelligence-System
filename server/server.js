require('dotenv').config();
const express = require('express');
const cors = require('cors');

const navigateRouter = require('./routes/navigate');
const geocodeRouter = require('./routes/geocode');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api', navigateRouter);
app.use('/api', geocodeRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
