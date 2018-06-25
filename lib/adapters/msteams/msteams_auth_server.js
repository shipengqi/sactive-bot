const request = require('request');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const {
  BOT_SCOPES,
  COMMON_TENANT,
  DAY_IN_MILLISECONDS,
  LOG_MSTEAMS_AUTH_PREFIX,
  TOKEN_ENDPOINT,
  LOGIN_ENDPOINT,
  LOGOUT_ENDPOINT,
  ADMIN_CONSENT_ENDPOINT,
  ADMIN_TOKEN_ENDPOINT,
  ADMIN_CONSENT_URI,
  OPEN_ID_CONFIGURATION_URI
} = require('./constants');

const HTTP_PROXY_ENDPOINT = process.env.http_proxy || process.env.https_proxy || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || null;

// AsyncCache is used to store key-value pairs and refresh them
//  when they expire using a load operation. The load operation
//  is asynchronous so the get function is also asynchronous.
class AsyncCache {
  // Creates the AsyncCache with a place to store key-values.
  constructor() {
    this.cache = {};
  }

  // Sets a value onto the cache.
  //  The value can be just a raw value or it can be an object with
  //  a loadOperation parameter to refresh the value.
  set(key, options) {
    if (key) {
      this.cache[key] = options;
    }
  }

  // Removes a key-value pair from the cache.
  clear(key) {
    if (key) {
      this.cache[key] = null;
    }
  }

  // Asynchronous operation to fetch a value from the cache.
  //  This operation returns a Promise if callback is null,
  //  otherwise callback is called with the value for the key
  //  or an error if one occured.
  get(key, callback) {
    let promise = new Promise((resolve, reject) => {
      if (!key) {
        return;
      }

      let datum = this.cache[key];

      // No value at all; return null
      if (!datum) {
        return resolve(null);
      }

      // There is a value and it is not expired; return the value
      if (datum.value && (!datum.expires || (datum.expires > Date.now()))) {
        return resolve(datum.value);
      }

      // The value wasn't there or it was expired; if there is a
      //  loadOperation try to run it to get the value
      if (datum.loadOperation) {
        let expires = null;
        if (datum.duration) {
          expires = Date.now() + datum.duration;
        }
        return datum.loadOperation((value, error) => {
          if (error) {
            return reject(error);
          }

          datum.value = value;
          datum.expires = expires;
          return resolve(value);
        });
      }

      // The value is expired and there is no loadOperation; return null
      return resolve(null);
    });

    // If there is a callback; resolve the promise using it
    if (callback) {
      return promise
        .then(value => callback(null, value))
        .catch(error => callback(error));
    }
    return promise;
  }
}

// The MSTeamsAuthServer class registers routes that handle the
//  authentication and admin consent flows.
class MSTeamsAuthServer {
  // Creates a new MSTeamsAuthServer with the robot and config
  //  provided.
  constructor(robot, loginCallback, config) {
    this.robot = robot;
    this.loginCallback = loginCallback;
    this.config = config;
    if (!this.config) {
      throw new Error('Argument \'config\' is undefined.');
    }
    if (!this.config.ms_app_id) {
      throw new Error('MS Teams config does not provide \'ms_app_id\'.');
    }
    if (!this.config.ms_app_password) {
      throw new Error('MS Teams config does not provide \'ms_app_password\'.');
    }
    if (!this.config.host) {
      throw new Error('MS Teams config does not provide\'host\'');
    }

    this.scopes = BOT_SCOPES.join('%20');
    this.openIdConfigurationUri =
      this.config.open_id_configuration_uri.replace('{tenant}', this.config.tenant_id);
    this.adminConsentUri =
      this.config.admin_consent_uri.replace('{tenant}', this.config.tenant_id);
  }

  // Starts the MSTeamsAuthServer. Sets up the cache and registers routes
  initialize() {
    this.robot.logger.info(`${LOG_MSTEAMS_AUTH_PREFIX} Initializing`);
    this._setupCache();
    this._setupRoutes();
  }

  // Returns the Login URI to send users to.
  getAuthorizeUri() {
    return `${this.config.host}${this.config.login_endpoint}`;
  }

