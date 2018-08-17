What is Hubot

hubot is an open source chat bot or just bot that can be extended using integration scripts. It was originally developed by Github. In this  document we describe how you may use our Hubot Enterprise (also called he for short) bot which is an enterprise-ready extension of hubot to build your product scripts. For background information of hubot please refer to its project page.

    Important Note: Please make sure that you read this document carefully to understand the differences between hubot and Hubot Enterprise since there are some breaking changes in how you architect and implement a product script with he.

What is Hubot Enterprise

Hubot Enterprise (the he) is an evolution of the open source hubot project. We have customized it and extended it to provide a suitable chat bot ecosystem for your products. Here is a brief list of the features and extensions that we have built:

    UnifiedAdapter - a unified (standardized) communication adapter between the he and the chat platform (e.g. slack, mattermost, msteams).
    CommandReceiver API - he exposes a REST API that allows products to request commands / actions on he and the chat platform.
    Authentication / Login - he has built-in support for product scripts that need to provide a login portal to chat platform users in order to authenticate against their product and securely cache credentials.

Getting Started with Hubot Enterprise

    Follow the instructions in the Getting Started Guide. Once you have he running it is time to write your first script.

Product script architecture

This section discusses the typical architecture of a product script that is developed with Hubot Enterprise.

    It is important to note that product teams follow these patterns as much as possible to ensure consistency of implementation across all the software products scripts. However, if you feel that there are some use cases that fall outside of this, feel free to discuss them with Pooky （peng-qi.shi@hpe.com）, Rex（tao.wu6@hpe.com）Ulrich Feyer (ulrich.feyer@hpe.com).

Hubot Enterprise vs. hubot scripts

Hubot Enterprise (he) is built on top of hubot. However, he makes some breaking changes in how you write scripts (integrations). The following is a list of those changes:

    How you add response listeners has changed. Use robot.e.respond() and robot.e.hear() instead of robot.respond and robot.hear()to leverage all the capabilities of the Hubot Enterprise.
    You must register and configure your script / integration with Hubot Enterprise. Use robot.e.registerIntegration.
    The chat platform adapter that you choose must implement the new UnifiedAdapter API. This provides standardized API calls to the chat platforms (e.g. get channels, get users, etc.). It also extends hubot's resp.send() and resp.reply() methods to accept standardized messages that are translated to the specific format of the chat platform before being sent. We already ship this unified support for:
        Mattermost
        Slack
        MS Teams
    In Hubot Enterprise, you may register callbacks to execute commands on the bot or on the chat platform (via the bot) from your product using a REST API. hubot does not ship with such capability out of the box, only with an interface to a web server, i.e express, which needed to be scripted by the developer.
    The configuration mechanism for Hubot Enterprise is more concise and robust. hubot required an external dependency on yeoman.

    Customers looking for outside references on the web to learn how to write hubot scripts / integrations should do so with care since there are considerable breaking changes. Therefore, these external references might be outdated and they might not work with Hubot Enterprise.

Overview of product script architecture

Overview diagram of product script architecture

As depicted from diagram above there are three main required services in your product script's architecture:

    Product
    Bot
    Chat Platform

The Product is the service that you are integrating (e.g. SM, OpsB, etc.). This service should have a remotely accessible API (e.g. REST API) so that you may perform remote requests from the Bot to your Product.

The Chat Platform is the service that provides the chat and collaboration capabilities to your Product users. This platform could be a cloud service (e.g. Slack) or a hosted service (e.g. Mattermost). The important part is that this platform must provide an API to receive near-realtime activity messaging information from the platform as well as provide a remote interface to execute commands on the chat platform.

The Bot is the service that provides a bridge to integrate your Product and the Chat Platform. The Bot service is comprised of two main software components:

    Hubot Enterprise
    Product script(s)

Hubot Enterprise is a bot that can be extended by adding scripts / integrations. Product scripts are loaded by Hubot Enterprise in order to gain two types of operational knowledge:

    How to perform operations against the Chat Platform on behalf of your Product.
    How to to perform operations against the Product on behalf of the users of the Chat Platform as a result of explicit and implicit messaging / contextual activity.

From the diagram above there are three major types of intra-service communication flows between these three services which support the two types of operational knowledge just mentioned:

    Chat-to-Bot
    Bot-to-Product
    Product-to-Bot
    Bot-to-Chat

To implement these communication patterns Hubot Enterprise provides the concept of unified APIs. The architectural details about these patterns and APIs are discussed in the next sections.

Chat-to-bot and bot-to-chat communication

In hubot terminology, an adapter enables bot-to-chat and chat-to-bot communication. Thus, the adapter serves as a bridge between the chat platform (e.g. slack) and hubot. Historically, open source adapters like hubot-slack and hubot-mattermost have been developed with different APIs requiring developers to write scripts for just one platform.

In contrast, Hubot Enterprise provides one unified approach, the UnifiedAdapter, that allows developers to communicate with multiple chat platform using the same API. Therefore, Hubot Enterprise supports a write once and run everywhere methodology to developing product scripts. Currently we support the following chat platforms with more to come:
Chat Platform	bot-to-chat support	chat-to-bot support
Slack	(tick)	(warning)
Mattermost	(tick)	(warning)
MS Teams	(tick)	(warning)


    (warning) Enhanced support for adding unified objects passed down to command listeners will be added to the UnifedAdapter in the future.

To perform bot-to-chat operations the UnifiedAdapter provides a set of standardized API calls which can be accessed from the robot.adapter object in your product script code. A simple example use case is that the bot wants to read the messages in a channel. For that you would use robot.adapter.getChannelMessages(channelId) to retrieve them.

The most common use case, however, is sending messages to the chat platform to a user or a channel. Hubot Enterprise's UnifiedAdapter extends hubot to provide a unified rendering layer of messages from the bot to the chat platform. This is done transparently for the developer using the response.send() and response.reply() methods that are available in the command / listener handlers.

For more information on how to perform bot-to-chat communication refer to the following reading:

    Product script implementation
    UnifiedAdapter API Docs

Product-to-bot and bot-to-product communication

The main purpose of Hubot Enterprise is to serve as a bot framework for chat operations or ChatOps. In the following table we provide the different communication goals and purposes with the corresponding (current) support that Hubot Enterprise provides.

    (warning) Support is currently a work-in-progress. For instance, resource endpoints beyond Channel and Message are on the roadmap as well as improved ways to make secure requests to your product's http API.

Generate UnifiedAdapter API docs

    ebook-convert is required to generate docs.
        You can refer the Generating eBooks and PDFs
    Build `html`, `json`, and `pdf` docs under `dist/docs`
        `yarn docs:build` or `npm run docs:build`
        Access versions:
            `html` (generated by gitbook) version under `./dist/docs/_book`
            `pdf` (generated by gitbook) version under `./dist/docs/docs.pdf`
            `json` version for API only generated by `jsdoc` under `./dist/docs/docs-output.json`

    Or build and serve on html server
        `yarn docs:serve` or `npm run docs:serve`
        Access live docs by visiting `http://<yourmachinehost>:4040` with your web browser.

Product script implementation

The Hubot Enterprise is a `bot` in its own right, that provides  bot developers the capability to teach it more behavior by extending it using *scripts* (sometimes called integrations). By doing this, Hubot Enterprise obviates the need for developers to create a bot from scratch, and instead allows them to focus on its behavior and
functionality. In order to create a `bot` for your product, you just need to create scripts that follow Hubot Enterprise's conventions and APIs. In the  following sections we will show you how to build such scripts.
Setup product script boilerplate


    Your environment must have following languages / technologies installed and configured.
        nodejs version v6.9+
        coffeescript or es6
        yarn
        OpenSSL

    If you do not have those dependencies installed yet, please visit the Getting Started Guide and the FY17-Jun Installation Guide before going any further.

    Create your product script's repo on Github Enterprise. In this guide we will be building a product script for a simple To-Do app that we built.
        Click New Repository
        [ITOM ChatOps Platform > ChatOps Build Guide > image2017-6-9 11:53:53.png]
        Enter Repository name in your organization and pick to create a README file as we as a .gitignore file that uses node template. The recommended convention for your product script name is to use he-<short-product-name>. In the case of the To-Do app we will call it he-todo.
        [ITOM ChatOps Platform > ChatOps Build Guide > image2017-6-9 13:25:3.png]
        This is how the initial repo will look like:
        [ITOM ChatOps Platform > ChatOps Build Guide > image2017-6-9 13:25:41.png]

    Clone your product script repository on your local environment. The endpoint for the git repo can be found in the repository page by clicking Clone or download and copy-pasting that url to the command line.
    [ITOM ChatOps Platform > ChatOps Build Guide > image2017-6-9 13:36:25.png]

    # Clone repository into your local environment.
    # Will create a directory called he-todo.
    git clone git@github.houston.softwaregrp.net:he-chatops/he-todo.git


    Initialize a nodejs project with yarn. Assuming that you have a directory in your machine called /myprojects and you want to create a new product script called he-myproduct:

    # Change to the project directory
    cd he-todo
    # Yarn must be installed in your machine and available in your PATH
    yarn init .


    Answer the questions in the prompt related to your project. Here is the sample output of the questions:

    yarn init v0.19.1
    question name (he-todo):
    question version (1.0.0):
    question description: TODO product script built with Hubot Enterprise
    question entry point (index.js):
    question repository url (git@github.houston.softwaregrp.net:he-chatops/he-todo.git):
    question author (Ricardo Quintana <ricardo.quintana@hpe.com>):
    question license (MIT):
    success Saved package.json


    Inspect the package.json file created by yarn init. Here is an example:

    {
      "name": "he-todo",
      "version": "1.0.0",
      "description": "TODO product script built with Hubot Enterprise",
      "main": "index.js",
      "repository": "git@github.houston.softwaregrp.net:he-chatops/he-todo.git",
      "author": "Ricardo Quintana <ricardo.quintana@hpe.com>",
      "license": "Copyright 2017 Hewlett Packard Enterprise Development LP"
    }


    Create directory structure and scaffolding.

    # Entry file for the module.
    # Hubot Enterprise will load this file to load your entire script into the Bot.
    touch index.js
    # Where your product script source code will reside.
    mkdir src
    # Main source file for the product script.
    # This must be loaded (required) from the index.js
    touch src/main.js


    Commit your changes to git and push it to Github Enterprise. We recommend using a git workflow for your project.

    git add .
    git commit -m "Boilerplate / scaffolding"
    git push origin master


Anatomy of a product script


In the following sections we will be explaining how to write a product script with Hubot Enterprise and the best practices to do so.

    To guide you through this learning process, we created a reference product script implementation (WIP) which can be accessed here.

