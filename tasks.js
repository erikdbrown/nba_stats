const _ = require('lodash');
const cheerio = require('cheerio');
const models = require('./models')
const request = require('request-promise-native');
const {SheetsAPI, Sheets} = require('./sheets');
const {GmailAPI} = require('./gmail');

function update_spreadsheet_scores() {
    let old_leaders = null;
    let old_totals = null;
    let spreadsheet = null;
    let old_standings = null;
    let new_leaders = null;
    let new_totals = null
    return SheetsAPI.get_sheet_details(process.env.SPREADSHEET_ID)
      .then(response => {
        spreadsheet = new Sheets(response.data)
        return Promise.all([spreadsheet.get_range('LeaderBoard'), spreadsheet.get_range('TotalWins')])
      })
      .then(_.spread((old_leader_rows, old_total_wins) => {
        old_leaders = old_leader_rows
        old_totals = _.map(old_total_wins, win_total => [Number(win_total)])
        old_standaings = spreadsheet.get_range('Standings')
        return models.NBATeam.objects.get_team_scores();
      }))
      .then(nba_teams => {
        const sorted_teams = sort_nba_teams_by_wins(nba_teams)
        new_leaders = _.map(sorted_teams, row => [_.first(row)])
        new_totals = _.map(sorted_teams, row => [_.last(row)])
        return spreadsheet.update('Standings', sorted_teams)
      })
      .then(() => {
        return update_timestamp(spreadsheet)
      })
      .then(() => {
        return sendLeadChangeEmail(getLeadChange(old_leaders, old_totals, new_leaders, new_totals));
      })
      .then(email_administrator)
      .catch(email_error)
}

function getLeaders(leader_names, totals) {
  var win_total = totals[0][0];
  if (win_total === 0) {
    return [];
  }

  return totals.reduce(function (leaders, total, index) {
    if (total[0] === win_total) {
      leaders.push(leader_names[index][0]);
    }
    return leaders;
  }, []);
}

function getLeaderDifference(old_array, new_array) {
  return new_array.reduce(function (leaders, leader) {
    if (old_array.indexOf(leader) < 0) {
      leaders.push(leader);
    }
    return leaders;
  }, []);
}

function getLeadChange(old_leaders, old_totals, new_leaders, new_totals) {
  var old_win_total = old_totals[0][0];
  var old_win_leaders = getLeaders(old_leaders, old_totals);
  var new_win_leaders = getLeaders(new_leaders, new_totals);
  var new_win_total = new_totals[0][0];

  var fallen_leaders = getLeaderDifference(new_win_leaders, old_win_leaders);
  var added_leaders = getLeaderDifference(old_win_leaders, new_win_leaders);

  if (added_leaders.length || fallen_leaders.length) {
    var incumbent_leaders = new_win_leaders.reduce(function(incumbents, leader) {
      if (old_win_leaders.indexOf(leader) !== -1) {
        incumbents.push(leader);
      }
      return incumbents;
    }, []);

    return {added: added_leaders, incumbents: incumbent_leaders, fallen: fallen_leaders, wins: new_win_total};
  }

  return null;
}

function getNameString(collection) {
  if (collection.length === 1) {
    return collection[0];
  } else if (collection.length === 2) {
    return collection.join(' and ');
  } else {
    var last_index = collection.length - 1;
    return collection.slice(0, last_index).join(', ') + ', and ' + collection[last_index];
  }
}

function getHasOrHave(collection) {
  return collection.length > 1 ? ' have ' : ' has ';
}

function sendLeadChangeEmail(lead_change) {
    if (!lead_change) {
        return
    }
    var subject = 'NBA Wins Pool: There\'s been a LEAD CHANGE!!';
    var body = getEmailParagraphs(lead_change);
    var link_to_spreadsheet = `<p><a href="https://docs.google.com/spreadsheets/d/${process.env.SPREADSHEET_ID}">Here are the standings</a></p>`;
    var greeting = '<p>Good morning,</p>'
    var signoff = '<p>All the best,</p><p>Erik</p>'
    var ps = '<p>PS: This email is auto-generated. If you don\'t want to receive it, just email me back.'
    var email_html = greeting + body + link_to_spreadsheet + signoff + ps;

    return models.Player.objects.get_all(['email'])
        .then(rows => {
            email_addresses = _.map(rows, 'email')
            email_addresses = ['erikdbrown@gmail.com']
            return GmailAPI.sendEmail(email_addresses, subject, email_html);
        })
}

