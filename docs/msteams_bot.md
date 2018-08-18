# Create a Microsoft Teams bot

## Environment variables

| Environment variables        |  Question   |  Description  |  Required |
| :--------   | :-----   | :---- |  :---- |
| `BOTBUILDER_APP_ID`        |    Microsoft APP ID   |    This is the Id of your bot.   | Yes |
| `BOTBUILDER_APP_PASSWORD`        |  Microsoft APP password    |    This is the secret for your bot.   | Yes |
| `HUBOT_OFFICE365_TENANT_FILTER`        |    Microsoft tenant ID   |   Comma seperated list of Office365 tenant Ids that are allowed to communicate with your hubot. By default ALL Office365 tenants can communicate with your hubot if they sideload your application manifest.  | Yes |
| `BOTBUILDER_ENDPOINT`        |  Enter a custom HTTP endpoint    |   The team/group on your Mattermost server, default `/api/messages`.   | No |

## How to create a Microsoft Teams bot

1. Expose a public endpoint. e.g. `https://<hostname>:8080`. `https://<hostname>:8080` is `<ROOT URL>`.
  1. [Hubot](https://hubot.github.com/docs/scripting/) started a http server and listens on the port specified by the
  `EXPRESS_PORT` or `PORT` environment variables (preferred in that order) and defaults to `8080`.
  2. You can choose to use [ngrok](https://ngrok.com/) if the bot is in the internal network.
2. Create a bot [here](https://dev.botframework.com/bots)
	1. Make sure to save your Microsoft App Id (`BOTBUILDER_APP_ID`) and Microsoft App Password(`BOTBUILDER_APP_PASSWORD`).
	2.  Messaging endpoint is `<ROOT URL>/api/messages`. `/api/messages` is specified by the `BOTBUILDER_ENDPOINT`.
3. Create a `manifest.zip` that you can sideload into teams:
	1. Create a file named `manifest.json` with this content:

    ```javascript
    {
        "manifestVersion": "1.0",
        "version": "1.0",
        "id": "<Your Microsoft app Id from step 1",
        "packageName": "test",
        "developer": {
            "name": "Developer",
            "websiteUrl": "https://www.microsoft.com",
            "privacyUrl": "https://www.microsoft.com/privacy",
            "termsOfUseUrl": "https://www.microsoft.com/termsofuse"
        },
        "name": {
            "short": "<your bot name>",
            "full": "<your bot name>"
        },
        "description": {
            "short": "<any description>",
            "full": "<any description>"
        },
        "icons": {
            "outline": "outline_icon.png",
            "color": "color_icon.png"
        },
        "accentColor": "#3F487F",
        "bots": [
            {
                "botId": "<your microsoft app Id from step 1>",
                "isNotificationOnly": false,
                "scopes": [
                    "team",
                    "personal"
                ]
            }
        ],
        "permissions": [
            "identity",
            "messageTeamMembers"
        ],
        "validDomains": []
    }
    ```

	2. Create a `96x96` png icon for your app and call it color_icon.png (can be anything for testin purposes)
	3. Create a `20x20` png outline icon for your app and call it outline_icon.png (can be anything for testing purposes)
	4. Zip all three files such that your resulting zip has these contents:
		- `manifest.json`
		- `color_icon.png`
		- `outline_icon.png`
4. Sideload your `manifest.zip` into MS Teams.
Login to MS Teams -> `View Team` -> `Apps` -> `Sideload an App` -> Select the `manifest.zip`
