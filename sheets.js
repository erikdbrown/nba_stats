const util = require('util');

const {google} = require('googleapis');

const {GoogleAuth} = require('./google');


class Sheets extends GoogleAuth {
  constructor(GoogleAuth) {
    super();
    this.api_name = 'sheets';
    this.token_path = 'sheets_token.json';
    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ];
  }

  authenticate_client(auth) {
    return google.sheets({version: 'v4', auth});
  }

  get(sheet_id, range) {
    return this.get_client()
      .then(sheets => {
        sheets.spreadsheets.values.get = util.promisify(sheets.spreadsheets.values.get);
        return sheets.spreadsheets.values.get({
          spreadsheetId: sheet_id,
          range: range,
        });
      })
      .catch(err => console.log(`There was an error retrieving spreadsheet: ${err}`));
  }
}

module.exports = {
  Sheets: new Sheets()
};
