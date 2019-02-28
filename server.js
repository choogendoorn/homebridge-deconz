const WebSocket = require('ws');
const fetch = require('node-fetch');
const chalk = require('chalk');


const ip = '83.83.196.151';
const apikey = '51F7450DCC';
const baseUrl = `http://${ip}/api/${apikey}`;

const deviceTypes = { 'On/Off plug-in unit': 'outlet', 'Dimmable light': 'dimlight' };

let lights = {};

class DeconzNode {

  constructor() {
    this._onChangeLightEmitters = [];
  }

  async _getWebSocketConfig() {
    const config = await fetch(`${baseUrl}/config`).then(data => data.json());
    return config;
  }

  _initWebsocket(port) {
    const ws = new WebSocket(`ws://${ip}:${port}`);

    ws.onmessage = (msg) => {
      const event = JSON.parse(msg.data);
      switch (event.r) {
        case 'lights':
          this._handleUpdateLight(event);
          break;
        default:
          console.log(event);
          break;
      } 
    }
  }

  async init() {
    this._fetchLights();
    const { websocketport } = await this._getWebSocketConfig();
    this._initWebsocket(websocketport);
  }

  async _fetchLights() {
    const data = await fetch(`${baseUrl}/lights`).then(data => data.json());
    lights = data;
    this._logLights();
    // updateLight(1, {on: false});

  }

  async _updateLight(id, state) {
    const request = await fetch(
      `${baseUrl}/lights/${id}/state`,
      {
        method: 'PUT',
        body: JSON.stringify(state),
        headers: {
          'Content-Type': 'application/json'
        },
      }).then(data => data.json());
  }

  _generateLogMessage(id) {
    const light = lights[id];
    if (!light || !id) return '';
    const status = light.state.on ? chalk.green.bold('aan') : chalk.red('uit');
    return `${light.name}: ${status} (${deviceTypes[light.type] === 'dimlight' ? light.state.bri : '-'})`
  }

  _logLights(id = false) {
    const msg = id ? this._generateLogMessage(id) : Object.keys(lights).map(this._generateLogMessage).join('\r\n');
    console.log(msg);
  }

  _handleUpdateLight(event) {
    if (lights[event.id]) lights[event.id].state = { ...lights[event.id].state, ...event.state };
    this._onChangeLightEmitters.forEach((emitter) => {emitter(lights[event.id])})
    this._logLights(event.id);
  }

  onChangeLight(emitter) {
    this._onChangeLightEmitters.push(emitter);
  }

}

const deconz = new DeconzNode();

deconz.init();
deconz.onChangeLight((light) => {console.log('light: ', light)});