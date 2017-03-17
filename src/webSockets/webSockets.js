/**
 * Created by randy on 1/6/17.
 */

import SocketWorker             from './socketWorker';
import SubjectObserver          from './subject';


var WS = (function() {

    function WS(events) {
        this._events = {};
        this._socketWorkers = {};
        this._socketWatch = null;
        this._fire = events.fire;
        this._subjectObserver = new SubjectObserver();
    }

    WS.prototype.connect = function(token, handler) {
        var sw = new SocketWorker(token, this._subjectObserver);
        sw.connect();
        if (!this._socketWorkers) {
            this._socketWorkers = {};
        }
        this._socketWorkers.ws = sw;
        this._subjectObserver.registerObserver(handler);

        this._socketWatch = setInterval(() => {
            if (sw._connection) {
                if (sw._connection.readyState === 1) {
                    sw._connection.send('ping');
                    this._fire('notification','websocket:connectionUp', {readyState: sw._connection.readyState})
                }
                else {
                    this._fire('notification','websocket:connectionDown', {readyState: sw._connection.readyState})
                }
            } else {
                this._fire('notification', 'websocket:noConnection')
            }
        }, 30000);
    };

    WS.prototype.close = function(handler) {
        var sw = this._socketWorkers.ws;
        if (sw) {
            sw.close();
            this._socketWorkers.ws = null;
        }
        this._subjectObserver.unregisterObserver(handler);
        clearInterval(this._socketWatch);
        this._socketWatch = null;
    };

    return WS;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = WS;
}
