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

  makeBody(to_emails, from_email, subject, message) {
    var str = [
      'Content-Type: text/html; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `to: ${to_emails.join(',')}\n`,
      `from: ${from_email}\n`,
      `subject: ${subject}\n\n`,
      message
    ].join('');

    return new Buffer(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
}

  sendEmail(to_addresses, subject, html_message) {
    return this.get_client()
      .then(gmail => {
        gmail.users.messages.send({
          userId: 'me',
          resource: {
            raw: this.makeBody(
              to_addresses,
              'no-reply@nbascores.com',
              subject,
              html_message
            ),
          }
        });
      });
  }
}

module.exports = {
  GmailAPI: new GmailAPI()
};
