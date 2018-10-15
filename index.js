require('dotenv').config();
const express = require('express');
const _ = require('lodash');
const body_parser = require('body-parser');
const models = require('./models')

const app = express();
const PORT = process.env.PORT || 1182;

app.use(body_parser.json());
app.use((req, res, next) => {
  if (req.headers['server-secret'] !== process.env.SERVER_SECRET) {
    return res.sendStatus(401);
  }
  next();
});

app.get('/api/scores', (req, res) => {
  values = ['short_name', 'name', 'wins']
  return models.NBATeam.objects.get_all(values).then(teams => res.send(teams))
});

app.get('/*', (req, res) => {
  res.send('Welcome to NBA standings. Ping \'/api/scores\' to get updated scores.');
});

app.listen(PORT, () => console.log(`running on port ${PORT}`));
