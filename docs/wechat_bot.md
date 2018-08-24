# Create a WeChat bot

## Environment variables

| Environment variables        |  Question   |  Description  |  Required |
| :--------   | :-----   | :---- |  :---- |
| `SBOT_WX_ACCEPT_FRIEND`        |    Auto accept frient request   |    Auto accept frient request. default `no`  | No |
| `SBOT_WX_IGNORE_GROUP`        |   Ignore message from group    |   Ignore message from group. default `no`  | No |
| `SBOT_WECHAT_AUTH_PORT`        |    WeChat auth server port   |   Specify WeChat auth server port, auth server started with the `Wechat Bot` startup, default `8082` | No |

## Creating a WeChat bot

1. `sbot create -s`
2. Access `(http|https)://<hostname>:<SBOT_WECHAT_AUTH_PORT>/login`, The protocol should be `https`, if you enabled TLS for server.
3. Scan the QR code


<div align="center">
  <img alt="Create a WeChat bot" src="img/wechat_demo.gif" width="65%">
</div>