Loading product script in Hubot Enterprise

    First, you need to allow Hubot Enterprise to load your product script's entire source code. The entry point will be the index.js file in the root of your project which was specified as the entry point source file in the package.json file. This is important because Hubot Enteprise will use require to load the project, thus relying on the node modules conventions. The index.js file in our example looks like this:

    const productScript = require('./src/main');

    module.exports = productScript;

    In this sequence, the entire main.js program will be loaded using require and then exported as the main object of this project / module. The important part here, is that the convention for Hubot Enterprise loading, is that the exported object should be a function object that takes one parameter which is a bot object of type EnterpriseRobot. In this example, productScript(robot) is our main function, and the convention is to name the parameter robot.

    The main.js module that is loaded in the index.js should be the main program for your product script. It can be a standalone, flat script or it could be split into different source files to provide a more organized structure as your project grows. The important aspect here, is that all of those source files and modules need to be required here. This is consistent with writing projects as node modules. In our example, the main.js file looks like this:

    /**
     * TodoApp Product Script built for Hubot Enterprise
     */

    const ops = require('./ops');
    const {
      constants,
    } = require('./commons');

    /**
     * Main function that will load the product script.
     *
     * @param robot {EnterpriseRobot} - a `Hubot.Robot` that is extended
     *  by Hubot Enterprise.
     *
     */
    const main = (robot) => {
      /**
       * Verify that Hubot Enterprise loaded correctly
       */
      if (!robot || !robot.e) {
        const msg = `Could not load ${constants.PRODUCT_SCRIPT_NAME}, was not loaded correctly`;
        robot.logger.error(msg);
        process.exit(1);
      }


      robot.logger.info(`Loading ${constants.PRODUCT_SCRIPT_NAME} product script on Hubot Enterprise`);

      /**
       * The configuration of our product script.
       * Hubot Enterprise will use this to namespace your commands / listeners
       * and configure other functionality such as authentication
       * @type {{name: string, shortDesc: string}}
       * @todo Add authentication
       */
      const integrationConfig = {
        name: constants.PRODUCT_SCRIPT_NAME,
        shortDesc: constants.PRODUCT_DESCRIPTION,
      };

      /**
       * Registers / configures integration with Hubot Enterprise robot
       */
      robot.e.registerIntegration(integrationConfig);

      /**
       * Register create todo command by using the listener methods of the
       * Hubot Enterprise robot object.
       */
      robot.e.respond(ops.say.hello.config(robot), ops.say.hello.cb);
    };

    module.exports = main;

    The script's main function is called main and it takes the robot object as its first argument. The robot object is of EnterpriseRobot type which is an extension of Hubot.Robot, which is the class specification from open source hubot. The main function, is exported as the main function of this module. In the process of loading your project, Hubot Enterprise will execute this function and pass it a reference to its internal robot object. Therefore, by doing this, Hubot Enterprise shares its context with product scripts. The robot object will provide all the API methods that you need to interact with Hubot Enterprise, the chat platforms, and handle incoming requests from your product.

    The main.js example above could be summarized in the following steps:
        Require dependencies. In our case we have written our operation handlers in a different file named ops.js, therefore we require it at the top. The details of this file and how handlers are implemented is discussed here.
        Within the main function:
            Configure and register the product script with Hubot Enterprise
            Add a handler for a chat-to-bot operation / command.
        Export the main function.
    The product script file loading in alphabetical order, like: a-script.js, b-script.js, c-script.js.
    The above-mentioned parts are discussed in the next sections.

    To complete the loading process you must specify the full path to this product script project. You should do this by running the ./configure script or by modifying the HUBOT_SCRIPTS environment variable in the slack.env or mattermost.env files.

    Note: The path you specified in HUBOT_SCRIPTS must have permission to be read and written by the chatopsbot user.

    More information on this is available in the FY17-Jun Installation Guide.

    You may download the example code from its repository. If you don't have access send an email to peng-qi.shi@hpe.com.

Configure and register product script

The configuration and registration of the product script with Hubot Enterprise is achieved by using the robot.e.registerIntegration(config) which has the following specification:
API method	purpose	parameters	type	description	required	fields	field type	field description	field required
robot.e.registerIntegration(config, authConfig)



	Configure and register the current product script with Hubot Enterprise




config
	Object	Specifies the configuration for the product script.	(tick)




name
	String

The name of the product script.

This must be unique in the case of loading multiple Hubot Enterprise product scripts in one bot.
	(tick)

shortDesc
	String	A brief description of the product script.	(tick)
authConfig	Object



Specifies the configuration for the product authentication support in the product script.

For more information please visit the section on authentication.


(error)
	adapter	String

The authentication adapter that should be used.

Available values:

basic_authentication_adapter, idm_authentication_adapter
	(tick)
authMethod	function

This is the user-defined callback function that is passed by the product script to Hubot Enterprise so that it can perform the authentication on behalf of the product script.

The adapter will call this function and pass it arguments depending on its type (e.g. BasicAuthenticationAdapter).

Note: This field is required when adapter is

 basic_authentication_adapter

HUBOT_AUTH_TTL	Number

The timeout expiration time in seconds for a login (authentication) request from a chat user via the login web portal in seconds. It defaults to 5 minutes or the value of the HUBOT_AUTH_TTL environment variable (if set).

Note: You do not need to configure this field when adapter is

idm_authentication_adapter

HUBOT_DEFAULT_TOKEN_TTL	Number	When a chat user is unauthenticated against a product / product script, a temporary URL is provided via a message so that he / she can login via the login web portal. This parameter configures the expiration time for that temporary URL (which uses a temporary token) in seconds. It defaults to 30 minutes or the value of the HUBOT_DEFAULT_TOKEN_TTL environment variable if set.


In our example, we create an object called integrationConfig which is then passed to robot.e.registrationIntegration(). Note that registration must be executed before any other calls to robot are performed.

  /**
   * The configuration of our product script.
   * Hubot Enterprise will use this to namespace your commands / listeners
   * and configure other functionality such as authentication
   * @type {{name: string, shortDesc: string}}
   * @todo Add authentication
   */
  const integrationConfig = {
    name: constants.PRODUCT_SCRIPT_NAME,
    shortDesc: constants.PRODUCT_DESCRIPTION,
  };

  /**
   * Registers / configures integration with Hubot Enterprise robot
   */
  robot.e.registerIntegration(integrationConfig);


    For more information visit the Authentication (TODO: add link) section.

Handling chat-to-bot commands

One of the basic use cases when developing your product script with Hubot Enterprise is to be able to respond to operations / commands performed by a user in the chat platform. This is achieved by using the listener methods robot.e.respond() and robot.e.hear() which will tell Hubot Enterprise to execute a callback that you define when an operation / message is received from the chat platform that matches the syntax or pattern that you define. Here is the specification for the listener methods:
API method	purpose	parameters	type	description	required	fields / params	field / param type	field /param description	field / param, required
robot.e.respond(info, callback)











Configure and register the a listener in the EnterpriseRobot which will execute a callback defined by your product script.

A response is intended when the incoming message from the platform requires a respond from the bot. Hubot Enterprise distinguishes this intent when the user directs the message to the bot in the channel / chat platform. For instance:

    @bot todoapp say hello








info




Object


	Specifies the configuration for the listener.


	(tick)



	integrationName	String	The name of the integration. It should match the name used in the registration process.	(tick)
help	String	A description of how to use this operation from the chat platform.	(tick)

verb
	String

The operation / action.
	(tick)

entity
	String	The target entity that will receive the action.	(tick)
regexSuffix	Object

    Structure:
        re
            type: string
            description: the regex string
        optional
            type: boolean
            description: is this regex optional to the command.


entityDesc	String	the description of this entity	 (tick)
parameter	Array

the command parameters           [object1, object2,….]

    Structure
        name: the parameter name
        desc: the description of this parameter
        example: a example for the parameter


callback(response, _robot, authContext)	Function



Specifies the callback function that will be executed when an incoming message from the chat platform matches this listener.


(tick)
	response	Hubot.Response

An object that encapsulates the entire context of the chat-to-bot incoming message, including a reference to the robot object (e.g. response.robot).


	(tick)




	_robot	EnterpriseRobot	For the specification of EnterpriseRobot please refer to the specification of the Response object which also encloses it.




	authContext	Object

Varies depending on the authentication protocol specified in the configuration:

    For BasicAuth protocol
        principal
            type: String
            description: the chat user's username
        credential
            type: String
            description: the chat user's password



robot.e.hear(info, callback)	Same as robot.e.respond() with the exception that the chat platform message does not have to be directed to the bot, it just needs to be executed in a channel that the bot is part of.	Same as robot.e.respond() 	Same as robot.e.respond() 	Same as robot.e.respond() 	Same as robot.e.respond() 	Same as robot.e.respond() 	Same as robot.e.respond() 	Same as robot.e.respond() 	Same as robot.e.respond()
robot.e.hear(info, callback)	Deprecated since 2017.06 release.









In our example, we use robot.e.respond() to register an operation that will respond to a hello command.

  /**
   * Register create todo command by using the listener methods of the
   * Hubot Enterprise robot object.
   */
  robot.e.respond(ChitChatOps.configSayHello(robot), ChitChatOps.sayHello);

The values for the  info and callback parameters are generated by two statements:

    ChitChatOps.configSayHello(robot)

    ChitChatOps.sayHello

These functions are defined in the ChitChatOps class which is defined in the ops.js (shown below):

/**
 * Handlers for chat-to-bot operations
 */

const {
  constants,
} = require('./commons');

/**
 * Defines operations for smalltalk between use and bot (chat-to-bot).
 */
class ChitChatOps {
  /**
   * Handles a chat user command to say "hello".
   * @param response
   */
  static sayHello(response) {
    response.send('Hello World!');
  }

  /**
   * Generates configuration for Say Hello operation
   * @param robot
   * @returns {{integrationName, verb: string, entity: string, type: string, help: string}}
   */
  static configSayHello(robot) {
    const config = {
      integrationName: constants.PRODUCT_SCRIPT_NAME,
      verb: 'say',
      entity: 'hello',
      type: 'respond',
      help: '',
    };
    config.help =
      `@${robot.name} ${constants.PRODUCT_SCRIPT_NAME}` +
      ` ${config.verb}` +
      ` ${config.entity}`;
    return config;
  }
}


module.exports = {
  ChitChatOps,
};

In the example above, sayHello() is a static method that takes a response object. Hubot Enterprise will execute this method / function as a callback when a message matching @bot todoapp say hello is entered by a chat user. It is important to note that this response object is the mechanism for a product script to have access to the context of Hubot Enteprise. In this example, we just have a very simple call to the response.send() method in order to send a message to the chat room in which the command was sent. This method is aliased from the robot.adapter.send() method. For more information on the structure the response object please visit its documentation.


The configuration for this operation listener is generated by the configSayHello() method. This is just a convenience method that allows us to generate the value of help dynamically. This could as well be a const Object that is hardcoded.

Models

Response
1st level field	type	1st level description
robot	EnterpriseRobot	A reference to the main robot instance passed to the product script. Please refer to its specification for details.
message	Hubot.TextMessage	The contextual information about the incoming chat message.
envelope	Object

A wrapper object for some contextual information about the incoming message. It contains some duplicate references to the message object. This is the structure:

    room
        type: String
        description: the unique id of the channel in the chat platform. Can used as the channelId in the robot.adapter API method calls.
    user
        type: User
        description: contextual information about the chat user.
    message
        type: TextMessage
        description: contextual information about the incoming chat message.


