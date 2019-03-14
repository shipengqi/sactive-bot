const _ = require('lodash');
const urlencode = require('urlencode');
let url = '';
const request = require('request');
const city = require('./city');

module.exports = robot => {
  robot.$.registerIntegration({
    shortDesc: 'for demo',
    longDesc: 'for demo',
    name: 'demo'
  });

  // get contacts
  const getContacts = msg => {
    let contacts = [];
    _.forEach(robot.contacts, (item, index) => {
      if (item && _.startsWith(item.UserName, '@') && !_.startsWith(item.UserName, '@@') && (item.VerifyFlag & 8) === 0) {
        if (item.NickName !== '' && !item.NickName.includes('</span>')) {
          contacts.push(item.NickName);
        }
      }
    });
    msg.reply(contacts.slice(0, 10).join('\n'));
  };

  robot.$.respond({
    verb: 'get',
    entity: 'users',
    help: 'get users',
    type: 'respond',
    integrationName: 'demo',
    shortDesc: 'get your contacts'
  }, getContacts);

  // say hello
  const sayHello = function(msg) {
    msg.reply('Hi, I\'m robot');
  };

  robot.$.respond({
    verb: 'hello',
    help: 'hello',
    type: 'respond',
    integrationName: 'demo',
    shortDesc: 'say hello'
  }, sayHello);

  // post message
  const postMessage = function(msg) {
    const regex = /([\w\d-]+) (.*)/;
    const matches = regex.exec(msg.match[1]);
    let toUser = matches[1];
    let content = matches[2];
    msg.send(toUser, content);
  };

  robot.$.respond({
    verb: 'post',
    entity: 'message',
    help: 'post message',
    type: 'respond',
    integrationName: 'demo',
    shortDesc: 'short desc',
    parameter: [{
      name: 'username',
      desc: 'The user or group that you want to post message',
      example: 'username'
    }, {
      name: 'message',
      desc: 'The message you want to post',
      example: 'Hello!'
    }]
  }, postMessage);

  // get weather of a city
  const getWeather = msg => {
    console.log('Running test scripts...get weather');
    let regex = /^([\w\d-]+)/;
    let matches = regex.exec(msg.match[1]);
    let cityName = matches[1];
    console.log('-------------------------name');
    console.log(cityName);
    console.log(city[cityName]);
    if (!cityName) {
      console.log('Missing the parameter city name, use default city: shanghai');
      cityName = 'shanghai';
    }
    if (!city[cityName]) {
      return msg.reply(`Sorry, the city ${cityName} is not supported now`);
    }
    let cityEncode = urlencode(city[cityName]);
    let message = '';
    url = 'https://www.tianqiapi.com/api/?version=v1&city=' + cityEncode;
    let options = {
      url: url,
      method: 'get',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
      }
    };
    request(options, (error, response, body) => {
      if (!response || !response.body) {
        console.log('No response from server-----------------');
        console.log(response);
        msg.reply('Sorry, something wrong');
      }
      if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
        let result = response.body;
        if (typeof response.body === 'string') {
          result = JSON.parse(response.body);
        }
        console.log(result);
        // result.data []  length:7 {today, tomorrow...}
        let todayWeatherData = result.data[0];
        let todayIndex = todayWeatherData.index;
        message = `City:    ${result.city}` + '\n' +
          `Date:    ${todayWeatherData.date} ${todayWeatherData.week}` + '\n' +
          `Weather:    ${todayWeatherData.wea}` + '\n' +
          `Temperature:    ${todayWeatherData.tem2}~${todayWeatherData.tem1}` + '\n' +
          `Wind:    ${todayWeatherData.win[0]} ${todayWeatherData.win_speed}` + '\n' +
          `Air Quality Index:    ${todayWeatherData.air}` + '\n' +
          `Air Level:    ${todayWeatherData.air_level}` + '\n' +
          `Air Tips:    ${todayWeatherData.air_tips}` + '\n' +
          `Ultraviolet Index:    ${todayIndex[0].level}` + '\n' +
          `Ultraviolet Tips:    ${todayIndex[0].desc}` + '\n' +
          `Dressing  Index:    ${todayIndex[3].level}` + '\n' +
          `Dressing  Tips:    ${todayIndex[3].desc}` + '\n' +
          `Washing   Index:    ${todayIndex[4].level}` + '\n' +
          `Washing   Tips:    ${todayIndex[4].desc}` + '\n' +
          `Update Time:    ${result.update_time}` + '\n';

        msg.reply(message);
      } else {
        console.log('Error: ------- ------');
        msg.reply('Sorry, something wrong');
      }
    });
  };

  robot.$.respond({
    verb: 'get',
    entity: 'weather',
    help: 'get weather',
    type: 'respond',
    integrationName: 'demo',
    shortDesc: 'get the weather of a city'
  },
  getWeather);
};
