const _ = require('lodash');
const fs = require('fs');
const util = require('util');
fs.readFile = util.promisify(fs.readFile);
fs.writeFile = util.promisify(fs.writeFile);

const readline = require('readline-promise');
const {google} = require('googleapis');
const credentials = require('./credentials');
const client = require('./db');


class GoogleAuthAPI {
  constructor() {
    this.client = null
  }

  authenticate_client(auth) {
    throw Error('Need to implement get_client')
  }

  get_client() {
    return Promise.resolve(this.client)
      .then(client => {
        if (client) {
          return this.client;
        }
        return this.authorize().then(auth => {
          this.client = this.authenticate_client(auth);
          return this.client;
        });
      });
  }

  getCredentials() {
    return JSON.parse(credentials[this.api_name]);
  }

  refreshToken() {
    return this.oAuth2Client.refreshAccessToken()
        .then(response => {
          const token = response.credentials
          query_string = `UPDATE tokens SET token = $1 WHERE api_name = ${this.api_name};`
          return Promise.all([
            token,
            client.query(query_string, token)
          ])
        })
        .then(_.spread((token, results) => {
          return token;
        }))
  }
  
  authorize() {
    return Promise.resolve(this.oAuth2Client)
      .then(client => {
        if (client) {
          return this.oAuth2Client;
        }
        return this.getCredentials();
      })
      .then(credentials => {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        const query_string = `SELECT token FROM tokens WHERE api_name = $1`
        return client.query(query_string, [this.api_name])
      })
      .then(results => {
        const tokens = results.rows;
        if (tokens && !tokens.length) {
          return this.getNewToken();
        }
        const parsed_token = JSON.parse(tokens[0].token)
        if (Date.now() > parsed_token.expiry_date) {
          return this.refreshToken();
        }
        return parsed_token;
      })
      .then(token => {
        this.oAuth2Client.setCredentials(token);
        return this.oAuth2Client;
      })
      .catch(err => console.log(err));
  }

  getNewToken() {
    const rl = readline.default.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return Promise.resolve(this.oAuth2Client)
    .then(oAuth2Client => {
      if (oAuth2Client) {
        return
      }
      return this.getCredentials()
        .then(credentials => {
          const {client_secret, client_id, redirect_uris} = credentials.installed;
          this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        })
      })
    .then(() => {
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.scopes,
      });
      console.log('Authorize this app by visiting this url:', authUrl);
      return rl.questionAsync('Enter the code from that page here: ');
    })  
    .then(code => {
      rl.close();
      this.oAuth2Client.getToken = util.promisify(this.oAuth2Client.getToken);
      return this.oAuth2Client.getToken(code);
    })
    .then(token => {
        this.oAuth2Client.setCredentials(token);
        const query_string = `INSERT INTO tokens (api_name, token, refresh_token) VALUES ($1, $2, $3)`;
        return Promise.all([
          token,
          client.query(query_string, [this.api_name, JSON.stringify(token), token.refresh_token])
        ])
    })
    .then(_.spread((token, results) => token))
    .catch(err => console.log(`There was an error generating a new token: ${err}`));
  }
}

module.exports = {
  GoogleAuthAPI,
};