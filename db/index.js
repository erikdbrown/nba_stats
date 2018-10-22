const { Pool } = require('pg')

const pool = new Pool({
  // user: 'dbuser',
  connectionString: process.env.DATABASE_URL,
  // database: 'mydb',
  // password: 'secretpassword',
  // port: 3211,
})
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