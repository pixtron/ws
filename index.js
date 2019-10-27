const {EventEmitter} = require('events');

const WebSocket = require('ws');

const defaultLogger = require('./lib/logger.js');

const READY_STATE_INITIAL = 0;
const READY_STATE_CONNECTING = 1;
const READY_STATE_CONNECTED = 2;
const READY_STATE_CLOSING = 3;
const READY_STATE_RECONNECTING = 4;

module.exports = class Ws extends EventEmitter {
  constructor(url, options={}, logger = defaultLogger) {
    super();

    this.url = url;
    this.logger = logger;
    this.readyState = READY_STATE_INITIAL;
    this.pingInterval = null;
    this.pongTimeout =  null;

    this.options = {
      pongTimeout: 1000,
      pingInterval: 10000,
      reconnectTimeout: 500,
      ...options
    }

    this._subscriptions = new Set();

    this._connect();
  }

  subscribe(channels) {
    if(!Array.isArray(channels)) channels = [channels];
    channels.forEach(channel => this._subscriptions.add(channel));

    // subscribe not necessary if not yet connected (will subscribe onOpen)
    if(this.readyState === READY_STATE_CONNECTED) this._subscribe(channels);
  }

  unsubscribe(channels) {
    if(!Array.isArray(channels)) channels = [channels];

    channels.forEach(channel => this._subscriptions.delete(channel));

    // unsubscribe not necessary if not yet connected
    if(this.readyState === READY_STATE_CONNECTED) this._unsubscribe(channels);
  }

  close() {
    this.logger.info('Closing connection', {category: 'ws'});
    this.readyState = READY_STATE_CLOSING;
    this._teardown();
    this.ws.close();
  }

  async _connect() {
    try {
      if(this.readyState === READY_STATE_INITIAL) this.readyState = READY_STATE_CONNECTING;

      this.ws = new WebSocket(this.url);

      this.ws.on('open', this._wsOpenHandler.bind(this));
      this.ws.on('message', this._wsMessageHandler.bind(this));
      this.ws.on('error', this._wsOnErrorHandler.bind(this));
      this.ws.on('close', this._wsCloseHandler.bind(this));
      this.ws.on('pong', this._wsPongHandler.bind(this));
    } catch(err) {
      this.logger.error('Connection failed', err);
      this._reconnect(this.options.reconnectTimeout);
    }
  }

  _reconnect(timeout) {
    this._teardown();
    this.readyState = READY_STATE_RECONNECTING;

    setTimeout(() => {
      this.logger.info('Reconnecting to server', {category: 'ws'});

      this._connect();
    }, timeout);
  }

  _ping() {
    clearTimeout(this.pongTimeout);
    this.pongTimeout = null;

    this.logger.silly('Sending ping', {category: 'ws'});
    this.ws.ping();

    this.pongTimeout = setTimeout(() => {
      this.logger.info('Pong timeout', {category: 'ws'});
      this._teardown();
      this.ws.terminate();
    }, this.options.pongTimeout);
  }

  _wsPongHandler() {
    clearTimeout(this.pongTimeout);
    this.logger.silly('Pong recieved', {category: 'ws'});
  }

  _teardown() {
    if(this.pingInterval) clearInterval(this.pingInterval);
    if(this.pongTimeout) clearTimeout(this.pongTimeout);

    this.pongTimeout = null;
    this.pingInterval = null;
  }

  _wsOpenHandler() {
    if(this.readyState === READY_STATE_CONNECTING) {
      this.logger.info('Websocket connected', {category: 'ws', livenet: this.options.livenet});
      this.emit('open');
    }

    this.readyState = READY_STATE_CONNECTED;

    this._subscribe([...this._subscriptions]);
    this.pingInterval = setInterval(this._ping.bind(this), this.options.pingInterval);
  }

  _wsMessageHandler(message) {
    const data = JSON.parse(message);

    switch(data.type) {
      case 'response':
        this._handleResponse(data);
      break;
      case 'update':
        this._handleUpdate(data);
      break;
      default:
        this.logger.warn('Unhandled message type', {category: 'ws', message});
      break;
    }
  }

  _handleResponse(response) {
    switch(response.op) {
      case 'subscribe':
        if(response.success) {
          this.logger.debug(`Successfully subscribed to channel "${response.data.channel}"`, {category: 'ws'});
        } else {
          this.logger.error(`Could not subscribe to channel "${response.data.channel}"`, {category: 'ws', response});
        }
      break;
      case 'unsubscribe':
        if(response.success) {
          loggerdebug(`Successfully unsubscribed from channel "${response.data.channel}"`, {category: 'ws'});
        } else {
          this.logger.error(`Could not unsubscribe from channel "${response.data.channel}"`, {category: 'ws', response});
        }
      break;
      default:
        this.logger.warn('unhandled response', {category: 'ws', response});
      break;
    }
  }

  _wsOnErrorHandler(err) {
    this.logger.error('Websocket error', {category: 'ws', err});
    if(this.readyState === READY_STATE_CONNECTED) this.emit('error', err);
  }

  _wsCloseHandler() {
    this.logger.info('Websocket connection closed', {category: 'ws'});

    if(this.readyState !== READY_STATE_CLOSING) {
      this._reconnect(this.options.reconnectTimeout);
    } else {
      this.readyState = READY_STATE_INITIAL;
      this.emit('close');
    }
  }

  _handleUpdate(update) {
    this.emit('update', update);
  }

  _subscribe(channels) {
    channels.forEach(channel => {
      const msgStr = JSON.stringify({
        op: 'subscribe',
        channel
      });

      this.ws.send(msgStr);
    });
  }

  _unsubscribe(channels) {
    channels.forEach(channel => {
      const msgStr = JSON.stringify({
        op: 'unsubscribe',
        channel
      });

      this.ws.send(msgStr);
    });
  }
}
