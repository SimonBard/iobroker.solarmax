'use strict';

/*
 * Created with @iobroker/create-adapter v1.23.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const fs = require("fs");

const lib = require('./lib/lib.js');
let UpdateIntervall = null;


class SolarmaxIobrokerAdapter extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'solarmax-iobroker-adapter',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('objectChange', this.onObjectChange.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here


		// State setzen
		this.setObjectNotExists('data.PV-Leistung', {
			type: 'channel',
			common: {
				name: 'name',
				type: 'number',
				
				read: false,
				write: true,
				unit: 'W'
			},
			native: {}
		});


		try {
			await lib.init(this, '192.168.178.6', 12345);
			this.log.info('Adapter wurde gestartet');
		} catch (error) {
			this.log.error(error);
			this.log.info('Adapter start failed');
		}

		
		
		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		//this.log.info('config option1: ' + this.config.option1);
		//this.log.info('config option2: ' + this.config.option2);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
		*/


		this.setObjectNotExists('data.PVLeistung', {
			type: "state",
			common: {
				name: 'PV-Leistung',
				type: 'number',
				role: 'value',
				read:  true,
				write: true,
				unit: 'W',
			},
			native: {}
		});

		this.setObjectNotExists('data.LeistungHeute', {
			type: "state",
			common: {
				name: 'LeistungHeute',
				type: 'number',
				role: 'value',
				read:  true,
				write: true,
				unit: 'W',
			},
			native: {}
		});

		this.setObjectNotExists('data.Test', {
			type: "state",
			common: {
				name: 'Test',
				type: 'number',
				role: 'value',
				read: true,
				write: true,
				unit: 'W',
			},
			native: {}
		});

		// Testweise ein sDevMAC eingef�hrt
		const sDevMAC = 'TestDevice';
		await this.createDevice(sDevMAC);
		await this.createState(sDevMAC, "", "temperature", { role: "level", write: true, type: "number", unit: "�C", min: 5, max: 30 });

		lib.query(['PAC']);

		this.UpdateStates();

		// in this template all states changes inside the adapters namespace are subscribed
		this.subscribeStates('*');



		/*
		setState examples
		you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the variable testVariable is set to true as command (ack=false)

		// hier k�nnte man das array aus der lib abfragen und in die states schreiben
		this.setState('data.LeistungHeute', 500, true);
		

		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		//await this.setStateAsync('testVariable', { val: true, ack: true });

		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		//let result = await this.checkPasswordAsync('admin', 'iobroker');
		//this.log.info('check user admin pw iobroker: ' + result);

		//result = await this.checkGroupAsync('admin', 'admin');
		//this.log.info('check group user admin group admin: ' + result);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			if (UpdateIntervall) {
				clearInterval(UpdateIntervall);
				UpdateIntervall = null;
			}
			this.log.info('cleaned everything up...');
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 * @param {string} id
	 * @param {ioBroker.Object | null | undefined} obj
	 */
	onObjectChange(id, obj) {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.message" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }

	UpdateStates() {

		UpdateIntervall = setTimeout(() => this.UpdateStates(), 2 * 1000);
			//UpdateIntervall = setTimeout(() => this.UpdateStates(), this.config.Abfrageintervall * 1000);
		
		

	}


}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new SolarmaxIobrokerAdapter(options);
} else {
	// otherwise start the instance directly
	new SolarmaxIobrokerAdapter();
}