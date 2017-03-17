'use strict';

var Events = (function() {
    var _ = require('private-parts').createKey();

    /*
     * Instantiate Events
     *
     * @constructor
     * @name Zyp.Events
     * @access protected

     */
    function Events() {
        _(this).messageHandler = null;
        _(this).errorHandler = null;
        _(this).notificationHandler = null;
    }

    /* static function for firing events */
    Events.prototype.fire = function(type, p1, p2) {
        switch(type) {
            case 'message':
                if (_(this).messageHandler) {
                    _(this).messageHandler.cb(p1, _(this).messageHandler.context);
                }
                break;
            case 'error':
                if (_(this).errorHandler) {
                    _(this).errorHandler.cb(p1, _(this).errorHandler.context);
                }
                break;
            case 'notification':
                if (_(this).notificationHandler) {
                    _(this).notificationHandler.cb(p1, p2, _(this).notificationHandler.context);
                }
                break;
        }
    };

    /*
     * Set an envent handler callback function for ZypHub Events.
     *
     * @memberof Zyp.Events
     * @function Zyp.Events#on
     *
     * @param type The event type
     * @param {EventHandlerCallback} callback The handler function that will be called for ZypHub events
     * @param {Object} [ctx]  A user defined context object that may also be passed to the handler with the event data
     */
    Events.prototype.on = function(type, callback, ctx) {
        switch(type) {
            case 'message':
                _(this).messageHandler = {cb:callback, context: ctx};
                break;
            case 'error':
                _(this).errorHandler = {cb:callback, context: ctx};
                break;
            case 'notification':
                _(this).notificationHandler = {cb:callback, context: ctx};
                break;
        }
    };

    return Events;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = Events;
}

