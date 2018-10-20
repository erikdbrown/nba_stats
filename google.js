const fs = require('fs');
const util = require('util');
fs.readFile = util.promisify(fs.readFile);
fs.writeFile = util.promisify(fs.writeFile);

const readline = require('readline-promise');
const {google} = require('googleapis');


class GoogleAuth {
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
    return fs.readFile('credentials.json')
      .then(content => JSON.parse(content)[this.api_name])
      .catch(err => console.log(`Error loading ${this.api_name} client secret file:, ${err}`));
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
        return fs.readFile(this.token_path);
      })
      .then(token => {
        this.oAuth2Client.setCredentials(JSON.parse(token));
        return this.oAuth2Client;
      })
      .catch(err => this.getNewToken());
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
        return fs.writeFile(this.token_path, JSON.stringify(token));
    })
    .catch(err => console.log(`There was an error generating a new token: ${err}`));
  }
}

module.exports = {
  GoogleAuth,
};