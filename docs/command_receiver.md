# command receiver
The restAPI (Bot server) can receive a http request with the `POST` way , it started with the `Sbot` startup.
And it listens on the port specified by the `SBOT_SERVER_PORT` environment variable and defaults to `8081`.
The `SBOT_SERVER_PORT` environment variable can be configured by command `sbot create`.

## `robot.$.registerAPICallback(integrationName, callbackId, callback)`
In your code you need to register the callback function for general rest API
 by calling robot.$.registerAPICallback function:
```javascript
robot.$.registerAPICallback(integrationName, callbackId, callback)
```

**Parameters:**
- integrationName, `String` the name of the product integration.
- callbackId, `String` the unique id of the callback being registered.
- callback(info), `Function` the callback function that would be executed upon execution from the `REST API`. **It must return a Promise.**
  - info
    - body, `Request body`
    - adapter, `Hubot.adapter`
**Example:**
```javascript
robot.$.registerAPICallback('example', 'exampleforapicall', info => {
  return Promise.resolve(info.body);
});
```

## Command receiver API

- URL: /api/script/integrationName/callbackId
- Protocol: HTTPS/HTTP
- Method: POST
- Request
  - Headers:
    - Content-Type: application/json
    - Body: {}

In the url `/api/script/integrationName/callbackId`, `/api` is the default baseUrl, specified by the `SBOT_SERVER_BASEURL` environment variable.
`/script/integrationName/callbackId` is route url.

<p align="center">
 Postman test:
</p>
<div align="center">
  <img alt="Postman test" src="Postman test" width="65%">
</div>


**Curl test**
```bash
 curl -X POST -H "Content-Type:application/json" -d '{"test": "hello"}' http://127.0.0.1:8081/api/script/{integrationName}/{callbackId}
```