# Create a WeChat bot

## Environment variables

| Environment variables        |  Question   |  Description  |  Required |
| :--------   | :-----   | :---- |  :---- |
| `SBOT_WX_ACCEPT_FRIEND`        |    Auto accept frient request   |    Auto accept frient request. default `no`  | No |
| `SBOT_WX_IGNORE_GROUP`        |   Ignore message from group    |   Ignore message from group. default `no`  | No |
| `SBOT_WECHAT_AUTH_PORT`        |       |   Specify WeChat auth server port, auth server started with the `Wechat Bot` startup, default `8082` | No |

## Creating a WeChat bot

1. `sbot create`
2. Access `http://<hostname>:8082/login`
3. Scan the QR code

