const {google} = require('googleapis');
const {Base64} = require('js-base64');

const {GoogleAuthAPI} = require('./google');

class GmailAPI extends GoogleAuthAPI {
  constructor(GoogleAuth) {
    super();
    this.api_name = 'gmail';
    this.token_path = 'gmail_token.json';
    this.scopes = [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send'
    ];
  }

  authenticate_client(auth) {
    return google.gmail({version: 'v1', auth});
  }

  sendEmail() {
    const message = `From: <>\nTo: <>\nSubject: Subject Text\n\n
      HELLO WORLD
    `;
    return this.get_client()
      .then(gmail => {
        gmail.users.messages.send({
          userId: 'me',
          resource: {
            raw: Base64.encodeURI(message),
          }
        });
      });
  }
}

module.exports = {
  GmailAPI: new GmailAPI()
};