  // Returns the Admin Consent URI to get admins to consent to the bot.
  getAdminConsentUri() {
    return `${this.config.host}${this.config.admin_consent_endpoint}`;
  }

  refreshToken(refreshToken, callback) {
    this._getUserAndTokensFromRefreshToken(refreshToken)
      .then(userAndTokens => {
        this.loginCallback(userAndTokens.id, userAndTokens.tokens);
        return callback(null, userAndTokens.tokens.access_token);
      })
      .catch(error => callback(error));
  }

  // Initializes the cache and sets the key-values that we will require
  //  to operate.
  _setupCache() {
    let options;
    this.cache = new AsyncCache();

    // The openIdConfig returns a bunch of information about how to
    //  authenticate that we use to redirect users to, etc.
    this.cache.set(
      'openIdConfig', {
        duration: this.config.open_id_config_cache_duration,
        loadOperation: done => {
          return new Promise((resolve, reject) => {
            options = {
              url: this.openIdConfigurationUri,
              proxy: HTTP_PROXY_ENDPOINT
            };
            return request(options, (error, res, body) => {
              if (error || (res && res.statusCode !== 200)) {
                return reject(`Resource ${this.openIdConfigurationUri} responded with statusCode=${(res ? res.statusCode : undefined)} error=${error}`);
              }
              let openIdConfig = null;
              try {
                openIdConfig = JSON.parse(body);
              } catch (exception) {
                return reject(`Response from resource ${this.openIdConfigurationUri} was not valid JSON. exception=${exception}`);
              }
              return resolve(openIdConfig);
            });
          })
            .then(openIdConfig => done(openIdConfig))
            .catch(error => done(null, error));
        }
      }
    );

    // The keys are used to verify that the id_tokens we get are valid
    //  and signed by the proper issuer.
    this.cache.set(
      'keys', {
        duration: this.config.open_id_cert_cache_duration,
        loadOperation: done => {
          // We fetch the URL to get the keys from by first fetching the
          //  openIdConfig.
          return this.cache.get('openIdConfig')
            .then(openIdConfig => {
              if (!(openIdConfig ? openIdConfig.jwks_uri : undefined)) {
                return Promise.reject('A valid JWT key endpoint was not returned with the OpenId configuration.');
              }
              return new Promise((resolve, reject) => {
                options = {
                  url: openIdConfig.jwks_uri,
                  proxy: HTTP_PROXY_ENDPOINT
                };
                return request(options, (error, res, body) => {
                  if (error || ((res ? res.statusCode : undefined) !== 200)) {
                    return reject(`Resource ${openIdConfig.jwks_uri} responded with statusCode=${(res ? res.statusCode : undefined)} error=${error}`);
                  }
                  let keys = null;
                  try {
                    ({ keys } = JSON.parse(body));
                  } catch (exception) {
                    return reject(`Response from resource ${openIdConfig.jwks_uri} was not valid JSON. exception=${exception}`);
                  }

                  return resolve(keys);
                });
              });
            })
            .then(keys => done(keys))
            .catch(error => done(null, error));
        }
      }
    );
  }