function getEmailParagraphs(lead_change) {
  var fallen_paragraph = '';
  var new_leaders_paragraph = '';
  var incumbent_leader_paragraph = '';

  if (lead_change.fallen.length) {
    if (lead_change.incumbents.length) {
      fallen_paragraph = '<p>' + getNameString(lead_change.fallen) + getHasOrHave(lead_change.fallen) +
        'fallen from the leaders\' circle.</p>'
    }

    fallen_paragraph += '<p>Better luck next time, ' + getNameString(lead_change.fallen) + '!</p>';
  }

  if (lead_change.added.length) {
    if (!lead_change.incumbents.length && !lead_change.fallen.length) {
      new_leaders_paragraph = '<p>After the first day of games, your leaders are ' + getNameString(lead_change.added) + '.</p><p>Good luck everyone!'
    } else {
      new_leaders_paragraph = '<p>There ' + (lead_change.added.length > 1 ? 'are': 'is a') + ' new leader' + (lead_change.added.length > 1 ? 's': '') + '!</p>'
    }
  }

  if (lead_change.incumbents.length) {
    if (!lead_change.added.length) {
      new_leaders_paragraph = '<p>There are no new leaders, but there\'s a change at the top.</p>'
      incumbent_leader_paragraph = '<p>' + getNameString(lead_change.incumbents) + getHasOrHave(lead_change.incumbents) + 'thinned out the leaders\' ' +
        'circle and hold' + (lead_change.incumbents.length > 1 ? '' : 's') + ' on to the lead with ' + lead_change.wins + ' wins.</p>'
    } else {
      incumbent_leader_paragraph = '<p>' + getNameString(lead_change.added) + ' join' + (lead_change.added.length > 1 ? ' ': 's ') +
        getNameString(lead_change.incumbents) + ' in the top spot with ' + lead_change.wins + ' wins each.</p>'
    }
  } else if (lead_change.fallen.length) {
    incumbent_leader_paragraph = '<p>' + getNameString(lead_change.added) + getHasOrHave(lead_change.added) + 'taken down ' + getNameString(lead_change.fallen) + ' to claim the top spot with ' + lead_change.wins + ' wins.</p>'
  }

  return new_leaders_paragraph + incumbent_leader_paragraph + fallen_paragraph;
}

function email_administrator() {
    var now = new Date();
    return GmailAPI.sendEmail(
        [process.env.ADMIN_EMAIL],
        'Scores Updated',
        `The time is: ${now.toString()}`
    );
}

function email_error(error) {
    var now = new Date();
    return GmailAPI.sendEmail(
        [process.env.ADMIN_EMAIL],
        'There was an error updating scores',
        error
    );
}

function sort_nba_teams_by_wins(nba_teams) {
    const by_pool_team = _.groupBy(nba_teams, row => row.pool_name);
    const sheet_rows = _.reduce(by_pool_team, (accumulator, teams, pool_name) => {
        const pool_row = [pool_name];
        let total_wins = 0;
        for (let i = 0; i < teams.length; i++) {
            let team = teams[i];
            let index = team.draft_round + (team.draft_round - 1);
            pool_row[index] = team.team_name;
            pool_row[index + 1] = team.wins;
            total_wins += team.wins;
        }
        pool_row.push(total_wins);
        accumulator.push(pool_row);
        return accumulator;
    }, [])
    return sheet_rows.sort((rowA, rowB) => { return _.last(rowB) - _.last(rowA)})
}

function update_timestamp(spreadsheet) {
    const date = new Date()
    let hours = date.getHours();
    let am_pm = 'PM';
    if (hours > 12) {
        hours = hours - 12;
    } else if (hours < 12) {
        am_pm = 'AM'
    } else {
        hours = 12
    }
    const time_string = `${date.toDateString()} at ${hours}:${date.getMinutes()} ${am_pm}`
    return spreadsheet.update('UpdatedAt', [[time_string]])
}

function update_db_scores() {
    const options = {
        method: 'GET',
        url: 'https://www.foxsports.com/nba/standings?season=2018&seasonType=1&grouping=1&advanced=0',
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
            console.log('Finished updating scores')
        })
        .catch(email_error)
}

function create_teams() {
    const team_map = {
        MIL: 'Bucks',
        TOR: 'Raptors',
        DET: 'Pistons',
        IND: 'Pacers',
        BOS: 'Celtics',
        MIA: 'Heat',
        PHI: '76ers',
        CHA: 'Hornets',
        BKN: 'Nets',
        ATL: 'Hawks',
        ORL: 'Magic',
        CHI: 'Bulls',
        WAS: 'Wizards',
        NYK: 'Knicks',
        CLE: 'Cavaliers',
        GSW: 'Warriors',
        DEN: 'Nuggets',
        NOP: 'Pelicans',
        POR: 'Trail Blazers',
        MEM: 'Grizzlies',
        SAS: 'Spurs',
        UTA: 'Jazz',
        LAC: 'Clippers',
        SAC: 'Kings',
        DAL: 'Mavericks',
        LAL: 'Lakers',
        MIN: 'Timberwolves',
        HOU: 'Rockets',
        PHX: 'Suns',
        OKC: 'Thunder',
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
    create_teams,
    update_db_scores,
    update_spreadsheet_scores,
}
