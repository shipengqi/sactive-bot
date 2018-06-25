const request = require('request');
const _ = require('lodash');
const logger = require('winston');

class RasaNluService {
  constructor(rasaNluEndpoint) {
    this.rasaNluEndpoint = rasaNluEndpoint;
  }

  /**
   * parse the text form rasa-nlu server
   * @param text <string> (required)
   * @param project <string> (optional)
   * @param model <string> (optional)
   * @returns {Promise}
   */
  parseWithNlu(text, project, model) {
    return new Promise((resolve, reject) => {
      let data = {
        q: text
      };

      if (project) {
        data.project = project;
      }

      if (model) {
        data.model = model;
      }

      let params = {
        body: data
      };

      this.apiCall('POST', '/parse', params)
        .then(result => {
          logger.debug('Successfully parse the text from rasa NLU');
          return resolve(result);
        })
        .catch(err => {
          logger.debug(err);
          return reject(err);
        });
    });
  }

  /**
   * @param data <object> training data, json format
   * @param project <string> project name
   * @param model <string> (optional) model name
   * @returns {Promise}
   */
  training(data, project, model) {
    return new Promise((resolve, reject) => {
      let qs = {};
      if (project) {
        qs.project = project;
      }
      if (model) {
        qs.model = model;
      }
      let params = {
        body: data,
        qs: qs
      };

      this.apiCall('POST', '/train', params)
        .then(result => {
          logger.debug('Successfully training the data');
          return resolve(result);
        })
        .catch(err => {
          logger.debug(err);
          return reject(err);
        });
    });
  }

  /**
   * get the currently available projects.      training | ready
   * @returns {Promise}
   */
  getStatus() {
    return new Promise((resolve, reject) => {
      this.apiCall('GET', '/status')
        .then(result => {
          logger.debug('Successfully get the project status');
          return resolve(result);
        })
        .catch(err => {
          logger.debug(err);
          return reject(err);
        });
    });
  }

  /**
   * get the rasa nlu version
   * @returns {Promise}
   */
  getRasaNluVersion() {
    return new Promise((resolve, reject) => {
      this.apiCall('GET', '/version')
        .then(result => {
          logger.debug('Successfully get the RASA NLU version');
          return resolve(result);
        })
        .catch(err => {
          logger.debug(err);
          return reject(err);
        });
    });
  }

  /**
   * get the default model configuration of the RASA NLU instance
   * @returns {Promise}
   */
  getRasaConfiguration() {
    return new Promise((resolve, reject) => {
      this.apiCall('GET', '/config')
        .then(result => {
          logger.debug('Successfully get the RASA NLU configuration');
          return resolve(result);
        })
        .catch(err => {
          logger.debug(err);
          return reject(err);
        });
    });
  }

  apiCall(method, path, params, tokens) {
    return new Promise((resolve, reject) => {
      let bodyData, qs;
      if (params) {
        bodyData = params.body;
        qs = params.qs;
      }
      let postData = '';
      if (bodyData) {
        postData = JSON.stringify(bodyData);
      }

      let options = {
        url: `${this.rasaNluEndpoint}` + path,
        method: method,
        rejectUnauthorized: false,
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json'
        },
        body: postData
      };

      if (qs && typeof qs === 'object') {
        options.qs = qs;
      }

      // add token in headers
      if (tokens !== null) {
        _.forEach(tokens, (value, key) => {
          options.headers[`${key}`] = `${value}`;
        });
      }

      logger.debug(`${method} ${path}`);
      request(options, (error, response, body) => {
        if (error) {
          return reject(error);
        }
        if (_.isString(body)) {
          body = JSON.parse(body);
        }
        if (response.statusCode === 200) {
          return resolve(body);
        } else {
          return reject(body);
        }
      });
    });
  }
}

module.exports = RasaNluService;
