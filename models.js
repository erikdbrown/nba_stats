'use strict'
const _ = require('lodash');
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

    get_all(columns) {
        const cols = this._get_columns(columns)
        return client.query(`SELECT ${cols} FROM ${this.table}`)
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

    delete(params) {
        const sets = [];
        const wheres = [];
        const values = [];
        for (let key in updates) {
            values.push(updates[key]);
            sets.push(`${key} = $${values.length}`);
        }
        for (let key in params) {
            values.push(params[key]);
            wheres.push(`${key} = $${values.length}`);
        }
        const query_string = `DELETE FROM ${this.table} WHERE ${wheres.join(' AND ')}`;
        return client.query(query_string, values);
    }

    delete_all() {
        const query_string = `DELETE FROM ${this.table}`;
        return client.query(query_string);
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

class Week extends Model {
    constructor() {
        super('weeks')
    }
}

class Standing extends Model {
    constructor() {
        super('standings')
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

    increment_scores(team_ids) {
        if (!team_ids.length) {
            return Promise.resolve()
        }
        const wheres = _.map(team_ids, (team_id, index) => `id = $${index + 1}`)
        const query_string = `UPDATE ${this.objects.table} SET id = id + 1 WHERE ${wheres.join(' OR ')}`
        return client.query(query_string, team_ids)
    }

    update_scores(team_scores) {
        const update_promise = Promise.resolve()
        _.each(team_scores, (score, team_id) => {
            const query_string = `UPDATE ${this.objects.table} SET wins = $1 WHERE id = $2`
            console.log(query_string)
            update_promise.then(() => {
                return client.query(query_string, [score, Number(team_id)])
            })
        })
        return update_promise
    }
}

module.exports = {
    NBATeam: new NBATeam(),
    PoolTeam: new PoolTeam(),
    Player: new Player(),
    Standing: new Standing(),
    Week: new Week(),
}