# Create a Microsoft Teams bot

## Environment variables

| Environment variables        |  Question   |  Description  |  Required |
| :--------   | :-----   | :---- |  :---- |
| `MATTERMOST_HOST`        |    Mattermost server host   |    The Mattermost host e.g. `mm.yourcompany.com`.   | Yes |
| `MATTERMOST_HTTP_PORT`        |   Mattermost server port    |   Overrides the default port (`80` or `443`) for `http://` or `https://` connections   | No |
| `MATTERMOST_WSS_PORT`        |    Mattermost WSS port   |   Overrides the default port `443` for  websocket (`wss://`) connections.  | No |
| `MATTERMOST_GROUP`        |  Mattermost team name    |   The team/group on your Mattermost server e.g. `mf`.   | Yes |
| `MATTERMOST_USER`        |    Mattermost bot username   |  The Mattermost user account name e.g.`bot@bot.com`.  | Yes |
| `MATTERMOST_PASSWORD`        |  Mattermost bot password    |   The password of the user e.g.  `1Qaz2wsx`   | No |
| `MATTERMOST_USE_TLS`        |    Do you want to use TLS (yes/no)   |  Enable TLS for http/ws protocols, default `no`.  | No |
| `MATTERMOST_TLS_VERIFY`        |   Do you want to verify TLS (yes/no)    |   Set to 'no' to allow connections when certs can not be verified, default `no`.   | No |
| `MATTERMOST_REPLY` |  | set to `false` to stop posting `reply` responses as comments, default `true` | No |
| `MATTERMOST_IGNORE_USERS` |  | Enter a comma-separated list of user senderi_names to ignore. default `empty`.| No |
