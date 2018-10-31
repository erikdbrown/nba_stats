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
    return JSON.parse(credentials[this.api_name]).installed
  }

  getTokenCredentials() {
    const query_string = `SELECT token FROM tokens WHERE api_name = $1`;
    return client.query(query_string, [this.api_name])
      .then(response => {
        const tokens = response.rows;
        if (tokens && !tokens.length) {
          return this.getNewToken();
        }
        const parsed_token = JSON.parse(tokens[0].token);
        if (!parsed_token.refresh_token && tokens[0].refresh_token) {
          parsed_token['refresh_token'] = tokens[0].refresh_token;
        }
        return parsed_token;
      })
      .then(token => {
        return _.assign(token, this.getCredentials());
      })
  }
  
  authorize() {
    return Promise.resolve(this.oAuth2Client)
      .then(client => {
        if (client) {
          return this.oAuth2Client;
        }
        return this.getTokenCredentials();
      })
      .then(credentials => {
        const {client_secret, client_id, redirect_uris} = credentials;
        this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        this.oAuth2Client.setCredentials(credentials);
        return this.oAuth2Client.getAccessTokenAsync()
      })
      .then(() => this.saveToken)
      .then(() => this.oAuth2Client)
      .catch(err => console.log(err));
  }

  saveToken(auth_response) {
    const token = auth_response.res.data
    const refresh_token = token.refresh_token;
    const stringified_token = JSON.stringify(token);
    let query_string;
    let values;
    if (refresh_token.length) {
      query_string = `UPDATE tokens SET (refresh_token, token) VALUES ($1, $2) WHERE api_name = $3`;
      values = [refresh_token, stringified_token, this.api_name];
    } else {
      query_string = `UPDATE tokens SET (token) VALUES ($1) WHERE api_name = $2`;
      values = [stringified_token, this.api_name];
    }

    return client.query(query_string, values);
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
      const credentials = this.getCredentials();
      const {client_secret, client_id, redirect_uris} = credentials;
      this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
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