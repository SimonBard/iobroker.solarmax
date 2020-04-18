/*


# This program is free software: you can redistribute it and / or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
#(at your option) any later version.
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.If not, see < http://www.gnu.org/licenses/>.

# Developed 2020 by Simon Bard < simonbard@gmail.com> 
# for own use.
# Released to the public in 20202.

*/


const utils = require('@iobroker/adapter-core'); // Get common adapter utils

const net = require('net');

// Konstanten
const inverter_types = {
    20010: { 'desc': 'SolarMax 2000S', 'max': 2000, }, // Nur geraten
    20020: { 'desc': 'SolarMax 3000S', 'max': 3000, },
    20030: { 'desc': 'SolarMax 4200S', 'max': 4200, },
    20040: { 'desc': 'SolarMax 6000S', 'max': 6000, },
}


const query_types = ['KDY', 'KYR', 'KMT', 'KT0', 'IL1', 'IDC', 'PAC', 'PRL',
    'SYS', 'SAL', 'TNF', 'PAC', 'PRL', 'TKK', 'UL1', 'UDC',
    'ADR', 'TYP', 'PIN', 'MAC', 'CAC', 'KHR', 'EC00', 'EC01',
    'EC02', 'EC03', 'EC04', 'EC05', 'EC06', 'EC07', 'EC08',
    'BDN', 'SWV', 'DIN', 'LAN', 'SDAT', 'FDAT']


const status_codes = {
    20000: 'Keine Kommunikation',
    20001: 'In Betrieb',
    20002: 'Zu wenig Einstrahlung',
    20003: 'Anfahren',
    20004: 'Betrieb auf MPP',
    20005: 'Ventilator l‰uft',
    20006: 'Betrieb auf Maximalleistung',
    20007: 'Temperaturbegrenzung',
    20008: 'Netzbetrieb',
}


const alarm_codes = {
    0: 'kein Fehler',
    1: 'Externer Fehler 1',
    2: 'Isolationsfehler DC-Seite',
    4: 'Fehlerstrom Erde zu Groﬂ',
    8: 'Sicherungsbruch Mittelpunkterde',
    16: 'Externer Alarm 2',
    32: 'Langzeit-Temperaturbegrenzung',
    64: 'Fehler AC-Einspeisung',
    128: 'Externer Alarm 4',
    256: 'Ventilator defekt',
    512: 'Sicherungsbruch',
    1024: 'Ausfall Temperatursensor',
    2048: 'Alarm 12',
    4096: 'Alarm 13',
    8192: 'Alarm 14',
    16384: 'Alarm 15',
    32768: 'Alarm 16',
    65536: 'Alarm 17',
}

let __adapter;


let __host;
let __port;
let __inverters;
let __socket;
let __connected;
let __allinverters;
let __inverter_list;


// Hilfs - Routine(DEBUG)

function DEBUG(s) {
    var d = new Date();
    __adapter.log.debug(s);
}


function init(adapterInstance, host, port) {
    __host = host;
    __port = port;
    __inverters = {};
    __socket = null;
    __connected = false;
    __allinverters = false;
    __inverter_list = [];
    __adapter = adapterInstance;
    __connect();
    
}

function __disconnect() {
    try {
        DEBUG(`Closing open connection to ${__host}, ${__port}`);

        
        __socket.on('close', function () {
            DEBUG('Connection closed');
            __socket.destroy(); // kill client
        });
    }
    catch (e) {
    }

    finally {
        __connected = false;
        __allinverters = false;
        __socket = null;

    }
}


function __connect() {
    __disconnect(); //kill server connection, wahrscheinlich nicht notwendig

    DEBUG(`establishing connection to ${__host}, ${__port}`);
    try {
        __socket = net.createConnection(__port, __host, function () {
            DEBUG('Connected');
        });

        __socket.on('data', function (data) {
            DEBUG('Received ' + data.toString());
            __parse(data.toString());
        });

        __socket.on('end', function () {
            __disconnect();
        })

        __connected = true;
    }
    catch (e) {
        DEBUG(`connection to ${__host}, ${__port} failed with ${e.message}`);
        __connected = false;
        __allinverters = false;
    }


}




