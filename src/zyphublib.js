'use strict';

import APIUtils                 from './utils/APIUtils';
import Utils                    from './utils/utils';
import Helpers                  from './helpers';
import Events                   from './events';
import User                     from './user';
import Admin                    from './admin';
import WS                       from './webSockets/webSockets';
import Message                  from './message';

var Zyp = (function() {
    var _ = require('private-parts').createKey();

    var _verifyAction = function(action, allowedActions) {
        return (allowedActions.indexOf(action) != -1);
    };

    /*
     * ZypHub Module
     * @public
     * @module Zyp
     */

    /**
     * Instantiate ZypHub
     *
     * @constructor
     * @name Zyp
     * @param {string} [enterpriseToken] An enterprose API Key for login
     *
     * @classdesc
     *
     * @example
     * let zyp = new Zyp();
     *
     * @example
     * let zyp = new Zyp(MY_ENTERPRISE_API_KEY);
     */
    function Zyp(enterpriseToken) {
        _(this)._enterpriseToken = enterpriseToken;
        _(this)._inbox = [];

        _(this)._apiUtils = new APIUtils();

        _(this)._events = new Events();
        _(this).WS = new WS(_(this)._events);
        _(this)._user = new User(_(this)._events, _(this)._apiUtils);
        _(this).Admin = new Admin(_(this)._events, _(this)._user, _(this)._apiUtils);

        _(this)._handleWebsocketNotifications = function(message) {
            if (message === 'fail') {
                return;
            }
            var notification = JSON.parse(message);

            var alertIncommingMessage = (notification.type !== 'UPDATE_EVENT') && (notification.intendedRecipient !== notification.originator);

            if (_(this)._user.getCurrentZypId() !== notification.intendedRecipient) {
                var err = 'Error: got incorrect notification for: ' + notification.intendedRecipient + ' I am ' + _(this)._user.getCurrentZypId();
                //console.log(err);
                return;
            }
            var logMsg = 'Got notification for: ' + notification.intendedRecipient + ' : ' + notification.type;
            console.log(logMsg);


            // find the message (if it isn't new)
            var tmpInbox = _(this)._inbox;
            var found = false;
            for (let i = 0; i < tmpInbox.length; i++) {
                if (notification.id === tmpInbox[i].getId()) {
                    // convert the raw notification to a Message, then get its message json
                    let updateMessage = new Message(notification, _(this)._inbox, _(this)._user, _(this)._events, _(this)._apiUtils);
                    updateMessage = updateMessage.getMessage();

                    // then get the json of the Message already in the inbox
                    let mergedMessage = tmpInbox[i].getMessage();

                    // merge these object, we now have a complete message json
                    Utils.extend(mergedMessage, updateMessage);

                    // if notification.type is LEAVE overwrite instead of merge the envelope
                    if (notification.type === 'LEAVE' || notification.type === 'OK') {
                        mergedMessage.envelope = updateMessage.envelope;
                    }
                    else if (notification.type === 'ACCEPT' || notification.type === 'REJECT') {
                        mergedMessage.envelope.active = updateMessage.envelope.active;
                        mergedMessage.envelope.allowableActions = updateMessage.envelope.allowableActions;
                    }

                    // convert it back to a Message and put it into the original inbox array
                    tmpInbox[i] = new Message(mergedMessage, _(this)._inbox, _(this)._user, _(this)._events, _(this)._apiUtils);
                    found = true;
                    break;
                }
            }
            if (!found) {
                // new conversation or update to one we rejected?
                if (notification.state.open && notification.type === 'NEW' || notification.type === 'FORWARD' || notification.type === 'DELEGATE') {
                    tmpInbox.push(new Message(notification, _(this)._inbox, _(this)._user, _(this)._events, _(this)._apiUtils));
                }
                else {
                    return;
                }
            }

            // we now need to clean and sort the inbox, so we convert everything from Message to JSON
            var conv = [];
            for (let i=0; i < tmpInbox.length; i++) {
                conv.push(tmpInbox[i].getMessage());
            }
            conv = Helpers.sortByModifiedDate(Helpers.removeClosed(conv));

            // and then convert back to Messages
            var inbox = [];
            for (let i=0; i < conv.length; i++){
                inbox.push(new Message(conv[i], _(this)._inbox, _(this)._user, _(this)._events, _(this)._apiUtils));
            }

            _(this)._inbox = inbox;

            var inboxNotification = {
                alert: alertIncommingMessage,
                id: {
                    enterpriseId: _(this)._user.getCurrentEnterpriseId(),
                    zypId: _(this)._user.getCurrentZypId()
                },
                change : {
                    messageId: notification.id,
                    type: notification.type
                },
                messageList: _(this)._inbox
            };

            _(this)._events.fire('message', inboxNotification);
        };
    }

    /**
     * Login a user to ZypHub
     * @function Zyp#loginByEmail
     * @memberOf Zyp
     * @param email An email address
     * @param password Password
     *
     * @fires LoginNotification
     * @fires WebSocketNotification
     */
    Zyp.prototype.loginByEmail = function(email, password) {

        if (email.indexOf('@') === -1) {
            // coerce the username into the form of an email address
            // TODO: make the email domain configurable
            email+='@zyphub.lib';
        }
        var user = {
            email: email,
            password: password
        };

        _(this)._apiUtils.login(user).then(user => {

            _(this)._user.setCurrentUser(user);
            _(this)._user.setLoggedIn(true);
            _(this)._apiUtils.setToken(user.token);
            _(this).WS.connect(user.token,  _(this)._handleWebsocketNotifications.bind(this));
            _(this)._events.fire('notification','login:email', _(this)._user.getCurrentUser());

        }).catch(err => {
            if (!err) {
                err = 'Login Failed';
            }
            _(this)._user.setCurrentUser(null);
            _(this)._user.setLoggedIn(false);
            _(this)._events.fire('error', err);
        });
    };

    /**
     * Login a user to ZypHub
     * @function Zyp#loginByEnterpriseToken
     * @memberOf Zyp
     * @param userName A unique identifier for the user
     * @param [entpriseToken] A ZypHub enterprise domain token. Not required if the Zyphub lib was created with an enterprise token.
     *
     * @fires LoginNotification
     * @fires WebSocketNotification
     */
    Zyp.prototype.loginByEnterpriseToken = function(userName, enterpriseToken) {

        var token = _(this)._enterpriseToken || enterpriseToken;

        if (token) {
            var user = {
                id: userName,
                key: token
            };

            _(this)._apiUtils.loginByKey(user).then(user => {

                _(this)._user.setCurrentUser(user);
                _(this)._user.setLoggedIn(true);
                _(this)._apiUtils.setToken(user.token);
                _(this).WS.connect(user.token,  _(this)._handleWebsocketNotifications.bind(this));
                _(this)._events.fire('notification','login:enterpriseToken',_(this)._user.getCurrentUser());

            }).catch(err => {
                if (!err) {
                    err = 'Login Failed';
                }
                _(this)._user.setCurrentUser(null);
                _(this)._user.setLoggedIn(false);
                _(this)._events.fire('error', err);
                console.log(err);
            });
        } else {
            _(this)._events.fire('error','loginByEnterpriseToken() missing enterpriseToken');
        }
    };
    /**
     * Login Event received in Zyp.onNotification()
     *
     * @event LoginNotification
     * @type {object}
     * @property {string} type Login method used (login:email, login:enterpriseToken, login:userToken)
     * @property {User} user
     */

    /**
     * The user object emitted on login from any login method
     * @typedef {Object} User
     * @property {string} zypId The ZypHub UUID for the user
     * @property {string} enterpriseId  The enterprise UUID for the user
     * @property {string} [token] The authenticated bearer token for the user.
     * @property {string} enterprisesUUID the ZypHub UUID for the enterprise
     * @property {boolean} firstTimeLogin True if this is the firt time the user has logged into ZypHub
     */

    /**
     * Websocket Event received in Zyp.onNotification()
     *
     * @event WebSocketNotification
     * @type {object}
     * @property {string} type Websocket Status (websocket:connectionUp, websocket:connectionDown)
     * @property {WebsocketStatus} status
     */

    /**
     * The websocket status object emitted every 30 seconds after successful login
     *
     * @typedef {Object} WebsocketStatus
     * @property {number} readyState Status of the websocket connection used to deliver message updates
     */

    /**
     * Login a user to ZypHub
     * @function Zyp#loginByUserToken
     * @memberOf Zyp
     * @param userToken A ZypHub user token
     *
     * @fires LoginNotification
     * @fires WebSocketNotification
     */
    Zyp.prototype.loginByUserToken = function(userToken) {

        if (userToken) {

            _(this)._apiUtils.setToken(userToken);

            _(this)._apiUtils.get('users').then(user => {

                _(this)._user.setCurrentUser(user);
                _(this)._user.setLoggedIn(true);
                _(this).WS.connect(user.token,  _(this)._handleWebsocketNotifications.bind(this));
                _(this)._events.fire('notification','login:userToken',_(this)._user.getCurrentUser());

            }).catch(err => {
                if (!err) {
                    err = 'Login Failed';
                }
                _(this)._user.setCurrentUser(null);
                _(this)._user.setLoggedIn(false);
                _(this)._events.fire('error', err);
                console.log(err);
            });

        } else {
            _(this)._events.fire('error','loginByUserToken() missing userToken');
        }
    };

    /**
     * Logout of a ZypHub Session
     *
     * @function Zyp#logout
     * @memberof Zyp
     * @return {Boolean} Logout request was successful
     *
     * @fires LogoutNotification
     */
    Zyp.prototype.logout = function() {
        if (!_(this)._user.isLoggedIn()) {
            return false;
        }
        var user = _(this)._user.getCurrentUser();

        _(this)._apiUtils.logout().then(() => {
            _(this)._user.setCurrentUser(null);
            _(this)._user.setLoggedIn(false);
            _(this)._apiUtils.setToken(null);
            _(this).WS.close(_(this)._handleWebsocketNotifications);
            _(this)._events.fire('notification','logout', user);

        }).catch(err => {
            // effectively log out the user anyway
            if (!err) {
                err = 'Logout Failed';
            }
            _(this)._user.setCurrentUser(null);
            _(this)._user.setLoggedIn(false);
            _(this)._apiUtils.setToken(null);
            _(this).WS.close(_(this)._handleWebsocketNotifications);
            _(this)._events.fire('notification','logout', user);
        });

        return true;
    };

    /**
     * Logout Event received in Zyp.onNotification()
     *
     * @event LogoutNotification
     * @type {object}
     * @property {string} type Login method used (logout)
     * @property {User} user
     */


    /**
     * Fetch the logged in users current message list from the ZypHub server
     * The user must be logged in otherwise an error will be emitted
     *
     * @function Zyp#getMessageList
     * @memberof Zyp
     * @return {Boolean} returns if the request was successfully made, a successful request may still result in an error being emitted
     *
     * @fire MessageListUpdate
     */
    Zyp.prototype.getMessageList = function() {
        if (!_(this)._user.isLoggedIn()) {
            return false;
        }
        _(this)._apiUtils.get('conversations').then(cs => {
            var convs = Helpers.sortByModifiedDate(cs);
            var inbox = [];
            for (let i=0; i < convs.length; i++){
                inbox.push(new Message(convs[i], _(this)._inbox, _(this)._user, _(this)._events, _(this)._apiUtils));
            }
            _(this)._inbox = inbox;
            var data = {
                alert: false,
                id: {
                    enterpriseId: _(this)._user.getCurrentEnterpriseId(),
                    zypId: _(this)._user.getCurrentZypId()
                },
                messageList: _(this)._inbox
            };
            _(this)._events.fire('message', data);
        }).catch(err => {
            var error = 'getMessageList() failed\n' + err;
            _(this)._events.fire('error', error);
        });
        return true;
    };

    /**
     * Message list updates. When the user is logged in and the zyphublib websocket connection is {readyState:1}
     * any changes to the message by other users will be
     *
     * @event MessageListUpdate
     * @type {object}
     * @property {object} MessageListUpdate
     */

    /**
     * The MessageListUpdate object emitted on getMessageList() and onMessageList()
     * @typedef {Object} MessageListUpdate
     * @property {boolean} alert True if a message change may warrant alerting the user
     * @property {object} id
     * @property {string} id.enterpriseId  The enterprise UUID for the owner of the message list
     * @property {string} id.zypId The ZypHub  UUID for the owner of the message list
     * @property {object} [change]    Change in this update. Will not be present on updates cause by a call to getMessageList()
     * @property {string} change.messageId Id of the message that changed
     * @property {string} change.type  The type of change to the message
     * @property {Message[]} messageList The array of Message objects
     */

    /**
     * Get the cached message list
     * Retrieves the current message list cached in the client, does not go to the ZypHub server.
     * The message list may be out of sync with the server if connectivity has been interrupted.
     * The user must be logged in otherwise an error will be emitted
     *
     * @memberof Zyp
     * @function Zyp#getCachedMessageList
     * @return {Message[]} returns the cached message list, or null if there is an error
     *
     */
    Zyp.prototype.getCachedMessageList = function() {
        if (!_(this)._user.isLoggedIn()) {
            return null;
        }
        return _(this)._inbox;
    };

    /**
     * Send a new message
     * @memberof Zyp
     * @function Zyp#newMessage
     *
     * @param {Object} msg The message to be sent
     * @param {string} msg.pattern The message pattern. One of FCFS, STANDARD, FYI
     * @param {Array} msg.members Array of identifiers (ZypHub or Enterprise) to send the message to
     * @param {string} msg.content The body of the message
     * @param {number} [msg.maxAccepts] If the pattern if FCFS this sets the number of 'Accepts' to consider the message complete, if the pattern is FCFS and this parameter is not specified it will default to 1
     *
     * @return {boolean} returns if the request was successfully made, a successful request may still result in an error being emitted. A successful message will emit the messages id on the 'new' topic
     *
     * @fires MessageNotification
     */
    Zyp.prototype.newMessage = function(msg) {
        if (!_(this)._user.isLoggedIn()) {
            return false;
        }

        var message = {
            pattern: msg.pattern,
            members: msg.members,
            content: {
                text: msg.content
            },
            priority: "0",
            maxAccepts: msg.maxAccepts ? msg.maxAccepts : 1
        };

        _(this)._apiUtils.post('conversations', message).then(c => {

            if (c.conversationId) {
                _(this)._events.fire('notification','message:new', c);
            }
        }).catch(err => {
            var error = 'Message creation failed\n' + err;
            _(this)._events.fire('error', err);
        });
    };

    /**
     * Set message list handler callback function.
     *
     * @memberof Zyp
     * @function Zyp#onMessageList
     *
     * @param {MessgeListHandlerCallback} callback The handler function that will be called for updates to the message list
     * @param {Object} [ctx]  A user defined context object that may also be passed to the handler with the event data
     *
     * @fire MessageListUpdate
     */
    Zyp.prototype.onMessageList = function(callback, ctx) {
        _(this)._events.on('message', callback, ctx);
        return true;
    };

    /**
     * The signature of the message list callback function
     * @callback MessgeListHandlerCallback
     * @param {Message[]} messageList Array of message objects
     * @param {Object} context Optional either the static context object configured with the handler or an event type specific context data
     */

    /**
     * Set error handler callback function.
     *
     * @memberof Zyp
     * @function Zyp#onError
     *
     * @param {ErrorHandlerCallback} callback The handler function that will be called for errors
     * @param {Object} [ctx]  A user defined context object that may also be passed to the handler with the event data
     */
    Zyp.prototype.onError = function(callback, ctx) {
        _(this)._events.on('error', callback, ctx);
        return true;
    };

    /**
     * The signature of the error callback function
     * @callback ErrorHandlerCallback
     * @param {String} Error message
     * @param {Object} context Optional either the static context object configured with the handler or an event type specific context data
     */

    /**
     * Set notification handler callback function.
     *
     * @memberof Zyp
     * @function Zyp#onNotification
     *
     * @param {NotificationHandlerCallback} callback The handler function that will be called for ZypHub notifications
     * @param {Object} [ctx]  A user defined context object that may also be passed to the handler with the event data
     */
    Zyp.prototype.onNotification = function(callback, ctx) {
        _(this)._events.on('notification', callback, ctx);
        return true;
    };

    /**
     * The signature of the notification callback function
     * @callback NotificationHandlerCallback
     * @param {String} Notification type
     * @param {Object} data Notification specific data
     * @param {Object} context Optional either the static context object configured with the handler or an event type specific context data
     */

    /**
     * Get the registered users for the current enterprise
     * The user must be logged in with an enterprise key, otherwise an error will be returned
     * Users tokens will not be returned unless the Enterprise Key has admin permissions.
     *
     * @memberof Zyp
     * @function Zyp.getEnterpriseUsers
     * @return {Boolean} returns if the request was successfully made, a successful request may still result in an error being emitted
     *
     * @fires EnterpriseUsers
     */
    Zyp.prototype.getEnterpriseUsers = function() {
        if (!_(this)._user.isLoggedIn()) {
            return false;
        }
        _(this).Admin.getEnterpriseUsers();
        return true;
    };

    /**
     * List of all users registered to the Enterprise Token used for login.
     * If the enterprise token used has admin permission then the User Token for all users will be included in the User object, otherwise it will be absent.
     *
     * @event EnterpriseUsers
     * @type {object}
     * @property {User[]} Users
     */

    Zyp.prototype.getEnterprises = function() {
        return _(this).Admin.getEnterprises();
    };

    Zyp.prototype.setEnterprise = function(enterprise) {
        return _(this).Admin.setEnterprise(enterprise);
    };

    Zyp.prototype.newEnterprise = function(enterprise) {
        return _(this).Admin.newEnterprise(enterprise);
    };


    return Zyp;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = Zyp;
}