match 	Array	The regex matches extracted from argumentString after @botname integrationName verb entity argumentString.

EnterpriseRobot
1st level field	type	1st level description
name	String	The name of the robot.
brain	Hubot.Brain	An in-memory store for caching product script information / data. For not Hubot Enterprise does not support using a persistent backend, thus this cache is volatile.
adapter

UnifiedAdapter

base class
	A unified adapter, which should implement all the public / private API of the UnifiedAdapter.
logger	Object	The main logger for Hubot Enterprise. It defaults to winston API.
unifiedApp	express	The router instance of the ComandReceiver API server.
unifiedServer	http.Server	The server instance of the CommandReceiver API server.
e	Object	Wrapper object for most Hubot Enterprise API utility methods.
enterprise	Object	alias for e object.

Hubot.TextMessage
1st level field	type	1st level desc
user	Hubot.User	The chat user information.
text	String	The string representation of the message.
room	String	The unique id of the channel in the chat platform. This value will vary depending on the unified adapter used (e.g. slack, mattermost)
Implementing fine-grained message matching

As explained in the previous sections, Hubot Enterprise enforces a particular structure for messages which consists of:

    integrationName
    verb
    entity
    regexSuffix ( Structure: {re: "<regexstring>", optional: <boolean> }

Underneath the covers, Hubot Enterprise constructs a javascript regular expression of the following form:

<integrationName> <verb> <entity> <regexSuffix.re>

When using 1-3 only the compiled regular expression will be <integrationName> <verb> <entity>. However, when specifying the regexSuffix.re it will append it with a space character between them. Here is an example for a command with syntax oo get run <id>:

# Properties
props = {
  type: "respond",
  integrationName: "oo",
  verb: "get",
  entity: "run",
  regexSuffix: {
    re: "(.*)",
    optional: true
  }
};
let getRun = (resp) =>
  robot.logger.info('You got a get run command with the following matches:');
  robot.logger.info(resp.match);
  if (!resp.match[1]) {
    return resp.reply("You *must* specify the id of the run after `get run <id>`");
  }
  resp.reply("Received GET RUN " + resp.match[1] + " command")


robot.e.respond(props, getRun)

This command will be matched by commands such as:

    oo get run
    oo get run X
    oo get run ID123
    oo get run ID1 ID2 ID3

In previous example, the value of re which is (.*) defines a regular expression that will catch everything after the entity run. The values of these matches will be available in the response object of the command callback under resp.match. You can make the regex value in re as fine-grained as needed in order to capture the arguments that you need.

The optional prop defaults to false making it a strict match between the message and the command. Thus, in the previous example if we had left out the optional flag or set it to false the oo get run message (without any arguments) would not match. This is why we set the optional prop to true so that we can capture it and handle it appropriately (e.g. like sending an error message to the chat user).

The regexSuffix also allows you to differentiate between potentially conflicting commands. An example is having two commands:

    oo get run
    oo get runs

A javascript regular expression of the form /oo get run/g will match both commands because oo get runs matches it as well. To differentiate them, you can then add regular expressions to both command props in regexSuffix so that they are more strict. For instance, assuming that these calls don't take arguments you could have:

# Properties for "oo get run"
propsRun = {
  type: "respond",
  integrationName: "oo",
  verb: "get",
  entity: "run",
  regexSuffix: {
    re: "$"
  }
};
...
# Properties for "oo get runs"
propsRuns = {
  type: "respond",
  integrationName: "oo",
  verb: "get",
  entity: "runs",
  regexSuffix: {
    re: "$"
  }
};

The $ in a regular expression states the presence of the end-of-line (or end of string).

    For more information on javascript regular expressions visit the reference from the Mozilla Developer Network.

Executing commands on chat platform (bot-to-chat)

Hubot Enterprise provides a unified / standardized API for developers to communicate with multiple chat platforms. We abstract the intricacies of these different platforms so that you may write your product scripts once, and then run them against any chat platform. That way, we do not fall into vendor lock-in issues. For more information on the UnifiedAdapter please refer to the architecture overview.

The following is a list of the currently implemented APIs. The details of these APIs are available in the API Reference Guide.

    These methods are available from the response object in the operation / command callback by using response.robot.adapter.<apiMethod> or by invoking the global robot object that is passed to the product script (main).

API method

(prefix with response. when using Response object)
	Description
robot.adapter.postMessage(channelId, text, options)

Post / send a new message to a channel.
robot.adapter.setChannelPurpose(channelId, purpose)

Set the purpose (text) of a channel.
robot.adapter.setChannelTopic(channelId, topic)

Set the topic (text) of a channel.
robot.adapter.setPrivateChannelPurpose(channelId, purpose)

Set the purpose (text) of a private channel.
robot.adapter.setPrivateChannelTopic(channelId, topic)

Set the topic (text) of a private channel.
robot.adapter.archiveChannel(channelId)	Archives a channel.
robot.adapter.archivePrivateChannel(channelId)	Archives a private channel.
robot.adapter.closePrivateChannel(channelId)

Closes a private channel.
robot.adapter.createChannel(channelName)

Creates a channel.
robot.adapter.createPrivateChannel(channelName)

Creates a private channel.
robot.adapter.getChannelMessages(channelId)

Retrieves the channel message history from the chat platform.
robot.adapter.getChannels()

Gets all the channels for the given team.
robot.adapter.getPrivateChannelMessages(channelId)

Retrieves the private channel message history from the chat platform.
robot.adapter.getPrivateChannels()

Gets all the private channels for the given team.
robot.adapter.getUsers()

Get all users of a teams.
robot.adapter.inviteUserToChannel(channelId, userId)

Invites a user to a channel.
robot.adapter.inviteUserToPrivateChannel(channelId, userId)

Invites a user to a private channel.
robot.adapter.loadMessageTemplates(templatePath, namespace)

Load user-defined templates.
robot.adapter.uploadFile(channelId, dirPath)

Upload file attachments.

    If you need support for an API call that is not listed in the API Reference Guide, please contact the ChatOps team to request it.

Posting text messages to chat (bot-to-chat)

There are three methods that you may use to post messages into the chat platform using the UnifiedAdapter API. These are the following:

API method
	Description
robot.adapter.postMessage(channelId, text, options)

Post / send a new message to a channel.

    Prefix with response. when using Response object.

response.send(messages...)	Sends one or more emoticon messages to a channel.

response.reply(messages...)
	Sends one or more messages to the current channel. It will add a directed response to the user who initiated the operation (e.g. @ricardo thanks for closing the issue.)

In the `he-todo` code example, we use response.send(`Hello World`) to post a message to the chat room that was the source of the command / operation to the bot. This is abstracted when using both respond.send() and response.reply() methods, so no channel information needs to be specified.

/**
 * Handles a chat user command to say "hello".
 * @param response
 */
static sayHello(response) {
  response.send('Hello World!');
}

    Multiple messages sent using respond.send(messages...) and response.reply(messages...) are sent recursively.

You could also use the postMessage() method that is accessible through the UnifiedAdapter Public API. You would need the channelId to post the message. For instance if we wanted to change the Hello World example above, it would be like this:


/**
 * Handles a chat user command to say "hello".
 * @param response
 */
static sayHello(response) {
  response.robot.adapter.postMessage(response.envelope.room, 'Hello World!');
}

The response.envelope.room contains the id of the channel of provenance. Please refer to the  Response object documentation for more details.
Posting rich-text messages (bot-to-chat)

Hubot Enterprise supports posting rich-text messages to the chat platforms. It provides a unified API that allows a generic Message object to be created consistently and sent to the platform throughout your product scripts regardless of the chat platform. This is accomplished by:

    Using the response.robot.adapter.UnifiedResponseRenderer.createMessage() factory method to create a Message object.

    Using the response.send(messages...) / robot.adapter.postMessage(channelId, message, options) methods using one or more arguments of type Message.

    Don't use response.reply(messages..) to post rich-text messages in Slack and Mattermost


The following is the API specification for the createMessage() method:

API method
	Description	Params	Description
robot.adapter.UnifiedResponseRenderer.createMessage(model, messageTypeNamespace)

Creates a standardized rich-text Message object that can sent to any chat platform.

    Prefix with response. when using Response object.

	model

Structure for "he.unified.message" type / template.

    text (string)
    title (string)
    color (string)
    title_link (string)
    fields (array)
        title (string)
        value (string)
        short (string)

The structure is based on the Slack specification for the message attachments.
messageTypeNamespace	A string representing the namespace of the type of Message template to use. Default value is "he.unified.message".


In the he-todo example, we added a new operation / command handler, @botname todoapp show table, that replies with a rich-text message. The following is the code added to the ops.js and main.js respectively.


...

/**
 * Defines operations for smalltalk between use and bot (chat-to-bot).
 */
class ChitChatOps {
...

  /**
   * Generates configuration for show table operation
   * @param robot
   * @returns {{integrationName, verb: string, entity: string, type: string, help: string}}
   */
  static configShowTable(robot) {
    const config = {
      integrationName: constants.PRODUCT_SCRIPT_NAME,
      verb: 'show',
      entity: 'table',
      type: 'respond',
      help: '',
    };
    config.help =
      `@${robot.name} ${constants.PRODUCT_SCRIPT_NAME}` +
      ` ${config.verb}` +
      ` ${config.entity}`;
    return config;
  }

  /**
   * Handles a show table operation by sending a rich-text table with
   * the UnifiedResponseRenderer.
   * @param response
   */
  static showTable(response) {
    const messagePart = {
      text: "part 1 text",
      title: "part 1 title",
      color: "#36a64f",
      title_link: "https://api.mattermost.com/",
      fields:
        [
          {
            "title":"IM10008- Printer Issue",
            "value":"Paperjam occurs when a printing job is larger than one page",
            "short":false
          },
          {
            "title":"IncidentID",
            "value":"IM10008",
            "short":true
          },
          {
            "title":"RequestedBy",
            "value":"falcon",
            "short":true
          },
          {
            "title":"Status",
            "value":"Categorize",
            "short":true
          },
          {
            "title":"ContactPerson",
            "value":"AARON, JIM",
            "short":true
          },
          {
            "title":"Phase",
            "value":"Categorization",
            "short":true
          },
          {
            "title":"Company",
            "value":"advantage",
            "short":true
          },
          {
            "title":"PrimaryAffectedService",
            "value":"Printing (North America)",
            "short":true
          },
          {
            "title":"PrimaryAffectedServiceUCMDBID",
            "value":"UG10002",
            "short":true
          },
          {
            "title":"Category",
            "value":"incident",
            "short":true
          },
          {
            "title":"Impact",
            "value":"3 - Multiple Users",
            "short":true
          },
          {
            "title":"SubCategory"
            ,"value":"failure",
            "short":true},
          {
            "title":"Urgency",
            "value":"3 - Average",
            "short":true
          },
          {
            "title":"Area",
            "value":"job failed",
            "short":true
          },
          {
            "title":"Priority",
            "value":"3 - Average",
            "short":true
          },
          {
            "title":"AssignmentGroup",
            "value":"Office Supplies (North America)",
            "short":true
          },
          {
            "title":"OpenTime",
            "value":"2014-09-25T02:48:59+00:00",
            "short":true
          },
        ],
    };


    const model = {
      text: "Title message",
      parts: [
        messagePart,
      ]
    };

    const m = response.robot.adapter.UnifiedResponseRenderer.createMessage(model, "he.unified.message")
    response.reply(m)
  }

  ...
}


module.exports = {
  ChitChatOps,
};


/**
 * TodoApp Product Script built for Hubot Enterprise
 */


...


const main = (robot) => {
...
  robot.e.respond(ChitChatOps.configShowTable(robot), ChitChatOps.showTable);
...
};

module.exports = main;


The raw message to be converted to the unified Message object is model and it is passed to the const m = response.robot.adapter.UnifiedResponseRenderer.createMessage(model, "he.unified.message"). In this call the "he.unified.message" is redundant since this is the default, however, when other templates are added in the future by the ChatOps development team or defined by the product script teams, those templates can be specified in the second param to the method.
The above-mentioned show table example will generate a message similar to this:
[ITOM ChatOps Platform > Developer Guide for 2018.01 Release > image2017-6-20 14:19:5.png]
Visual Command(Post Interactive Messages From Bot To Chat)

Hubot Enterprise supports interactive message buttons. They help make your integrations richer by completing common tasks inside Hubot-enterprise conversations, increasing user engagement and productivity. It provides a unified API that allows a generic Message object to be created consistently and sent to the platform throughout your product scripts regardless of the chat platform. This is accomplished by:

    Using the  robot.adapter.UnifiedResponseRenderer. createInteractiveMessage () factory method to create a Message object.
    Using the robot.adapter.postMessage(channelId, message, options) methods using one or more arguments of type Message.

The following is the API specification for the createInteractiveMessage() method:

API method
	Description	Params	Description
robot.adapter.UnifiedResponseRenderer.createInteractiveMessage (model, info)

Creates a interactive Message object that can sent to any chat platform.
	model

    text (string) A question description for the buttons (optional)
    callback_id (string) as a unique identifier for the collection of buttons, make up letter, numbers and the symbols '_' (required)
    actions(array) A collection of actions (buttons or menus…)
        name(string) Provide a string to give this specific action a name, make up letter, numbers and the symbols '_'(required)
        text(string) label for the message button or menu,cannot contain markup (required)
        type(string) Provide button when this action is a message button or provide select when the action is a message menu(only slack support now). (required)
        confirm(object) If you provide a JSON hash of confirmation fields, your button or menu will pop up a dialog with your indicated text and choices.(now only slack support)
            title(string) Title the pop up window
            text(string) Describe in detail the consequences of the action
            ok_text(string) The text label for the button to continue with an action
            dismiss_text(string) The text label for the button to cancel the action
    options(array) Used only with message menus or dropdown
        text(string) A short, user-facing string to label this option to users
        value(string) A short string that identifies this particular option to your application
    callback(info) <function> when button clicked or menu selected to run (required)
        info(object)
            adapter(object) robot.adapter, use to call public API
            channel(object)
                id(string) The channel's id from current response
                name(string) channel's name
            user(object)
                id(string) The users's id from current response
                name(string) the user's name from current response
            integration(string) the integrationName
            selected_options(object array) only response from a menu or dropdown selected,The choose results for a select action
                value(string) The choosed value from a user
            callbackParams (it depend on suite, may be a string , a object or undefined) the parameters for the callback when create the interactive message
    callbackParams the parameters for the callback (optional)

info

object additional data(user, channel, integration...), will be used to permission control in the next

    channel(object)
        id(string) The channel's id
        name(string) channel's name
    user(object)
        id(string) The users's id
        name(string) the user's name
    integrationName(string) integration name



Button Support

Now button can be supported by slack, mattermost and msteams.

1.An action in a  messages can support up to five buttons

2.In Slack, you need configure your request url for your app. It will receive actions from all clicks happening throughout messages with buttons.

Note: Request URL SSL certificate requirements(You can use ngrok+nginx, or let”s encrypt…)

3.In mattermost, If the integration is on your internal infrastructure, it’ll need to be whitelisted(In the mattermost server configure file: config.json, update the “AllowedUntrustedInternalConnections”).

In the configure file “/option/mattermot/config/config.json”:
“EnableInsecureOutgoingConnections”: true (if you use self-signed certificate)
“AllowedUntrustedInternalConnections”: “{hubot-server-hostname} {hostname2} …” (if not internal infrastructure pls ignore it)


Configure slack request url: format is   https://{your-bot-endpoint}/slack/{bot name}/action

[ITOM ChatOps Platform > Developer Guide for 2018.05 Release > image2018-4-20 14:30:4.png]

In mattermost, if your bot server used self-signed certificate and the integration is on your internal infrastructure, you may need configure(configure.json) the mattermost server:

[ITOM ChatOps Platform > Developer Guide for 2018.05 Release > image2018-4-20 14:34:13.png]


In the below example, we added a new operation / command handler, @botname show button, that replies with a inteactive button message.


const LoginResponse = require('../lib/authentication/login_response');
module.exports = (robot) => {
  // login auth method
  const authMethod = function(username, password){
    return new Promise((resolve, reject) => {
      robot.logger.info("Running the function : auth_method");
      if (username == 'admin' && password == 'Admin111') {
        resolve(new LoginResponse(200));
      }else {
        reject(new Error('System error'));
      }
    });
  };

  // register a integration for test
  robot.e.registerIntegration({
    shortDesc: "for demo",
    longDesc: "for demo",
    name: "demo"
  }, {
    adapter: 'basic_authentication_adapter',
    HUBOT_DEFAULT_TOKEN_TTL: 600,
    authMethod : authMethod
  });

  const buttonOptions = {
    integrationName: 'demo',
    verb: 'show',
    entity: 'button',
    entityDesc: 'Buttons',
    type: 'respond',
    help: '@bot demo show button'
  };

  const fun1 = function(info) {
    // your code here...
    info.adapter.postMessage(info.channel.id,  "You clicked button1");
  };
  const fun2 = function(info) {
    // your code here...
    info.adapter.postMessage(info.channel.id,  "You clicked button2");
  };
  const fun3 = function(info) {
    // your code here...
    info.adapter.postMessage(info.channel.id,  "You clicked button3");
  };
  const fun4 = function(info) {
    // your code here...
    info.adapter.postMessage(info.channel.id,  "You clicked button4");
  };
  const fun5 = function(info) {
    // your code here...
    info.adapter.postMessage(info.channel.id,  "You clicked button5");
  };

  const showButton = (response) => {
    const messagePart = {
      "text": "Choose a button click",
      "callback_id": "channel_action",
      "color": "#3AA3E3",
      "actions": [
        {
          "name": "button_1",
          "text": "Button1",
          "type": "button",
          callback: fun1
        },
        {
          "name": "button_2",
          "text": "Button2",
          "type": "button",
          callback: fun2
        },
        {
          "name": "butotn_3",
          "text": "Button3",
          "type": "button",
          callback: fun3
        },
        {
          "name": "button_4",
          "text": "Button4",
          "type": "button",
          callback: fun4
        },
        {
          "name": "button_5",
          "text": "Button5",
          "type": "button",
          callback: fun5
        }
      ]
    };
    const model = {
      text: "Title message",
      parts: [
        messagePart
      ]
    };
    let info = {
      user: {
        id: response.envelope.user.id,
        name: response.envelope.user.name
      },
      channel: {
        id: response.envelope.room,
      },
      integrationName: "demo"
    };
    const m = robot.adapter.UnifiedResponseRenderer.createInteractiveMessage(model, info);
    //robot.adapter.postMessage(response.envelope.room, m)
    response.send(m);
  };

  // register command
  robot.e.respond(buttonOptions, showButton);
};

The above-mentioned show button example will generate a message similar to this:
[ITOM ChatOps Platform > Developer Guide for 2018.05 Release > image2018-4-20 15:6:51.png]

Yes or No Button, now only slack support this;

const slackChannelsOptions = {
  integrationName: 'demo',
  verb: 'show',
  entity: 'channels',
  type: 'respond',
  help: '@bot demo show channels'
};

const getChannels = function(info) {
  logger.info("********** handle get channels *********");
  info.adapter.postMessage(info.channel.id, `I am retrieving all channels for this team.Please wait...`);
  info.adapter.getChannels()
    .then((channels) => {
      let message = "Found the following channels:\n";
      for (let i=0; i<channels.length; i++) {
        message += channels[i].name + "\n"
      }
      message += "All channels returned. :clap:";
      info.adapter.postMessage(info.channel.id, message);
    })
    .catch((e) => {
      info.logger.error(e);
      info.adapter.postMessage(info.channel.id, "Sorry, there was an error, please try again.");
    });
};

const testYesOrNo = function (info) {
  info.adapter.postMessage(info.channel.id, `click yes ....`);
};

const showSlackChannels = (response) => {
  //console.log(response.envelope);
  const messagePart = {
    "text": "Choose action for the channel",
    "callback_id": "channel_action",
    "color": "#3AA3E3",
    "attachment_type": "default",
    "actions": [
      {
        "name": "get_channels",
        "text": "Get channels",
        "type": "button",
        callback: getChannels
      },
      {
        "name": "yesOrNo",
        "text": "Yes No",
        "type": "button",
        "confirm": {
          "title": "Are you sure?",
          "text": "Wouldn't you prefer a good game of chess?",
          "ok_text": "Yes",
          "dismiss_text": "No"
        },
        callback: testYesOrNo
      },
    ]
  };

  const model = {
    text: "All the channles actions will show you, do it!",
    response_type: 'in_channel',
    parts: [
      messagePart
    ]
  };

  const inputData = {
    user: {
      id: response.envelope.user.id,
      name: response.envelope.user.name
    },
    channel: {
      id: response.envelope.room
    },
    integrationName: "demo"
  };
  const m = robot.adapter.UnifiedResponseRenderer.createInteractiveMessage(model, inputData);
  //robot.adapter.postMessage(id, m)
  response.send(m);
};

// register demo show channels
robot.e.respond(slackChannelsOptions, showSlackChannels);


[ITOM ChatOps Platform > Developer Guide for 2018.05 Release > image2018-4-20 15:30:46.png]


Cascading Buttons:

const buttonOptions = {
  integrationName: 'demo',
  verb: 'show',
  entity: 'button',
  entityDesc: 'Buttons',
  type: 'respond',
  help: '@bot test show button'
};

const fun6 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button6");
};
const fun7 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button7");
};
const fun8 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button8");
};
const fun9 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button9");
};
const fun10 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button10");
};
const fun1 = function(info) {
  // your code here...
  logger.info("You clickd button1...");
  const messagePart1 = {
    "text": "Choose a button click",
    "callback_id": "cascading_buttons",
    "color": "#3AA3E3",
    "actions": [
      {
        "name": "button_6",
        "text": "Button6",
        "type": "button",
        callback: fun6
      },
      {
        "name": "button_7",
        "text": "Button7",
        "type": "button",
        callback: fun7
      },
      {
        "name": "butotn_8",
        "text": "Button8",
        "type": "button",
        callback: fun8
      },
      {
        "name": "button_9",
        "text": "Button9",
        "type": "button",
        callback: fun9
      },
      {
        "name": "button_10",
        "text": "Button10",
        "type": "button",
        callback: fun10
      }
    ]
  };
  const model1 = {
    text: "Title message",
    parts: [
      messagePart1
    ]
  };
  let data = {
    user: {
      id: info.user.id,
      name: info.user.name
    },
    channel: {
      id: info.channel.id,
    },
    integrationName: info.integration
  };
  const m = robot.adapter.UnifiedResponseRenderer.createInteractiveMessage(model1, data);
  info.adapter.postMessage(info.channel.id,  m);
};
const fun2 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button2");
};
const fun3 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button3");
};
const fun4 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button4");
};
const fun5 = function(info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  "You clicked button5");
};