// Utility - functions
function hexval(i) {
    return i.toString(16).toUpperCase();
}


function checksum(s) {
    var total = 0;
    for (var i = 0; i < s.length; i++) {
        total += s.charCodeAt(i);
    } 
    var h = hexval(total);
    while (h.length < 4) {
        h = '0' + h;
    }
    return h;
}


function __parse(answer) {

    // Klammern am Anfang und Ende entfernen
    answer = answer.slice(1, -1);
    // Checksumme wegschneiden
    var checksum = answer.slice(-4);
    answer = answer.slice(0, -4);
    // Header wegschneiden und letztes pipe (|) wegschneiden
    var content = answer.slice(12,-1)

    //console.log('SlicedAnswer ist jetzt ' + answer, 'Checksumme: ' + checksum + ' content: ' + content);

    //erst wird die R¸ckgabe des Wechselrichters aufgesplittet nach den Paaren aus Key und dessen wert
    var allKeysAndValues = content.split(';');


    var keys = new Array();
    var values = new Array();

    for (var item in allKeysAndValues) {

        //dann werden die Paare aufgeteilt nach Key und Wert und anschlieﬂend als Tupel in einem Array gespeichert
        var singleKeyAndValueArray = allKeysAndValues[item].split('=');
        
        var key = singleKeyAndValueArray[0];
        var value = singleKeyAndValueArray[1];

        
        keys.push(key);
        values.push(value);
        
    }
    normalize(keys, values);
}


function normalize(keys, values) {  
    

    for (let i = 0; i < keys.length; i++) {

       
        let key = keys[i];
        let value = values[i];
        let tmp_value = value;

        if (key == 'PAC') {
            tmp_value = (parseInt(value, 16))/2;
            
        }

        if (key == 'PIN') {
            tmp_value = (parseInt(value, 16)) / 2;

        }

        if (key == 'KDY') {
            tmp_value = parseInt(value, 16);
            tmp_value = tmp_value / 10;
    
        }
        if (key == 'KLD') {
            tmp_value = parseInt(value, 16);
            tmp_value = tmp_value / 10;

        }

        if (key == 'KLM') {
            tmp_value = parseInt(value, 16);
            tmp_value = tmp_value;

        }

        if (key == '') {
            tmp_value = (parseInt(value, 16)) / 2;
        }
        if (key == '') {
            tmp_value = (parseInt(value, 16)) / 2;
        }
        
        values[i] = tmp_value;
    }
        

    // Werte den Objekten in iobroker ¸bergeben zur Ausgabe
    for (let i = 0; i < keys.length; i++) {
        DEBUG('Wert von ' + keys[i] + ' ist ' + values[i]);

        if (keys[i] == 'PAC') {
            __adapter.setState('data.PAC', values[i], true);
        }

        if (keys[i] == 'KLD') {
            __adapter.setState('data.KLD', values[i], true);
        }

        if (keys[i] == 'KLM') {
            __adapter.setState('data.KLM', values[i], true);
        }
        
    }
}
    


function __build_query(values) {
    var qtype = hexval(100);
    values = values.join(';');

    let querystring = '|' + qtype + ':' + values + '|';
    // L‰nge vergrˆﬂern um: 2 x {
    //(2), WR - Nummer(2), "FB"(2), zwei Semikolon(2), L‰nge selbst(2), checksumme(4)
    let l = querystring.length + 2 + 2 + 2 + 2 + 2 + 4;
    querystring = `FB;01;${hexval(l)}${querystring}`;
    querystring += checksum(querystring);
    return '{' + querystring + '}';
}


function __send_query(querystring) {
    try {
        DEBUG(__host +  '=>' + querystring);
        __socket.write(querystring);
    }
    catch (e) {
        __allinverters = false;
        __connected = false;
    }
}




function query(values) {
    let q = __build_query(values);
    __send_query(q);
}


function drucken(satz) {
    console.log(satz);
}


module.exports = {
    drucken,
    init,
    query
}