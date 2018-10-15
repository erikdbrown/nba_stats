require('dotenv').config();
const express = require('express');
const cheerio = require('cheerio');
const _ = require('lodash');
const body_parser = require('body-parser');
const request = require('request');
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
  const options = {
    method: 'GET',
    url: 'https://www.foxsports.com/nba/standings?season=2018&seasonType=1&grouping=1&advanced=0',
  };

  request(options, (err, response) => {
    if (err) {
      return res.sendStatus(502);
    }
    const $ = cheerio.load(response.body);
    let table_text = $('.wisbb_standardTable').text().match(/(\w+)/g);
    return models.NBATeam.objects.get_all()
        .then(teams => {
          let team_wins = _.reduce(teams, (wins, team) => {
            let index_of_team = _.indexOf(table_text, team.short_name);
            let index_of_score = index_of_team + 1
            let team_wins;
            while (isNaN(Number(team_wins))) {
              team_wins = table_text[index_of_score]
              index_of_score++;
            }
            wins[team.name] = team_wins;
            return wins;
          }, {});
          res.send(team_wins);
        })
        .catch(err => {
          return err
        })
  })
});

app.get('/*', (req, res) => {
  res.send('Welcome to NBA standings. Ping \'/api/scores\' to get updated scores.');
});

function getTeamMap() {
  return {
    CLE: 'Cavaliers',
    GS: 'Warriors',
    BOS: 'Celtics',
    HOU: 'Rockets',
    SA: 'Spurs',
    OKC: 'Thunder',
    POR: 'Trail Blazers',
    WSH: 'Wizards',
    UTA: 'Jazz',
    MIL: 'Bucks',
    DET: 'Pistons',
    MIA: 'Heat',
    DEN: 'Nuggets',
    NO: 'Pelicans',
    TOR: 'Raptors',
    CHA: 'Hornets',
    MIN: 'Timberwolves',
    PHI: '76ers',
    DAL: 'Mavericks',
    LAC: 'Clippers',
    ORL: 'Magic',
    SAC: 'Kings',
    CHI: 'Bulls',
    PHX: 'Suns',
    IND: 'Pacers',
    NY: 'Knicks',
    ATL: 'Hawks',
    MEM: 'Grizzlies',
    LAL: 'Lakers',
    BKN: 'Nets'
  };
}

app.listen(PORT, () => console.log(`running on port ${PORT}`));
