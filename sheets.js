const _ = require('lodash');
const util = require('util');

const {google} = require('googleapis');

const {GoogleAuthAPI} = require('./google');


class Sheets {
  constructor(sheet) {
    this.spreadsheet = sheet
  }

  update(range, rows) {
    return new SheetsAPI().update_sheet(
      this.spreadsheet.spreadsheetId,
      this.get_range_string({name: range}),
      rows
    )
  }

  get_sheet(params) {
    return _.get(_.find(this.spreadsheet.sheets, {properties: params}), 'properties');
  }

  get_range_string(params) {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const range_details = _.find(this.spreadsheet.namedRanges, params);
    if (range_details) {
      const range = range_details.range
      const sheet_name = _.get(this.get_sheet({sheetId: range.sheetId}), 'title');
      const starting_cell = `${alpha[range.startColumnIndex]}${range.startRowIndex + 1}`
      const ending_cell = `${alpha[range.endColumnIndex - 1]}${range.endRowIndex}`
      return `${sheet_name}!${starting_cell}:${ending_cell}`;
    } 
  }

  get_range(range_name) {
    return new SheetsAPI().get_sheet_values(
      this.spreadsheet.spreadsheetId,
      this.get_range_string({name: range_name})
    )
  }
}

class SheetsAPI extends GoogleAuthAPI {
  constructor() {
    super();
    this.api_name = 'sheets';
    this.token_path = 'sheets_token.json';
    this.scopes = [
      'https://www.googleapis.com/auth/spreadsheets'
    ];
  }

  authenticate_client(auth) {
    return google.sheets({version: 'v4', auth});
  }

  update_sheet(sheet_id, range, data=[]) {
    return this.get_client()
      .then(sheets => {
        sheets.spreadsheets.values.update = util.promisify(sheets.spreadsheets.values.update);
        const body = {
          range: range,
          majorDimension: 'ROWS',
          values: data
        }
        const params = {
          spreadsheetId: sheet_id,
          range: range,
          valueInputOption: 'USER_ENTERED',
          resource: body,
        }
        return sheets.spreadsheets.values.update(params)
      })
      .then(response => {
        return response.data
      });
  }

  get_sheet_details(sheet_id) {
    return this.get_client()
      .then(sheets => {
        sheets.spreadsheets.get = util.promisify(sheets.spreadsheets.get);
        return sheets.spreadsheets.get({
          spreadsheetId: sheet_id
        });
      })
  }

  get_sheet_values(sheet_id, range) {
    return this.get_client()
      .then(sheets => {
        sheets.spreadsheets.values.get = util.promisify(sheets.spreadsheets.values.get);
        return sheets.spreadsheets.values.get({
          spreadsheetId: sheet_id,
          range: range
        });
      })
      .then(response => {
        return response.data.values
      })
  }
}

module.exports = {
  SheetsAPI: new SheetsAPI(),
  Sheets
};
