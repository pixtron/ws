# @pxtrn/wss

Client for `@pxtrn/wss` pub/sub websocket server

## Installation

`npm install --save @pxtrn/ws`

## Usage

### Basic example

```js
const Ws = require('@pxtrn/ws');

const client = new Ws('wss://example.com');

client.on('update', (update) => {
  console.log(`Got update for channel ${update.channel}`, update.data);
});

client.subscribe('cats');
```

## API

### Table of Contents

- [Class: Ws](#class-ws)
  - [new Ws(url[, options[, logger]])](#new-wsurl-options-logger)
  - [Event: 'close'](#event-close)
  - [Event: 'error'](#event-error)
  - [Event: 'open'](#event-open)
  - [Event: 'update'](#event-update)
  - [async client.subscribe(channels)](#async-clientconnectchannels)
  - [async client.unsubscribe(channels)](#async-clientconnectchannels)
  - [async client.close()](#async-clientclose)

### Class: Ws

This class represents a websocket server with simple pub/sub. It extends EventEmitter.

#### new Ws(url[, options[, logger]])

  `url` {String} Url of the @pxtrn/wss server
- `options` {Object} Optional options
  - `pingInterval` {Integer} Interval in ms for heartbeat ping. Default: `10000`,
  - `pongTimeout` {Integer} Timeout in ms waiting for heartbeat pong response
     from server. Default: `1000`,
  - `reconnectTimeout` {Integer} Timeout in ms the client waits before trying
     to reconnect after a lost connection. Default: `500`
- `logger` {Object}

  custom logger containing the following methods
  ```js
  const logger = {
    silly: function(message, data) {},
    debug: function(message, data) {},
    notice: function(message, data) {},
    info: function(message, data) {},
    warning: function(message, data) {},
    error: function(message, data) {},
  }
  ```

#### Event: 'close'

Emitted when the connection has been closed.

#### Event: 'error'

- `error` {Error}

Emitted when an error occurs.

#### Event: 'open'

Emitted when the has been opened.

#### Event: 'update'

- `update` {Object}
  - `channel` {String} The channel for which the update is.
  - `data` {Mixed} Data the server sent

Emitted when the server emits a channel update.

#### async client.subscribe(channels)
- `channels` {String|Array} Single channel or array of channels

Subscribe to one or more channel(s?).

#### async client.unsubscribe(channels)
- `channels` {String|Array} Single channel or array of channels

Unsubscribe from one or more channel(s?).

#### async client.close()

Close the connection to the server
