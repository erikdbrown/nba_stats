const _ = require('lodash');
const cheerio = require('cheerio');
const models = require('./models')
const request = require('request-promise-native');

function update_scores() {
    const options = {
        method: 'GET',
        url: 'https://www.foxsports.com/nba/standings?season=2017&seasonType=1&grouping=1&advanced=0',
      };

      return request(options)
        .then(response => {
            const $ = cheerio.load(response);
            let table_text = $('.wisbb_standardTable').text().match(/(\w+)/g);
            return Promise.all([
                table_text,
                models.NBATeam.objects.get_all()
            ]);
        })
        .then(_.spread((table_text, teams) => {
            const winning_ids = _.reduce(teams, (winning_team_ids, team) => {
                let index_of_team = _.indexOf(table_text, team.short_name);
                let index_of_score = index_of_team + 1
                let team_wins = NaN;
                while (isNaN(Number(team_wins))) {
                    team_wins = table_text[index_of_score]
                    index_of_score++;
                }
                if (Number(team_wins) - team.wins !== 0) {
                    if (Number(team_wins) - team.wins === 1) {
                        winning_team_ids.increments.push(team.id)
                    } else {
                        winning_team_ids.updates[team.id] = Number(team_wins)
                    }
                }
                return winning_team_ids;
            }, {increments: [], updates: {}});
            return Promise.all([
                models.NBATeam.increment_scores(winning_ids.increments),
                models.NBATeam.update_scores(winning_ids.updates)
            ])
        }))
        .then(result => {
            console.log('done')
        })
        .catch(err => {
            // email with error
            console.log(err)
        })
}

function create_teams() {
    const team_map = {
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

    const promise_chain = Promise.resolve()
    for (let short_name in team_map) {
        promise_chain.then(() => {
            models.NBATeam.objects.get_or_create({
                name: team_map[short_name],
                short_name: short_name
            })
        })
    }
}

module.exports = {
    update_scores,
    create_teams
}
