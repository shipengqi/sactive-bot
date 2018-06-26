const {parseString} = require('xml2js');

function unescapeHTML(str) {
  let chars = {
    '&#39;': '\'',
    '&amp;': '&',
    '&gt;': '>',
    '&lt;': '<',
    '&quot;': '"'
  };

  let unescaped = '';

  if (str !== null) {
    let keys = Object.keys(chars)
      .join('|');

    let re = new RegExp(`(${keys})`, 'g');

    unescaped = String(str)
      .replace(re, match => chars[match]);
  }

  return unescaped;
}

function parseXml(str) {
  let unescaped = unescapeHTML(str);
  return callback => parseString(unescaped, callback);
}

module.exports = {
  parseXml,
  unescapeHTML
};