const Client = require('mattermost-client');
const request = require('request');
const querystring = require('querystring');
const TextEncoder = require('text-encoding');
const apiPrefix = '/api/v4';
const tlsverify = !(process.env.MATTERMOST_TLS_VERIFY || '').match(/^false|0|no|off$/i);
const useTLS = !(process.env.MATTERMOST_USE_TLS || '').match(/^false|0|no|off$/i);
const _ = require('lodash');
const ChaUI = require('../../ui/apis');
const usersRoute = '/users';

Client.prototype._apiCall = function(method, path, params, callback, callback_params = {}) {
  let post_data = '';
  if (params !== null) { post_data = JSON.stringify(params); }
  this.logger.debug(post_data);
  let content = new TextEncoder.TextEncoder('utf-8').encode(post_data);
  let options = {
    uri: (useTLS ? 'https://' : 'http://') + this.host + ((this.options.httpPort !== null) ? `:${this.options.httpPort}` : '') + apiPrefix + path,
    method: method,
    json: params,
    rejectUnauthorized: tlsverify,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': content ? content.length : '0'
    }
  };
  if (this.token) { options.headers['Authorization'] = `BEARER ${this.token}`; }
  if (path.includes('/files')) {
    delete options.headers['Content-Type'];
    delete options.headers['Content-Length'];
    delete options.json;
    options.formData = params;
  }
  this.logger.debug(`${method} ${path}`);
  return request(options, (error, res, value) => {
    if (error) {
      // need to verify if res has a value if there's an error...
      if (callback !== null) { return callback({'id': null, 'error': error}, {}, callback_params); }
    } else {
      if (callback !== null) {
        if ((res.statusCode === 200) || (res.statusCode === 201)) {
          if (typeof value === 'string') {
            value = JSON.parse(value);
          }
          return callback(value, res.headers, callback_params);
        } else {
          // TODO: do not stringify response, inject add as an object.
          return callback({'id': res.body.id, 'error': new Error(JSON.stringify({'error_message': res.body.message, 'error_detail': res.body.detailed_error, 'status_code': res.body.status_code}))}, res.headers, callback_params);
        }
      }
    }
  });
};

Client.prototype._chunkMessage = function(msg) {
  let message_limit = 4000;
  let chunks = [];
  chunks = msg.match(new RegExp(`(.|[\r\n]){1,${message_limit}}`, 'g'));
  return chunks;
};

Client.prototype._processMessages = msg =>
  new Promise((resolve, reject) => {
    let resp = {message: msg};
    if (typeof msg === 'string') {
      return resolve(resp);
    }

    if (_.isNil(msg)) {
      return reject(new Error('Found nil message while processing it'));
    }

    if (msg.file_infos) {
      resp.message = 'Upload file success';
      if (msg.file_infos.length < 1) {
        resp.message = 'Upload file failed';
        resp.file_ids = [];
      } else {
        resp.file_ids = msg.file_infos.map(file => file.id);
      }
    } else if (msg instanceof ChaUI.Message) {
      // FIXME: It would be best to refactor this to the module that calls thiss _processMessages method to separate concerns
      resp = ChaUI.private.UnifiedResponseRenderer.render(msg);
    } else {
      resp = msg;
    }
    return resolve(resp);
  })
;

Client.prototype.postMessage = function(msg, channelId) {
  let postData = {
    filenames: [],
    create_at: Date.now(),
    user_id: this.id,
    channel_id: channelId
  };

  return this._processMessages(msg)
    .then(resp => {
      let payload;
      this.logger.debug('Processed message:');
      this.logger.debug(resp);
      postData = _.merge(postData, resp);
      this.logger.debug('Processed message with merged attributes:');
      this.logger.debug(postData);

      let requests = [];
      let payloads = [];
      if (postData.message) {
        // break apart long messages
        let chunks = this._chunkMessage(postData.message);
        this.logger.debug(chunks);

        for (let chunk of Array.from(chunks)) {
          payload = postData;
          payload.message = chunk;
          payloads.push(payload);
        }
      } else {
        payload = postData;
        payloads.push(payload);
      }

      for (payload of Array.from(payloads)) {
        let p = new Promise((resolve, reject) => {
          this.logger.debug(payload);
          return this._apiCall('POST', '/posts', payload, data => {
            if (data.error) {
              this.logger.error(data.error);
              // force authorization errors to become "not found" errors
              // this is needed because mattermost returns authorization errors on both
              // instances and it was decided that the message displayed should be "not found"
              if ((401 === JSON.parse(data.error.message).status_code) || (403 === JSON.parse(data.error.message).status_code)) {
                return reject(new Error('Channel not found'));
              } else {
                return reject(new Error(JSON.parse(data.error.message).error_message));
              }
            }
            this.logger.debug('Posted message.');
            this.logger.debug('----- data');
            this.logger.debug(data);
            return resolve(data);
          });
        });

        requests.push(p);
      }

      return Promise.all(requests)
        .then(values => {
          this.logger.info('--- all postMessage() values');
          this.logger.debug(JSON.stringify(values, ' ', 2));
          return values;
        });
    });
};

Client.prototype.login = function() {
  this.logger.info('Logging in...');
  this._apiCall('POST', usersRoute + '/login', {login_id: this.email, password: this.password}, (data, headers) => {
    this.logger.debug(data);
    if (data && data.error) {
      this.logger.info('Maybe you are running on an unsupported Mattermost version. Please upgrade to version 4.x.');
      this.logger.error(data.error.message);
      process.exit(1);
    }
    this._onLogin(data, headers);
  });
};
