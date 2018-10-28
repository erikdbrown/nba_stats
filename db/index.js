const { Pool } = require('pg')

let config;
if (process.env.DATABASE_URL) {
  config = {
    connectionString: process.env.DATABASE_URL,
  };
}

const pool = new Pool(config)

pool.query(require('./model_string'), (error, resposne) => {
    if (error) {
        console.log(error)
    } else {
        console.log('created tables')
    }
})

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  }
}