  // #
  // Sets up the routes that this class uses to redirect users for
  //  login and admin consent.
  // #
  _setupRoutes() {
    // The admin consent endpoint is where we redirect admins to consent
    //  to the bot. This is a fairly thin wrapper that redirects users
    //  to AAD.
    let parameters;
    this.robot.router.get(this.config.admin_consent_endpoint, (req, res) => {
      // The state is set on the user's browser's cookies and also passed
      //  to AAD. It is later returned and the browser's cookies are compared
      //  against it to make sure there were no cross-site malicious attacks.
      return this._createState()
        .then(state => {
          parameters = {
            client_id: this.config.ms_app_id,
            redirect_uri: `${this.config.host}${this.config.admin_token_endpoint}`,
            state
          };
          parameters = Object.keys(parameters).map(key => `${key}=${parameters[key]}`).join('&');
          res.cookie('authstate', state);
          return res.redirect(`${this.adminConsentUri}?${parameters}`);
        })
        .catch(error => {
          this.robot.logger.error(`${LOG_MSTEAMS_AUTH_PREFIX} ${error}`);
          this.robot.logger.debug(`${LOG_MSTEAMS_AUTH_PREFIX} StackTrace=${error.stack}`);
          return res.status(500).send('Internal server error');
        });
    });

    // The admin token endpoint is where AAD redirects admin users after
    //  a successful consent flow. It simply closes the browser window.
    this.robot.router.get(this.config.admin_token_endpoint, cookieParser(),
      (req, res) => {
        req.query = this._repairQuery(req.query);
        if (req.cookies.authstate !== req.query.state) {
          return res.status(400).send('Cross-site scripting token is invalid');
        }
        if (req.query.error) {
          return res.status(400).send(req.query.error);
        } else {
          return res.send('<script>window.close();</script>');
        }
      });

    // The login endpoint is where we redirect all users to login to the bot.
    //  This endpoint requests access to MS Graph resources that we need to
    //  operate.
    this.robot.router.get(this.config.login_endpoint, (req, res) => {
      // The state is set on the user's browser's cookies and also passed
      //  to AAD. It is later returned and the browser's cookies are compared
      //  against it to make sure there were no cross-site malicious attacks.
      return this._createState().then(state => {
        // We need the openIdConfig so that we know what authorization
        //  endpoint to redirect users to.
        return this.cache.get('openIdConfig').then(openIdConfig => {
          if (!openIdConfig) {
            return Promise.reject('A valid OpenId configuration is not available.');
          }
          parameters = {
            response_type: 'code',
            client_id: this.config.ms_app_id,
            redirect_uri: `${this.config.host}${this.config.token_endpoint}`,
            state,
            scope: this.scopes
          };
          parameters = Object.keys(parameters).map(key => `${key}=${parameters[key]}`).join('&');

          res.cookie('authstate', state);
          return res.redirect(`${openIdConfig.authorization_endpoint}?${parameters}`);
        });
      })
        .catch(error => {
          this.robot.logger.error(`${LOG_MSTEAMS_AUTH_PREFIX} ${error}`);
          this.robot.logger.debug(
            `${LOG_MSTEAMS_AUTH_PREFIX} StackTrace=${error.stack}`);
          return res.status(500).send('Internal server error');
        });
    });

    // The token endpoint is where all users are redirected to by AAD
    //  after they login.
    return this.robot.router.get(this.config.token_endpoint, cookieParser(), (req, res) => {
      req.query = this._repairQuery(req.query);
      if (req.cookies.authstate !== req.query.state) {
        return res.status(400).send('Cross-site scripting token is invalid');
      }

      if (req.query.error) {
        return res.status(400).send(req.query.error);
      } else {
        // Exchange the authorization code for AAD tokens.
        return this._getUserAndTokensFromCode(req.query.code)
          .then(userAndTokens => {
            this.loginCallback(userAndTokens.id, userAndTokens.tokens);
            return res.send('<script>window.close();</script>');
          })
          .catch(error => {
            this.robot.logger.error(`${LOG_MSTEAMS_AUTH_PREFIX} ${error}`);
            this.robot.logger.debug(`${LOG_MSTEAMS_AUTH_PREFIX} StackTrace=${error.stack}`);
            return res.status(500).send('Internal server error');
          });
      }
    });
  }

  // #
  // The error string comes back HTML encoded for some reason so we have
  //  to remove the amp; at the beginning of each key.
  // #
  _repairQuery(origQuery) {
    if ((!origQuery.error)) {
      return origQuery;
    }

    let keys = Object.keys(origQuery);
    for (let key of Array.from(keys)) {
      let newKey = key.replace(/^amp;/, '');
      if (newKey !== key) {
        origQuery[newKey] = origQuery[key];
        delete origQuery[key];
      }
    }

    return origQuery;
  }

  // #
  // Returns a random base64 string to use as the cross-site scripting
  //  security key. Returns a promise.
  // #
  _createState() {
    return new Promise((resolve, reject) => {
      return crypto.randomBytes(48, (ex, buf) => {
        let state = buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
        return resolve(state);
      });
    });
  }

