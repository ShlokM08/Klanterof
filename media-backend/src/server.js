require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initSchema } = require('./db');
const authRoutes = require('./auth');
const media = require('./media'); // { router, streamHandler }

(async () => {
  await initSchema();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => res.json({ ok: true }));

  app.use('/auth', authRoutes);
  app.use('/media', media.router);
  app.get('/stream/:id', media.streamHandler);

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`API running at http://localhost:${port}`));
})();