const showCascadingButtons = (response) => {
  const messagePart = {
    "text": "Choose a button click",
    "callback_id": "channel_action",
    "color": "#3AA3E3",
    "actions": [
      {
        "name": "button_1",
        "text": "Button1",
        "type": "button",
        callback: fun1
      },
      {
        "name": "button_2",
        "text": "Button2",
        "type": "button",
        callback: fun2
      },
      {
        "name": "butotn_3",
        "text": "Button3",
        "type": "button",
        callback: fun3
      },
      {
        "name": "button_4",
        "text": "Button4",
        "type": "button",
        callback: fun4
      },
      {
        "name": "button_5",
        "text": "Button5",
        "type": "button",
        callback: fun5
      }
    ]
  };
  const model = {
    text: "Title message",
    parts: [
      messagePart
    ]
  };
  let info = {
    user: {
      id: response.envelope.user.id,
      name: response.envelope.user.name
    },
    channel: {
      id: response.envelope.room,
    },
    integrationName: "demo"
  };
  const m = robot.adapter.UnifiedResponseRenderer.createInteractiveMessage(model, info);
  //robot.adapter.postMessage(response.envelope.room, m)
  response.send(m);
};
robot.e.respond(buttonOptions, showCascadingButtons);


[ITOM ChatOps Platform > Developer Guide for 2018.05 Release > image2018-4-20 15:46:56.png]
Dropdown Support