  // #
  // Fetches the user data and access tokens. This also performs validation
  //  on the access tokens to make sure they came back from the the trusted
  //  endpoint. Returns a promise.
  // #
  _getUserAndTokensFromCode(authorizationCode) {
    return this.cache.get('openIdConfig')
      .then(openIdConfig => {
        return new Promise((resolve, reject) => {
          let postBody = {
            grant_type: 'authorization_code',
            client_id: this.config.ms_app_id,
            client_secret: this.config.ms_app_password,
            redirect_uri: `${this.config.host}${this.config.token_endpoint}`,
            code: authorizationCode,
            scope: this.scopes
          };

          postBody = Object.keys(postBody).map(key => `${key}=${postBody[key]}`).join('&');
          let options = {
            method: 'post',
            url: openIdConfig.token_endpoint,
            proxy: HTTP_PROXY_ENDPOINT,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: postBody
          };
          return request(options, (error, resp, body) => {
            if (error || (resp && resp.statusCode !== 200)) {
              return reject(`Resource ${openIdConfig.token_endpoint} responded with statusCode=${(resp ? resp.statusCode : undefined)} error=${error}`);
            }

            let tokens = null;
            try {
              tokens = JSON.parse(body);
            } catch (exception) {
              return reject(`Response from resource ${openIdConfig.token_endpoint} was not valid JSON. exception=${exception}`);
            }

            // generate the expires on time from the expires in seconds
            //  returned from AAD. Add a 10% buffer.
            tokens.expires_on = Date.now() + (900 * tokens.expires_in);

            return resolve({
              tokens,
              openIdConfig
            });
          });
        });
      })
      .then(resp => {
        return this.cache.get('keys')
          .then(keys => {
            return this._validateTokens(keys, __guard__(resp ? resp.openIdConfig : undefined, x => x.issuer), resp ? resp.tokens : undefined);
          });
      });
  }

  // #
  // Fetches the user data and access tokens. This also performs validation
  //  on the access tokens to make sure they came back from the the trusted
  //  endpoint. Returns a promise.
  // #
  _getUserAndTokensFromRefreshToken(refreshToken) {
    return this.cache.get('openIdConfig')
      .then(openIdConfig => {
        return new Promise((resolve, reject) => {
          let postBody = {
            grant_type: 'refresh_token',
            client_id: this.config.ms_app_id,
            client_secret: this.config.ms_app_password,
            refresh_token: refreshToken
          };

          postBody = Object.keys(postBody).map(key => `${key}=${postBody[key]}`).join('&');

          let options = {
            method: 'post',
            url: openIdConfig.token_endpoint,
            proxy: HTTP_PROXY_ENDPOINT,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            form: postBody
          };
          return request(options, (error, resp, body) => {
            if (error || (resp && resp.statusCode !== 200)) {
              return reject(`Resource ${openIdConfig.token_endpoint} responded with statusCode=${(resp ? resp.statusCode : undefined)} error=${error}`);
            }

            let tokens = null;
            try {
              tokens = JSON.parse(body);
            } catch (exception) {
              return reject(`Response from resource ${openIdConfig.token_endpoint} was not valid JSON. exception=${exception}`);
            }

            // generate the expires on time from the expires in seconds
            //  returned from AAD. Add a 10% buffer.
            tokens.expires_on = Date.now() + (900 * tokens.expires_in);

            return resolve({
              tokens,
              openIdConfig
            });
          });
        });
      })
      .then(resp => {
        return this.cache.get('keys')
          .then(keys => {
            return this._validateTokens(keys, __guard__(resp ? resp.openIdConfig : undefined, x => x.issuer), resp ? resp.tokens : undefined);
          });
      });
  }

