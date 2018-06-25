const request = require('request');
const urlJoin = require('url-join');
const {
  ENDPOINT
} = require('../../const');
let HTTP_PROXY_ENDPOINT = null;

class MSTeamsClient {
  constructor(robot, chatConnector, clientOpts) {
    this.robot = robot;
    this.chatConnector = chatConnector;
    this.clientOpts = clientOpts;
    this.batch = [];
    this.options = {
      autoBatchDelay: 250
    };
    let http_proxy_endpoint = this.clientOpts.http_proxy_endpoint;
    if (http_proxy_endpoint && http_proxy_endpoint !== ENDPOINT.DEFAULT_HTTP_PROXY_ENDPOINT) {
      HTTP_PROXY_ENDPOINT = http_proxy_endpoint;
    }
    if (this.clientOpts && (typeof this.clientOpts.autoBatchDelay === 'number')) {
      this.options.autoBatchDelay = this.clientOpts.autoBatchDelay;
    }
  }

  // Gets the members of the given conversation.
  // Parameters:
  //      address: Chat connector address. "serviceUrl" property is required.
  //      channel_id: [optional] Conversation whose members are to be retrieved, if not specified, the id is taken from address.conversation.
  // Returns: A list of conversation members.
  getConversationMembers(address, conversationId) {
    // Build request
    conversationId = conversationId || address.conversation.id;
    let path = `/v3/conversations/${conversationId}/members`;
    let options = {
      method: 'GET',
      url: urlJoin(address.serviceUrl, path)
    };

    return sendRequestWithAccessToken(this.robot, this.chatConnector, options);
  }

  postMessage(channelId, message) {
    if (message) {
      let envelope = {
        channelId: channelId,
        message: message
      };
      this.batch.push(envelope);
      return this.startBatch();
    }
  }

  postMessages(channelId, messages) {
    if (!messages) {
      return;
    }

    let list = messages;
    if (!Array.isArray(messages)) {
      list = [messages];
    }

    for (let message of list) {
      let envelope = {
        channelId: channelId,
        message: message
      };
      this.batch.push(envelope);
    }
    this.startBatch();
  }

  startBatch() {
    this.batchStarted = true;
    if (!this.sendingBatch) {
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      this.batchTimer = setTimeout(() => {
        this.sendBatch();
      }, this.options.autoBatchDelay);
    }
  }

  sendBatch() {
    if (this.sendingBatch) {
      this.batchStarted = true;
      return;
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.batchTimer = null;
    let batch = this.batch;
    this.batch = [];
    this.batchStarted = false;
    this.sendingBatch = true;

    if (batch.length > 0) {
      let sendFuncs = batch.map((envelope, index) => {
        let {channelId, message} = envelope;
        if (message.address && message.address.serviceUrl) {
          return () => {
            return send(this.robot, this.chatConnector, message, channelId)
              .catch(error => {
                this.robot.logger.error(error);
              });
          };
        } else {
          return () => {
            this.robot.logger.error('Message is missing address or serviceUrl.');
            Promise.resolve();
          };
        }
      });

      promiseInSeries(sendFuncs)
        .then(() => {
          this.sendingBatch = false;
          if (this.batchStarted) {
            this.startBatch();
          }
        })
        .catch(error => {
          this.robot.logger.error(error);
        });
    }
  }
}

function send(robot, chatConnector, message, channelId) {
  if (!message) {
    return Promise.resolve();
  }

  let path = `/v3/conversations/${channelId}/activities/`;

  let options = {
    method: 'POST',
    // We use urlJoin to concatenate urls. url.resolve should not be used
    // here, since it resolves urls as hrefs are resolved, which could
    // result in losing the last fragment of the serviceUrl.
    url: urlJoin(message.address.serviceUrl, path),
    body: message,
    json: true
  };

  return sendRequestWithAccessToken(robot, chatConnector, options);
}

// Send an authenticated request
function sendRequestWithAccessToken(robot, chatConnector, options) {
  // Add access token
  return getAccessToken(chatConnector, options)
    .then(token => {
      // Execute request
      return new Promise((resolve, reject) => {
        robot.logger.debug(`Sending Message=${JSON.stringify(options, null, 2)}`);

        options.proxy = HTTP_PROXY_ENDPOINT;
        options.headers = {
          'Authorization': `Bearer ${token}`
        };

        request(options, (error, response, body) => {
          if (error) {
            reject(error);
          }

          if (response.statusCode >= 400) {
            let txt = `Request to '${options.url}' failed: [${response.statusCode}] ${response.statusMessage}`;
            reject(new Error(txt));
          }

          let contentType = response.headers['content-type'];
          let contentLength = parseInt(response.headers['content-length']) || 0;
          try {
            if (contentLength > 0 && contentType && contentType.startsWith('application/json')) {
              if (typeof body === 'string') {
                body = JSON.parse(body);
              }
            }
            resolve(body);
          } catch (error1) {
            error = error1;
            if (!(error instanceof Error)) {
              error = new Error(error);
            }
            reject(error);
          }
        });
      });
    });
}

// Add access token to request options
function getAccessToken(chatConnector, options) {
  return new Promise((resolve, reject) => {
    chatConnector.getAccessToken((err, token) => {
      if (err) {
        reject(err);
      }
      resolve(token);
    });
  });
}

function promiseInSeries(providers) {
  let ret = Promise.resolve(null);
  let results = [];

  return providers.reduce(
    (result, provider, index) =>
      result.then(() =>
        provider().then(val => results[index] = val)
      )

    , ret).then(() => results);
}

function clone(obj) {
  if (!obj || (typeof obj !== 'object')) {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof RegExp) {
    let flags = '';
    if (obj.global) { flags += 'g'; }
    if (obj.ignoreCase) { flags += 'i'; }
    if (obj.multiline) { flags += 'm'; }
    if (obj.sticky) { flags += 'y'; }
    return new RegExp(obj.source, flags);
  }

  let newInstance = new obj.constructor();

  for (let key in obj) {
    newInstance[key] = clone(obj[key]);
  }

  return newInstance;
}

module.exports = MSTeamsClient;