Now only can support menu(dropdown).

const selectOptions = {
  integrationName: 'demo',
  verb: 'show',
  entity: 'options',
  type: 'respond',
  help: '@bot test show options'
};

const testShowOption = function (info) {
  // your code here...
  info.adapter.postMessage(info.channel.id,  `You choosed the value ${info.selected_options[0].value}`);
};

const showOption = (response) => {
  const messagePart = {
    "text": "Choose a game to play",
    "color": "#3AA3E3",
    "callback_id": "game_selection",
    "actions": [
      {
        "name": "games_list",
        "text": "Pick a game...",
        "type": "select",
        "options": [
          {
            "text": "Hearts",
            "value": "hearts"
          },
          {
            "text": "Bridge",
            "value": "bridge"
          },
          {
            "text": "Checkers",
            "value": "checkers"
          },
          {
            "text": "Chess",
            "value": "chess"
          },
          {
            "text": "Poker",
            "value": "poker"
          },
          {
            "text": "Global Thermonuclear War",
            "value": "war"
          }
        ],
        "confirm": {
          "title": "Are you sure?",
          "text": "Wouldn't you prefer a good game of chess?",
          "ok_text": "Yes",
          "dismiss_text": "No"
        },
        callback: testShowOption
      }
    ]
  };

  const model = {
    text: "Would you like to play a game?",
    parts: [
      messagePart
    ]
  };
  let info = {
    user: {
      id: response.envelope.user.id,
      name: response.envelope.user.name
    },
    channel: {
      id: response.envelope.room,
    },
    integrationName: "demo"
  };
  const m = robot.adapter.UnifiedResponseRenderer.createInteractiveMessage(model, info);
  //robot.adapter.postMessage(id, m)
  response.send(m)
};
robot.e.respond(selectOptions, showOption);


[ITOM ChatOps Platform > Developer Guide for 2018.05 Release > image2018-4-20 15:38:43.png]
Handling product commands (product-to-bot)


    TODO

        Add reference to Swagger docs

Hubot Enterprise supports product-to-bot communication by exposing an http server to products so that they can remotely execute commands on the bot or retrieve information about the bot / chat platform through it. This is called the CommandReceiver REST API. The CommandReceiver REST API provides two different approaches to communication:

    The CommandReceiver exposes the UnifiedAdapter API methods through its REST API. That way, products may program their own sequences that interact with the chat platform, from the product's themselves (without product script logic).
    The CommandReceiver exposes a generic API via http which allows product scripts to register callbacks when they load and product script can trigger their execution remotely. This is useful when there are complex interactions with the chat platform that need to be triggered from an event on the product-side.

    The http server exposed will listen to connections / requests on port HUBOT_UNIFIED_SERVER_PORT which defaults to port 3000. This should have been configured when you ran ./configure.sh. For more details refer to the Getting Started Guide.

    The rest API can be accessed at :

        The classic version: https://{{he-hostname:HUBOT_UNIFIED_SERVER_PORT/urest/v1/
        The CDF version: https://{{he-hostname:HUBOT_UNIFIED_SERVER_PORT/chatops-chatbot/urest/v1/{platform}/{botName}

Authenticating requests against the CommandReceiver APIs

Product-to-bot authentication is done via https protocol. Thus, each request must have the username and password, joined by a colon (e.g. username:password) in base64 encoding as the value for its Authorization header. For instance, if during the ./configure.sh prompts you chose to use Aladdin as username and OpenSesame as the password, then the joined credentials would be Aladdin:OpenSesame and after base64 encoding it would be QWxhZGRpbjpPcGVuU2VzYW1l. Then the final header entry in the request would look like this:

 Authorization: Basic QWxhZGRpbjpPcGVuU2VzYW1l

Security

The CommandReceiver API is secured by using SSL / TLS. Therefore, all requests must be performed using the https protocol (prefix) in the requests.
Making requests to UnifiedAdapter API via CommandReceiver API

The Command Receiver API url path in CDF version is different from classic version. See the follow changes:

    platfom: slack/mattermost/msteams
    botName: your bot name, the value of env HUBOT_NAME.

API	Classic Version	CDF Version
Create channel	urest/v1/channel	chatops-chatbot/urest/v1/{platform}/{botName}/channel
Post message	urest/v1/channel/:channelName/message	chatops-chatbot/urest/v1/{platform}/{botName}/channel/:channelName/message
Invite User	urest/v1/channel/:channelName/member	chatops-chatbot/urest/v1/channel/:channelName/member
Upload File	urest/v1/channel/:channelName/member	chatops-chatbot/urest/v1/{platform}/{botName}/channel/:channelName/member
Register Scripts	urest/v1/script/:integrationName/:callbackId	chatops-chatbot/urest/v1/{platform}/{botName}/script/:integrationName/:callbackId
Upload Content/Get list of content	unsupport	chatops-chatbot/urest/v1/{platform}/{botName}/content
Get Content/Delete content	unsupport	chatops-chatbot/urest/v1/{platform}/{botName}/content/:name


More infomation about rest API, you can refer the documents after starting the bot service.

The documents can be accessed at:

    The classic version: https://{{he-hostname:HUBOT_UNIFIED_SERVER_PORT/
    The CDF version: https://{{he-hostname:HUBOT_UNIFIED_SERVER_PORT/chatops-chatbot/


    TODO:

        Add todoapp examples
        Add CDF examples

Command	Description	API path	Params	Examples
Create channel	This API creates a channel in the chat platform (e.g. slack, mattermost). The data format should be JSON format.	POST urest/v1/channel





    channelName
        type: string
        description: the channel name you want to create
    purpose
        type: string
        description: the purpose you set for the channel.
        optional: true
    topic
        type: string
        description: the topic for the channel
        optional: true




var https = require('https');

var post_data={
   "channelName": "test2001114",
   "purpose": "for test",
   "topic": "test"
};

var reqdata = JSON.stringify(post_data);

var options = {
    hostname: '10.225.***.***',
    port: '3000',
    path: 'urest/v1/channel',
    method: 'POST',
    rejectUnauthorized: false,
    requestCert: true,
    headers: {
      'Content-Type': 'Application/json',
      'Authorization': 'Basic YWRtaW46MTEx'
    }
};

var req = https.request(options, function (res) {
  console.log('Success!');
});

req.write(reqdata);






Post message	Posts a message into a chat platform channel (using its name).	POST urest/v1/channel/:channelName/message

    channelName
        type: string
        description: the unique name (not id) of the channel in the chat platform.
    message
        type: Object
        description: the message that wants to be posted.
        properties:
            text
                type: string
                description: The contents of the message
        options
            type: Object
            description: Any extra options for the createChannel API.




var https = require('https');
var post_data={
   "channelName": "test2001114",
   "purpose": "for test",
   "topic": "test"
 };
var reqdata = JSON.stringify(post_data);
var options = {
    hostname: '10.225.***.***',
    port: '3000',
    path: 'urest/v1/channel/:channelName/message',
    method: 'POST',
    rejectUnauthorized: false,
    requestCert: true,
    headers: {
      'Content-Type': 'Application/json',
      'Authorization': 'Basic YWRtaW46MTEx'
    }
};

var req = https.request(options, function (res) {
  console.log('Success!');
});


req.write(reqdata);


Invite User	Invites a user (using its username) to a particular channel (using its name).	POST urest/v1/channel/:channelName/member

    channelName
        type: string
        description: the unique name of the channel.
    invitees
        type: array of strings
        description: an array of unique usernames to be invited to the channel.




var https = require('https');
var post_data={
   "invitees": ["username1", "username2"…]
   };
var reqdata = JSON.stringify(post_data);
 var options = {
    hostname: '10.225.***.***',
    port: '3000',
    path: 'urest/v1/channel/:channelName/member',
    method: 'POST',
    rejectUnauthorized: false,
    requestCert: true,
    headers: {
      'Content-Type': 'Application/json',
      'Authorization': 'Basic YWRtaW46MTEx'
    }
};
var req = https.request(options, function (res) {
	console.log('Success!');
});

req.write(reqdata);


Upload File	Uploads a file to the chat platform via the CommandReceiver API.	POST urest/v1/channel/:channelName/member

    channelName
        type: string
        description: the unique name of the channel.
    attachments
        type: array of binary strings
        description: one or more binary strings that represent each file that wants to be uploaded to the chat platform in the channel specified by channelName.




var request = require('request');
var fs = require('fs');
var options = {
  url:'https://127.0.0.1:3000/urest/v1/channel/:channelName/member',
  rejectUnauthorized: false,
  formData:{
    attachments: [
      fs.createReadStream('./jsdoc.json')
    ]
  },
  headers:{
    Authorization:'Basic cmV4OjY2Ng=='
  }
}
request.post(options,function (err, httpResponse, body) {
  if (err) {
    return console.error('upload failed:', err);
  }
  console.log('Upload successful!  Server responded with:', body);
})


