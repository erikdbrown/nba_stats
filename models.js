'use strict'
const client = require('./db')

class Model {
    constructor(table) {
        this.objects = new Manager(table)
    }
}

class Manager {
    constructor(table) {
        this.table = table
    }

    _get_columns(columns=[]) {
        if (!columns.length) {
            return '*'
        } 
        return columns.join(',')
    }

    _get_where(params={}) {
        const wheres = []
        const values = []
        for (let key in params) {
            values.push(params[key])
            wheres.push(`${key} = $${values.length}`)
        }
        if (!wheres.length) {
            return ''
        }
        return {
            text: `WHERE ${wheres.join(' AND ')}`,
            values: values
        }
    }

    get_all() {
        return client.query(`SELECT * FROM ${this.table}`)
            .then(results => results.rows)
    }

    get(params, columns) {
        return this.get_or_create(params, columns, false)
    }

    get_or_create(params, columns, create=true) {
        const cols = this._get_columns(columns)
        const where = this._get_where(params)
        const query_string = `SELECT ${cols} FROM ${this.table} ${where.text};`
        return client.query(query_string, where.values).then(response => {
            if (!response.rows[0] && create) {
                return this.create(params)
            }
            return response.rows[0]
        }).catch(err => {
            throw err
        })
    }

    filter(params, columns) {
        const cols = this._get_columns(columns)
        const where = this._get_where(params)
        const query_string = `SELECT ${cols} FROM ${this.table} ${where.text};`
        return client.query(query_string, where.values)
    }

    create(params) {
        const columns = []
        const values = []
        const values_index = []
        for (let key in params) {
            columns.push(key)
            values_index.push(`$${columns.length}`)
            values.push (params[key])
        }
        const query_string = `INSERT INTO ${this.table} (${columns.join(',')}) VALUES (${values_index.join(',')}) RETURNING *`
        return client.query(query_string, values).then(result => result.rows[0])
    }

    update(params, updates) {
        const sets = []
        const wheres = []
        const values = []
        for (let key in updates) {
            values.push(updates[key])
            sets.push(`${key} = $${values.length}`)
        }
        for (let key in params) {
            values.push(params[key])
            wheres.push(`${key} = $${values.length}`)
        }
        const query_string = `UPDATE ${this.table} SET ${sets.join(', ')} WHERE ${wheres.join(' AND ')}`
        return client.query(query_string, values)
    }
}


class PoolTeam extends Model {
    constructor() {
        super('pool_teams')
    }
}

class Player extends Model {
    constructor() {
        super('players')
    }
}

class Win extends Model {
    constructor() {
        super('wins')
    }
}


class NBATeam extends Model {
    constructor() {
        super('nba_teams')
    }

    assign_to(nba_team_name, pool_team_name) {
        return new PoolTeam().objects.get({name: pool_team_name}, ['id'])
            .then(result => {
                if (!result) {
                    throw Error(`${pool_team_name} does not exist`)
                }
                return this.objects.update(
                    {name: nba_team_name},
                    {pool_team: result.id}
                )
            })
    }

    create_teams() {
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
                this.objects.get_or_create({
                    name: team_map[short_name],
                    short_name: short_name
                })
            })
        }
    }
}

module.exports = {
    PoolTeam: new PoolTeam(),
    Player: new Player(),
    NBATeam: new NBATeam(),
    Win: new Win(),
}