  // #
  // Helper function to validate that the tokens came back from a trusted
  //  endpoint. We validate only the id_token because this token tells us
  //  which user the other tokens belong to. This protects us from having
  //  a malicious attacker try to associate their user id with another users
  //  access and refresh tokens.
  // #
  _validateTokens(keys, issuerTemplate, tokens) {
    return new Promise((resolve, reject) => {
      keys = keys || [];
      if (!Array.isArray(keys)) {
        keys = [keys];
      }

      // decode the id_token to grab some header information we need.
      let id_token = tokens ? tokens.id_token : undefined;
      let claims = jwt.decode(id_token, {complete: true});
      if (!claims) {
        return reject('Id Token format invalid');
      }

      let type = __guard__(claims ? claims.header : undefined, x => x.typ);
      let algorithm = __guard__(claims ? claims.header : undefined, x1 => x1.alg);
      let signingKeyId = __guard__(claims ? claims.header : undefined, x2 => x2.kid);
      let tenantId = __guard__(claims ? claims.payload : undefined, x3 => x3.tid);

      if (type !== 'JWT') {
        return reject('Id Token not a JWT');
      }

      // get the issuer and signingKey we are expecting to use.
      let issuer = issuerTemplate.replace('{tenantid}', tenantId);
      let signingKey = keys.find(element => element.kid === signingKeyId);

      if (!signingKey) {
        return reject('Specified signing key not found');
      }

      let signingCerts = signingKey.x5c || [];
      if (!Array.isArray(signingCerts)) {
        signingCerts = [signingCerts];
      }
      signingCerts = signingCerts.map(this._convertCertificateToBeOpenSSLCompatible);

      // run through every cert that the signingKey has to try to verify the
      //  id_token
      for (let signingCert of Array.from(signingCerts)) {
        try {
          // jwt.verify verifies that the signature matches, the audience
          //  is this app, the issuer is who we expected it to be, and that
          //  the token is signed using the correct algorithm.
          let decodedToken = jwt.verify(
            id_token,
            signingCert, {
              audience: this.config.ms_app_id,
              algorithms: [algorithm],
              issuer
            });

          // return the user object.
          return resolve({
            id: decodedToken.oid,
            displayName: decodedToken.name,
            mail: decodedToken.preferred_username,
            tokens
          });
        } catch (error) {}
      }

      // If every call to jwt.verify exited with an exception; the id_token
      //  is not valid.
      return reject('Tokens are invalid');
    });
  }

  // #
  // This is a helper function to conver the signing certificates into a format
  //  that JWT understands.
  // #
  _convertCertificateToBeOpenSSLCompatible(cert) {
    let beginCert = '-----BEGIN CERTIFICATE-----';
    let endCert = '-----END CERTIFICATE-----';

    cert = cert.replace('\n', '');
    cert = cert.replace(beginCert, '');
    cert = cert.replace(endCert, '');

    let result = beginCert;
    while (cert.length > 0) {
      if (cert.length > 64) {
        result += `\n${cert.substring(0, 64)}`;
        cert = cert.substring(64, cert.length);
      } else {
        result += `\n${cert}`;
        cert = '';
      }
    }

    if (result[result.length ] !== '\n') {
      result += '\n';
    }
    result += endCert + '\n';
    return result;
  }
}

exports.use = function(robot, loginCallback, config) {
  let realConfig = {
    ms_app_id: config.ms_app_id,
    ms_app_password: config.ms_app_password,
    host: config.host,
    open_id_configuration_uri: config.open_id_configuration_uri || OPEN_ID_CONFIGURATION_URI,
    admin_consent_uri: config.admin_consent_uri || ADMIN_CONSENT_URI,
    admin_consent_endpoint: config.admin_consent_endpoint || ADMIN_CONSENT_ENDPOINT,
    admin_token_endpoint: config.admin_token_endpoint || ADMIN_TOKEN_ENDPOINT,
    tenant_id: config.tenant_id || COMMON_TENANT,
    login_endpoint: config.login_endpoint || LOGIN_ENDPOINT,
    logout_endpoint: config.logout_endpoint || LOGOUT_ENDPOINT,
    token_endpoint: config.token_endpoint || TOKEN_ENDPOINT,
    open_id_config_cache_duration: config.open_id_config_cache_duration || DAY_IN_MILLISECONDS,
    open_id_cert_cache_duration: config.open_id_cert_cache_duration || DAY_IN_MILLISECONDS
  };
  return new MSTeamsAuthServer(robot, loginCallback, realConfig);
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