Making requests to product-script-defined callbacks
Command / API method	Description	Params	Examples
robot.e.registerProductToBotCallback(integrationName, callbackId, callback)	Register

    integrationName
        type: string
        description: the name of the product script / integration. Must not have any spaces.
    callbackId
        type: string
        description: the unique id / name of the callback being registered
    callback
        type: function
        description: the callback function that would be executed upon execution from the REST API. It must return a Promise.




let callback = (info) =>
  channelName = info.channelName
  if !channelName
    return Promise.reject({message: 'Failed create the channel!'})
  return Promise.resolve({message: 'Successfully create the channel!'})

robot.e. registerProductToBotCallback( integrationName, callbackId , callback)


POST /urest/v1/script/:integrationName/:callbackId	Executes product script / callback to be executed remotely via the CommandReceiver API.

    integrationName
        type: string
        description: the name of the product script / integration. Must not have any spaces.
    callbackId
        type: string
        description: the unique id / name of the callback that was registered.




const integrationName = "the
name of your integration"
const callbackId =
"the  name of the callback
function"

var https = require('https');
var post_data={
       …
      };

var reqdata = JSON.stringify(post_data);

var options = {
    hostname: '10.225.***.***',
    port: '3000',
    path: `${/urest/v1/script/:integrationName/:callbackId}`,
    method: 'POST',
    rejectUnauthorized: false,
    requestCert: true,
    headers: {
      'Content-Type': 'Application/json',
      'Authorization': 'Basic YWRtaW46MTEx'

    }
};

var req = https.request(options, function (res){
	console.log('Success!');
});

req.write(reqdata);



Handling bot-to-product authentication

A common use case for your product scripts is to authenticate a chat user with your product's authentication service in order to perform requests to your product's API on behalf of that user. Hubot Enterprise supports this workflow by providing the following features:

    It allows product scripts to register a callback to authenticate unauthenticated chat users.
    It has a built-in prompt message for unauthenticated users to enter credentials using a secure login portal.
    It allows the authentication callback to store credentials in an in-memory cache when a chat user is successfully authenticated.
    It injects credentials of authenticated users when they perform a chat-to-bot operation / command. No need for storing in product script global variables.

    Hubot Enterprise uses a middleware pattern similar to expressjs. to accomplish the above-mentioned features.

Supported authentication protocols

Currently we support the following authentication protocols:
Authentication protocol	Identifier key (String)	Description

IdMAuth


idm_authentication_adapter
	You can use Idm to authenticate a chat user when Idm authentication service is available.
BasicAuth	basic_authentication_adapter

Basic authentication is only appropriate when using bot-to-product requests that are secured via SSL / TLS. The reason is that credentials are passed in base64 encoding which is easily decoded if sniffed by unsecured http connections.


More authentication protocols will be added in future releases (e.g. SSO / SAML, etc.).
IdMAuth authentication protocol
Using IDM login server

Hubot Enterprise uses Idm login web portal. It supports IdmAuth protocol.

Registering Idm authentication adapter

Idm authentication adapter registration is accomplished by using the robot.e.registerIntegration(config, authConfig) method which is specified in the Product Script Registration section. The authConfig parameter allows the passing of an object with configuration information for the authentication feature.



For instance this is how the configuration object is created:

 const idmAuthConfig = {
  adapter: 'idm_authentication_adapter',
  HUBOT_DEFAULT_TOKEN_TTL: 1800
};


Example authentication workflow

This subsection visually showcases the authentication workflow for the super get users operation outlined in the previous section.

    Issue unauthenticated command:
    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > commadn.png]


    After clicking on link, showing the login web page and enter credentials in web page:

    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > login.png]

    After successfully login in, idm access token will be cached in Hubot Enterprise internal credential. it will show the following page:
    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > succ.png]

    Go back to the chat platform and see your command result:
    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > success.png]

Refreshing credentials

    Hubot Enterprise supports expiration of credentials in its internal credential cache. Internal credential cache will be refreshed when you issue authenticated command.

Configuring Idm token expiration time

Idm token expiration time defaults to 30 minutes. If you want to change the expiration time, you can call for Idm rest API like this:



    PATH /idm-service/api/system/configurations/items  HTTP/1.1
    Host: hostname:port
    Type: Basic Auth
    Accept: application/json
    Content-Type: application/json
    X-Auth-Token:
    eyJ0eXAiOiJKV1MiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI4YTg1YWE2ZjYwNThiMGJlMDE2MDU4YjExZDIwMDBkMyIsImlzcyI6IklkTSAke3BhcnNlZFZlcnNpb24ubWFqb3JWZXJzaW9ufS4ke3BhcnNlZFZlcnNpb24ubWlub3JWZXJzaW9ufS4ke3BhcnNlZFZlcnNpb24uaW5jcmVtZW50YWxWZXJzaW9ufS0ke3BhcnNlZFZlcnNpb24ucXVhbGlmaWVyfSIsImNvbS5ocGUuaWRtOnRydXN0b3IiOm51bGwsImV4cCI6MTUxNTM0NDY3MSwiY29tLmhwLmNsb3VkOnRlbmFudCI6eyJpZCI6IjhhODVhYTZmNjA1OGIwYmUwMTYwNThiMTE3YmUwMGEyIiwibmFtZSI6IlByb3ZpZGVyIiwiZW5hYmxlZCI6dHJ1ZX0sInBybiI6ImFkbWluIiwiaWF0IjoxNTE1MzQyODcxLCJqdGkiOiI2MWIwZDQ2Yi04YWZhLTRjMDAtYjFkYS1lZDFmNGY4YzJiM2IifQ.zvazjEc5bHwjtKnd-X45Wmx2H568dwq4o4Bee-M_jfI
    Cache-Control: no-cache
    Postman-Token: 11cde8a2-27a2-ebfc-57bc-39804550fa25
    Body:



         {

            "resourceconfig": [

               {



                  "name": "idm.request_token.lifetime.minutes",



                  "displayName": "idm.request_token.lifetime.minutes",



                  "value": "10"



               },



               {



                  "name": "idm.token.lifetime.minutes",



                  "displayName": "idm.token.lifetime.minutes",



                  "value": "30"



               }



            ]



          }
BasicAuth authentication protocol
Setting up hubot-enterprise-login server

Hubot Enterprise provides a simple login web portal. It supports BasicAuth protocol. For instructions on how to setup this server, please refer to the FY17-Jun Installation Guide.
Registering authentication callback

Callback registration is accomplished by using the robot.e.registerIntegration(config, authConfig) method which is specified in the Product Script Registration section. The authConfig parameter allows the passing of an object with configuration information for the authentication feature.


For instance in our he-todo example this is how the configuration object is created:

 const basicAuthConfig = {
  adapter: 'basic_authentication_adapter',
  HUBOT_DEFAULT_TOKEN_TTL: 1800,
  HUBOT_AUTH_TTL: 60,
  authMethod: authenticateToProduct,
};


In this example, we specified that our product script should:

    Use the basic_authentication_adapter,
    Set its timeouts for the temporary token / url and to the login requests to 30 minutes and 5 minutes, respectively
    Set the callback for verifying authentication credentials to the authenticateToProduct function.

    Please refer to the Product Script Registration section for more details on the authConfig object structure.

The authenticateToProduct() callback in our example looks like this:

const authenticateToProduct = (username, password) => {
  return new Promise((resolve, reject) => {
    robot.logger.info("Running the function: auth_method");
    if (username === 'admin' && password === 'Admin111') {
      resolve(robot.createLoginResponse(200))
    }
    reject(new Error('System error'))
  });
};

The example above outlines some of the properties of the callback that needs to be assigned to the authMethod field of the authConfig configuration object:

    The arguments passed to the callback will depend on the authentication method. In the case of this example the product script is using BasicAuth and thus, it expects username and password as arguments.
    The callback should return a Promise object. In the example above,
        the Promise is resolved when the username and password are as expected (mimicking an authentication to a product API).
            Hubot Enterprise expects a LoginResponse object (created by passing the statuscode of the request) as the first parameter for the resolved promise.
        the Promise is rejected otherwise.

The example above uses hard-coded values to simulate an authentication. This should not be used in production. In a real world use case, your product script should make an http request to the product's API or authentication service to authenticate the user. The following is an example from the he-todo app:

/**
 * Authentication callback for BasicAuth which should perform a request to the
 * Product API in order to verify the credentials and thus authenticating the user.
 * @param username {string} - the username entered by the chat user in the login web portal.
 * @param password {string} - the password entered by the chat user in the login web portal.
 * @returns {Promise<LoginResponse|Error>}
 */
const authenticateToProduct = (username, password) => {
  // Check that username and password are not nil.
  if (!username || !password) {
    return Promise.reject(new Error('Missing username or password'));
  }
  // Create base64 encoded token for BasicAuth.
  const token = new Buffer(`${username}:${password}`).toString('base64');

  // Setup fetch() request.
  const request = {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
    },
  };

  robot.logger.debug(`Request to: ${PRODUCT_AUTH_ENDPOINT}`);

  // Perform request to verify credentials, i.e. authenticate.
  return fetch(PRODUCT_AUTH_ENDPOINT, request)
    .then((resp) => {
      // Handle if there was a response from server.
      robot.logger.info('Received OK response from fetch!');
      robot.logger.debug(resp);
      // Pass the status to Hubot Enterprise auth module (via a promise resolve)
      // to determine if the authentication was successful.
      return Promise.resolve(robot.createLoginResponse(resp.status));
    })
    .catch((e) => {
      // Handle an error in the request.
      robot.logger.info('Received error from fetch()!');
      robot.logger.debug(e);
      // Reject promise with the caught error.
      return Promise.reject(e);
    });
};

In the previous example, the authenticateToProduct() callback executes the following steps:

    Check arguments to the callback.
    Create the authorization header according to the BasicAuth protocol spec.
    Makes the request using fetch() (node-fetch npm package) to the designed endpoint and configuration.
    Handle request
        Handle success by resolving the promise with the LoginResponse object (using the status returned from the server).
        Handle errors by rejecting the promise by bubbling up the error that was passed by the fetch()  function.

    These previous steps should be replicated by your product script's authentication callback.

    Please note that the authentication callback (in our case authenticateToProduct()) must be defined before the authenticationConfig is defined in order to be assigned to that object.

Retrieving credentials in operation / command callbacks

When authentication is enabled upon product script registration and a chat user has been authenticated against the product, Hubot Enterprise will inject the credentials in the operation / command callback as such:

let myCommandCallback = (response, _robot, authContext) => {
  # Access through authContext
};


In our he-todo example, we can add a new operation called @botname todoapp create todo <todo> to showcase this functionality. The callback specification for this operation / command specification looks like this:

/**
 * Operations for Todo entities.
 */
class TodoOps {
  /**
   * Configuration for "create todo" operation.
   * @param robot
   * @returns {{integrationName, verb: string, entity: string, type: string, help: string}}
   */
  static configCreateTodo(robot) {
    const config = {
      integrationName: constants.PRODUCT_SCRIPT_NAME,
      verb: 'create',
      entity: 'todo',
      type: 'respond',
      help: '',
    };
    config.help =
      `@${robot.name} ${constants.PRODUCT_SCRIPT_NAME}` +
      ` ${config.verb}` +
      ` ${config.entity}`;
    return config;
  }

