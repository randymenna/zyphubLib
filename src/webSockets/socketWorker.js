/**
 *
 * Created by randy on 10/9/15.
 */
"use strict";

//import Subject from './subject';
import ReconnectingWebSocket from './reconnecting-websocket';

var SocketWorker = function(token, subjectObserver) {
    this._connection = new ReconnectingWebSocket('ws://beta.conversepoint.com:19691');
    this._waitingForLogin = true;
    this._waitingForLoginResponse = true;
    this._token = token;
    this._subjectObserver = subjectObserver;
};

var debugSocketWorker = false;

SocketWorker.prototype.close = function() {
  this._connection.close(1000,'Client closed socket');
};
    
SocketWorker.prototype.connect = function() {
        var self = this;
        var _connection = this._connection;

        // Setup events once connected
        _connection.onopen = function() {
            if (debugSocketWorker) {
                console.log('websocket connected');
            }
        };

        _connection.onerror = function(error) {
            if (debugSocketWorker) {
                console.log(error);
            }
        };

        _connection.onclose = function(event) {
            if (debugSocketWorker) {
                console.log('web socket close:', event.code, event.reason, event.wasClean);
            }
            self._waitingForLogin = true;
            self._waitingForLoginResponse = true;
        };

        // This function reacts anytime a message is received
        _connection.onmessage = (e) => {
            if (this._waitingForLogin) {
                if (debugSocketWorker) {
                    console.log("Websocket from server: " + e.data);
                }
                if (e.data === 'login'){
                    
                    this._connection.send(this._token);
                    this._waitingForLogin = false;
                }

            } else
            if (this._waitingForLoginResponse) {
                if (debugSocketWorker) {
                    console.log("Websocket from server: " + e.data);
                }
                if (e.data === 'ok') {
                    this._waitingForLoginResponse = false;
                }
            } else {
                if (debugSocketWorker) {
                    console.log(e.data);
                }
                this._subjectObserver.notifyObservers(e.data);
            }
        };
};

export default SocketWorker;