  static createTodoMessage(todo) {
    const rawMessage = {
      parts: [
        {
          text: 'TodoApp',
          color: '#36a64f',
          title: `Create todo operation results`,
          title_link: 'https://github.houston.softwaregrp.net/he-chatops/he-todo',
          fields: [
            {
              title: 'Todo contents',
              value: `${todo}`,
              short: false,
            },
            {
              title: 'Status',
              value: 'Success',
              short: false,
            },
          ],
        },
      ],
    };
    return rawMessage;
  }

  /**
   * Handles the "create todo" operation.
   * @param response
   * @param _robot
   * @param authContext
   */
  static createTodo(response, _robot, authContext) {
    const username = authContext.principal;
    const password = authContext.credential;
    _robot.logger.info(response.match);
    if (!response.match || response.match.length < 2 || !response.match[1]) {
      return response.reply('You need to specify the todo description.')
    }
    const todo = response.match[1];
    const payload = {
      todo
    };
    // Create base64 encoded token for BasicAuth.
    const token = new Buffer(`${username}:${password}`).toString('base64');

    const request = {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };
    return fetch(CREATE_TODO_ENDPOINT, request)
      .then((resp) => {
        let msg = `Failed to create todo ${todo}`;
        if (resp.status !== 201) {
          response.reply(msg);
          return Promise.reject(msg);
        }
        msg = _robot.adapter.UnifiedResponseRenderer.createMessage(TodoOps.createTodoMessage(todo), 'he.unified.message');
        response.send(msg);
        return Promise.resolve(msg);
      })
      .catch((e) => {
        _robot.logger.error(`Error in request to ${CREATE_TODO_ENDPOINT}`);
        _robot.logger.debug(e);
        return Promise.reject(e);
      });
  }
}


As shown in the sample code above, the @botname todoapp create todo ... command is handled by the TodoOps.createTodo(response, _robot, authContext) callback. The parameter that is relevant for authentication is the authContext object which provides the context for the chat user authentication in the current product script. The specification of the structure of this authContext can be found in the registration section. In this case, since the he-todo product script is using BasicAuth the credentials can be accessed within the authContext.principal (username) and authContext.credential (password) fields. These credentials are then encoded to be used as the header of the request to the product server to create a todo item (using fetch()).

    (warning) Product scripts must never share or expose user credentials. Make sure that your development team inspects all operation handlers for potential security issues.

Example authentication workflow

This subsection visually showcases the authentication workflow for the @botname todoapp create todo .. operation outlined in the previous section.

    Issue unauthenticated command:

    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > image2017-6-23 15:28:52.png]

    After clicking on link, enter credentials in web page:

    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > image2017-6-23 15:26:24.png]

    After successfully login in, go back to the chat platform and see your command result:
    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > image2017-6-23 15:32:17.png]

Refreshing credentials

    Hubot Enterprise supports expiration of credentials in its internal credential cache. However, this might not be in sync with the authentication service of the product. In this release Hubot Enterprise does not support such functionality but will be considered in the future.

Executing bot-to-product requests

You may use an npm package. We recommend using the node-fetch which is a Promise-ready library that follows the es6 fetch() specification and it is in active development and support. We also provide the sendHttpsRequest(options, postData, responseHandler) that is a wrapper for http.request().
Conversation modeling

The conversation with the user is built around the concept of message models.

There are there pattern to create a conversation.

In conversation modeling, every time you chat with bot, you need to mention bot (e.g. @botname get users ).


First pattern: Init a json schema


//json schema example

  userSchema = {
    "type": 'object',
    "required": [
      'name'
      'email'
    ],
    "properties":{
      "name": {
        "description": 'full name',
        "type": 'string',
        "minLength": 8
      },
      "email": {
        "description": 'email address',
        "type": 'string',
        "format": 'email',
        "maxLength": 64
      },
      "employeeNum": {
        "description": 'employee Number',
        "type": 'integer',
        "minimum": 100,
        "maximum": 600
      },
      "gender": {
        "description": 'gender',
        "type": 'enum',
        "default": 'unspecified',
        "enum": [
          'unspecified'
          'male'
          'female'
        ]
      }
    }
  }

  schema = switchBoard.initSchema('User', userSchema)
  switchBoard.startDialog(msg, 'create user', schema)


Second pattern: Init a message model


// message model example

  onCompleteMessage: String // reply sent to the user when the conversation is done (optional)
  skipKeyword: String // default 'skip', a keyword that can be used to skip non-required questions (optional)
  skipMessage: String // a message that can be appended to any non-required questions (optional)
  type: "dynamic" // conversation schema type cloud be 'dynamic' (required)
  steps: [
    {
      question: String // question to ask the user (required)
      answer: {
        type: String // could be 'choice', 'text' (required)
        options: [ // add the options object if the `type` of answer is `choice`
          {
            match: String, // what robot should listen to - can be a regex
            validation: Object // validate input, refer json shcema (optional)
          }
        ]
      },
      required: Boolean
    }
  ]

  dynamicSchema = {
    onCompleteMessage: 'Create user successfully!! Thanks for reporting this.',
    type: "dynamic",
    steps: [
      {
        question: "Start create a user \nPlease enter your user name.",
        answer: {
          type: "text",
          validation:{
            "description": 'full name',
            "type": 'string',
            "minLength": 8
          }
        },
        required: true
      },
      {
        question: "Please enter your user email.",
        answer: {
          type: "text",
          validation:{
            "description": 'email address',
            "type": 'string',
            "format": 'email',
            "maxLength": 64
          }
        },
        required: true
      },
      {
        question: "Please enter employee Num.",
        answer: {
          type: "text",
          validation:{
            "description": 'employee Number',
            "type": 'integer',
            "minimum": 100,
            "maximum": 600
          }
        },
        required: false
      },
      {
        question: "Please enter gender enum[female, male, unspecified]"
        answer: {
          type: "choice",
          options: [
            {
              match: "unspecified"
            },
            {
              match: "male"
            },
            {
              match: "female"
            }
          ]
        },
        required: false
      }
    ]
  }

  schema = switchBoard.initSchema('User', dynamicSchema)
  switchBoard.startDialog(msg, 'create user(dynamic)', schema)


Third pattern: custom


//example

    conversation = switchBoard.startDialog(msg, 'create user(custom)')

    function1 = (message) ->
      conversation.updateAnswers('yes')
      message.reply('Please enter your user name.')
      conversation.updateQuestion('Please enter your user name.')
      conversation.addChoice(/.*/i, function2)

    function2 = (message) ->
      conversation.updateAnswers(message.message.text)
      message.reply("Please enter your user email.")
      conversation.updateQuestion("Please enter your user email.")
      conversation.addChoice(/.*/i, function3)

    function3 = (message) ->
      conversation.updateAnswers(message.message.text)
      message.reply("Please enter employee Num.")
      conversation.updateQuestion("Please enter employee Num.")
      conversation.addChoice(/.*/i, function4)

    function4 = (message) ->
      conversation.updateAnswers(message.message.text)
      message.reply('Create user successfully!! Thanks for reporting this.')
      conversation.emit 'end'

    function5 = (message) ->
      conversation.emit 'end'
      message.reply('Bye bye!')

    msg.reply("Start create a user \n [yes]or [no]?")
    conversation.updateQuestion("Start create a user \n [yes]or [no]?")
    conversation.addChoice(/yes/i, function1)
    conversation.addChoice(/no/i, function5)


API

conversation is an instance of an EventEmitter

It emits an end event when the dialog with the user is done
API method	description	Params	example

robot.e.createDialog(robot)

	 Returns a Dialog singleton object.

     robot: instance of hubot's Robot.




switchBoard = robot.e.createDialog(robot)


initSchema(schemaName , schema )

	 Returns a new conversation schema object.

    schemaName: instance of hubot's Robot.
    schema: pattern one json schema or pattern two message model.




  userSchema = {
    "type": 'object',
    "required": [
      'name'
      'email'
    ],
    "properties":{
      "name": {
        "description": 'full name',
        "type": 'string',
        "minLength": 8
      }
    }
  }

  schema = switchBoard.initSchema('User', userSchema)
  switchBoard.startDialog(msg, 'create user', schema)


 startDialog(msg, conversationName, schema, expireTime)	 Returns a new conversation object, with a default expire time 1h.

    msg: An incoming message heard / responded to by the robot. eg:

    robot.respond(/foo/,function(msg){
       var dialog = conversation.startDialog(msg);
    })

    conversationName: conversation name.
    schema: schema object.
    expireTime: expire time.




robot.respond(/foo/,function(msg){
   var dialog =
conversation.startDialog(msg);
})


 addChoice(regex, handler)	 Adds a listener choice to this Dialog. If a message is received that matches the choice regex, the handler will be executed.(only custom pattern)

    regex: a regular expresion that will be aplied to the incoming message from the receive function
    handler: function(message), A function that is executed against a successfully matched message. The match property of the original


updateQuestion	 Update last question.(only custom pattern)

     value: String - question


updateAnswers	 Update all answers.(only custom pattern)

     value: String - answer


conversation manager command
Command	Params	example
show conversation {conversationId|all}

    conversationId
    all
    default :current conversation




show conversation all
show conversation 56465621321
show conversation


resume conversation {conversationId|all}



    conversationId
    all
    default :current conversation




resume conversation 56465621321
resume conversation


cancel conversation {conversationId|all}



    conversationId
    all
    default :current conversation




cancel conversation all
cancel conversation 56465621321
cancel conversation



Hubot Enterprise Internationalization


Hubot Enterprise Internationalization Module is designed to support internationalization. It supports changing localization dynamically on a per-channel basis.

Product can call the function robot.e.registerI18nApi after register their integration into HE.
API method	description	Params	example

robot.e.registerI18nApi(integrationName, prefix, defaultLocale, locales)
	register I18n Api for your integration

    integrationName: (String) product name
    prefix:(String) your json files prefix , (‘itsma-’)
    defaultLocale: (string) (optional) the default locale for your i18n api register object
                              e.g: ‘zh’, ‘en’, ‘de’…..
    locales:(Array) The product supports locales(e.g: [‘en’, ‘zh’, ‘de’]), it should correspond to the resource files, at least you must supports en.




robot.e.registerI18nApi({
  integrationName: 'super',
  prefix: 'super-',
  defaultLocale: 'en'
  locales: ['en', 'zh']
});



If product have some special strings need Hubot Enterprise return to UI, product should provide the resource file(json format) which contain the special strings, the file name must have a prefix, such as `itsma-de.json`.One important thing is that  product must put these files into the directory `/locales` under Hubot Enterprise Root directory before register their i18n api.


If product have a string ‘Hello’  need internationalization ,a usage about json files as below:

//sm-en.json
{
	“Hello” : “Hello”
}
//sm-de.json
{
	“Hello”: “Hallo”
}
//sm-zh.json
{
	“Hello”: “您好”
}


There is a usage as below:

    You should registerI18nApi for your integration(before this you must call the robot.e.registerIntegration), There is two json files: super-en.json and super-zh.json

    //super-en.json:
    {
    	"Hello": "Hello itsma",
    	"locale langurage desc": "locale langurage desc",
    	"set the channel purose": "set the channel purose",
    	"set the channel topic": "set the channel topic",
    	"channel management": "channel management",
    	"get channel history": "get channel history",
    	"list all the channels": "list all the channels",
    	"list all the users": "list all the users",
    	"Invite user to channel": "Invite user to channel",
    	"post message to channel": "post message to channel",
    	"render an attachment": "render an attachment",
    	"render an attachment with customized template": "render an attachment with customized template"
    }
    //super-zh.json:
    {
    	"Hello": "Hello itsma",
    	"locale langurage desc": "语言模块",
    	"set the channel purose": "设置频道目的",
    	"set the channel topic": "设置频道主题",
    	"channel management": "频道管理",
    	"get channel history": "频道历史信息管理",
    	"list all the channels": "总频道管理",
    	"list all the users": "所有用户管理",
    	"Invite user to channel": "邀请",
    	"post message to channel": "频道发送消息",
    	"render an attachment": "渲染UI",
    	"render an attachment with customized template": "渲染附件"
    }

    //Call function robot.e.registerI18nApi
    robot.e.registerI18nApi({
       integrationName: 'super',
       prefix: 'super-',
       defaultLocale: 'en'
      locales: ['en', 'zh']
     });



    @bot help in a channel
    The channel default locale is English
    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > image2017-9-30 14:7:48.png]

    now I want to change the channel ‘test’ locale into Chinese
                   Set  or Get  Channel Locale
    Hubot Enterprise unified adapter provide two public api to set or get the channel’s locale.
    You can use two ways : register a command  in HE or register scripts into command receiver to do it.
    I use the first way:
    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > image2017-9-30 14:15:57.png]

     now input ‘help’ again

    [ITOM ChatOps Platform > Developer Guide for 2018.01 Release > image2017-9-30 14:16:21.png]
    These also supported in a group. And per channel or group can be different localization in the same time.


Create content package

Requirements:

Your system just needs to meet these three requirements:

    Linux
    Nodejs, (v8.10.0+ is recommended)

Usage:

    Create content package(.zip)
        Run `yarn build:content {PACKAGE_NAME}`
        or `npm run build:content {PACKAGE_NAME}` .
        Upload content package via rest API.
            You can access the API:  https://{hostname}:3000

Args:

    PACKAGE_NAME: Your package or integration name, like "foobar". PACKAGE_NAME must be only ascii characters (a..z, 0..9) with no special characters besides "-" (not allowed as first character).


Example:

yarn build:content foobar

This script will extract $version from “/scripts/foobar/package.json”, and create a zip file with name "foobar_${VERSION}.zip" and the following content:

    Take all files from locales/ that match the pattern "foobar*.json" and place them into /locales/ directory in the zip file
    Take all files from scripts/foobar directory and place them into /foobar/ directory in the zip file


Structure of the package:

    /foobar/*.js  -  integration script file
    /foobar/package.json  -  package metadata like version, dscription, license, support contact, ...
    /foobar/node_modules  -  optional directory for additional extracted npm packages that are needed by the integration
    /locales/foobar*.json  -  language pack (language packs must start with the package name)


ChatOps Containerization with CDF Adoption

Docker image entry point:

    Harbor: cdfregistry.hpeswlab.net/hpeswitom/itom-chatops:{version}
    portus: portus.hpeswlab.net:5000/hpeswitomsandbox/itom-chatops:{version}


Service for chatops-config

See yaml example below(you need to change the value in Red).

Example:

apiVersion: v1
kind: Service
metadata:
    name: itom-chatops-config-svc
    namespace: demo1
spec:
    ports:
    - name: itom-chatops-config-server
      port: 5000
      targetPort: 5000
    selector:
        app: itom-chatops-config


Ingress for chatops-config

See yaml example below(you need to change the value in Red).

Example:

apiVersion: extensions/v1beta1
kind: Ingress
metadata:
    name: itom-chatops-config-ingress
    namespace: demo1
    annotations:
        ingress.kubernetes.io/secure-backends: "true"
        kubernetes.io/ingress.class: "nginx"
spec:
    rules:
    - host: sgdlitvm0446.hpeswlab.net
      http:
      paths:
      - backend:
            serviceName: itom-chatops-config-svc
            servicePort: 5000
        path: /chatops/config
Deployment for chatops-config

Edit your yam file, add two additional containers for generating vault token and token renew.
One is init container and another one is generic container.
See yaml example below(you need to change the value in Red).

Example:

apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: itom-chatops-config-deployment
  namespace: demo1
  labels:
    app: itom-chatops-config
spec:
  replicas: 1
  selector:
    matchLabels:
      app: itom-chatops-config
  template:
    metadata:
      labels:
        app: itom-chatops-config
      annotations:
        pod.boostport.com/vault-approle: core-baseinfra
        pod.boostport.com/vault-init-container: install
    spec:
      initContainers:
      - name: install
        image: localhost:5000/kubernetes-vault-init:0.5.0
        securityContext:
          runAsUser: 1999
        env:
        - name: VAULT_ROLE_ID
          value: 446e584d-3e42-7b0a-5290-bf493baa1dd3
        - name: CERT_COMMON_NAME
          value: sgdlitvm0446.hpeswlab.net
        volumeMounts:
        - name: vault-token
          mountPath: /var/run/secrets/boostport.com
      containers:
      - name: itom-chatops-config
        image: portus.hpeswlab.net:5000/hpeswitomsandbox/itom-chatops:4.0.0
        args:
        - "config"
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /health-status
            port: 5000
            scheme: HTTPS
          initialDelaySeconds: 300
          periodSeconds: 30
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 5
        env:
        - name: ENV_TYPE
          value: "kubernetes"
        - name: SUITE_NAMESPACE
          value: demo1
        - name: EXTERNAL_ACCESS_PORT
          value: 5443
        - name: HUBOT_VAULT_APP_ROLE
          value: core-baseinfra
        - name: HUBOT_VAULT_ROLE_ID
          value: 446e584d-3e42-7b0a-5290-bf493baa1dd3
        - name: HUBOT_CHATOPS_IMAGE
          value: portus.hpeswlab.net:5000/hpeswitomsandbox/itom-chatops:4.0.0
        - name: PRIVATE_KEY_FILE_VAULT_KEY
          value: chatops_private_key_vault_key
        - name: CERTIFICATE_FILE_VAULT_KEY
          value: chatops_cert_file_vault_key
        - name: HTTP_PROXY_ENDPOINT
          value: http://web-proxy.il.hpecorp.net:8080
        - name: IDM_INTEGRATION_USERNAME
          value: admin
        - name: IDM_INTEGRATION_PASSWORD_VAULT_KEY
          value: chatops_idm_integration_password_vault_key

        - nams: ADMIN_INTEGRATION_USERNAME

           value: transport_admin
        - name: ADMIN_INTEGRATION_PASSWORD_VAULT_KEY
          value: idm_transport_admin_password
        volumeMounts:
        - name: vault-token
          mountPath: /var/run/secrets/boostport.com
        - name: itom-chatops-config-db
          mountPath: /var/opt/microfocus/chatops-config/db
          subPath: chatops/db
      - name: kubernetes-vault-renew
        image: localhost:5000/kubernetes-vault-renew:0.5.0
        imagePullPolicy: IfNotPresent
        volumeMounts:
        - name: vault-token
          mountPath: /var/run/secrets/boostport.com
      volumes:
      - name: itom-chatops-config-db
        persistentVolumeClaim:
          claimName: conf-pv-claim
      - name: vault-token
        emptyDir: {}


Itom-chatops-config container environment variables description:

    SUITE_NAMESPACE: Your namespace.
    EXTERNAL_ACCESS_PORT: CDF server external port.
    HUBOT_VAULT_APP_ROLE: Vault app role (For annotation pod.boostport.com/vault-approle, the format of vaule is {NAMESPACE}-{APPROLE}).
    HUBOT_VAULT_ROLE_ID: The vaule is the ROLE_ID you get after you set NAMESPACE and APPROLE in CDF.
    HUBOT_CHATOPS_IMAGE:  Chatops image, in my case it’s portus.hpeswlab.net:5000/hpeswitomsandbox/itom-chatops:4.0.0.
    PRIVATE_KEY_FILE_VAULT_KEY: The vault key of private key for creating chatops https server.
    CERTIFICATE_FILE_VAULT_KEY: The vault key of certificate for creating chatops https server.
    HTTP_PROXY_ENDPOINT:  Your HTTP proxy (optional).

    IDM_INTEGRATION_USERNAME: the login user of your idm integration
    IDM_INTEGRATION_PASSWORD_VAULT_KEY: the login password of your idm integration user.


'-----BEGIN CERTIFICATE-----\nMIIFXTCCA0WgAwIBAgIJAPPzEltL/LNcMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\nqXQ7\ndFZfzDgfy+EeMDstzk8uxf33mT4dLQDFn6admwOWF3L/\n-----END CERTIFICATE-----'

'-----BEGIN PRIVATE KEY-----\nMIIJQwIBADANBgkqhkiG9w0BAQEFAASCCS0wggkpAgEAAoICAQC2AdgzktgUuGip\ne//GIEN4BwQFmEGbPyXDNUSUPru0UsA=\n-----END PRIVATE KEY-----'
Start containerized Mattermost with your own Database

we have provided a mattermost image for you , here we take Mysql for an example and you can use your own database.

#pull mysql image
docker pull mysql:5.6
#start mysql container
docker run -p 3306:3306 --name my-mysql -e MYSQL_ROOT_PASSWORD=123456 -d mysql:5.6
#go into mysql cotainer and create database
docker ps -a //find the container id
docker exec -it <container id> /bin/bash

mysqladmin -u root -p create mattermost
Enter password:******* //${MYSQL_ROOT_PASSWORD} 123456
\q
mysql -u root -p
Enter password:******* //${MYSQL_ROOT_PASSWORD} 123456

#statr mattermost. replace the {host ip},{cert path},{cert file path},{key file path}
#cert file and key file should under the  directory of certs path
#example
#there're cert.pem and key.pem under /root/certs
# /root/certs mount on the directory of /etc/opt/certs in container
# /etc/opt/certs/cert.pem
# /etc/opt/certs/key.pem

#if you want to use the mattermost image we provide , you can see below command.
docker run --name mm -p 8065:8065 \
 -e MM_SQLSETTINGS_DRIVERNAME=mysql \
 -e MM_SQLSETTINGS_DATASOURCE="root:123456@tcp(your host ip:3306)/mattermost?charset=utf8mb4,utf8&readTimeout=30s&writeTimeout=30s" \
 -e DB_HOST={you mysql host ip} \
 -e DB_PORT_NUMBER=3306 \
 -e MM_CERT_FILE=/etc/opt/certs/{cert file name} \
 -e MM_KEY_FILE=/etc/opt/certs/{key file name} \
 -v your certs path:/etc/opt/certs \
 -d portus.hpeswlab.net:5000/hpeswitomsandbox/itom-matermost-poc:v2.0.4