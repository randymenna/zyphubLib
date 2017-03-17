'use strict';

var moment = require('moment');
var _ = require('private-parts').createKey();

/**
 * Message Object, returned in an array as the MessageList
 * @namespace Message
 * @class Message
 * @property {string} id    The message UUID
 *
 * @property {Object} time  Message timestamps
 * @property {string} time.created   The UTC timestamp of when the message was created
 * @property {string} time.modified The UTC timestamp of when the message was last modified
 * @property {number} time.ttl  The time-to-live of the message. -1 indicates it never expires (always -1 for now)

 * @property {Object} envelope  The message envelope
 * @property {string} envelope.originator.zypId  The ZypHub UUID of the entity that sent the last update to this message
 * @property {string} envelope.originator.enterpriseId  The Enterprise UUID of the entity that sent the last update to this message
 * @property {string[]} envelope.active Array of ZypId's of the active members in this message
 * @property {string} envelope.pattern  The message pattern
 * @property {number} envelope.priority The message priority (has no effect on delivery for now)
 * @property {string} envelope.lastModifiedBy The ZypHub UUID of the last member to modify this message
 * @property {boolean} envelope.isMine    True if the logged in user created the message
 * @property {string[]} envelope.allowableActions    Actions that can be passed to Zyp.update for this message
 *
 * @property {Object[]} participants    Array of members that participated in this message
 * @property {string} participants.member.zypid  The ZypHub UUID of the member
 * @property {string} participants.member.enterpriseId   The enterprise UUID of the member
 * @property {string} participants.eventTime    The UTC timestamp of the last event this member posted to the message
 * @property {string} participants.lastEvent    The last event this member posted to the message
 *
 * @property {Object} state The message state
 * @property {number} state.startMemberCount    The number of members in the message at time of creation
 * @property {number} state.curMemberCount      The current number of members in the message
 * @property {number} state.leaves  The number of members that have left the message
 * @property {number} state.delegates   The number of members that have delegated the message
 * @property {number} state.forwards    The number of members that have been added to the message by forwarding
 * @property {number} state.oks The number of members that have acknowledged the message (FYI pattern only)
 * @property {number} state.rejects The number of members that have rejected the message (FCFS pattern only)
 * @property {number} state.accepts The number of members that have accepted the message (FCFS pattern only)
 * @property {number} state.maxAccepts  The number of accepts allowed on the message (FCFS pattern only)
 * @property {boolean} state.open   Is the message still open?
 *
 * @property {Object[]} content   Array of threaded message content in timestamp order
 * @property {string} content.created   The UTC timestamp of when the reply was created
 * @property {Object} content.origin    The ZypHub UUID member that created this content
 * @property {string} content.content   The text or text encoded content
 *
 * @property {Function} update Update an exisiting message thread (see below)
 * @property {Function} getId Return the message UUID (see below)
 * @property {Function} getTime Return the message time object (see below)
 * @property {Function} getEnvelope Return the message envelope object (see below)
 * @property {Function} getParticipants Return the message participants object (see below)
 * @property {Function} getState Return the message state object (see below)
 * @property {Function} getContent Return the message content object (see below)
 * @property {Function} getMessage Return the entire message object (see below)
 *
 */

var Message = (function () {

    var _verifyAction = function (action, allowedActions) {
        return (allowedActions.indexOf(action) != -1);
    };

    var _rawToProcessed = function (raw, user, inbox) {
        var me = user.getCurrentUser();
        var processed = {};
        var owner = null;

        // all notifications always have an Id and Time
        processed.id = raw.id;

        processed.time = {};
        processed.time.created = raw.time.created;
        processed.time.modified = raw.time.modified;
        processed.time.ttl = raw.time.toLive || raw.time.ttl;

        processed.envelope = {};
        processed.envelope.originator = {};
        processed.envelope.active = [];
        processed.participants = [];
        processed.content = [];

        // from the server, only these will have a disposition
        if (raw.disposition || raw.allowableActions) {

            // does notification have an envelope
            if (raw.envelope) {
                processed.envelope.originator.zypId = raw.envelope.origin._id || raw.envelope.origin.id;
                owner = processed.envelope.originator.zypId;
                processed.envelope.originator.enterpriseId = raw.envelope.origin.originalId;

                // active participants
                for (let i = 0; i < raw.envelope.members.length; i++) {
                    processed.envelope.active.push(raw.envelope.members[i]._id || raw.envelope.members[i].id);
                }
                processed.envelope.pattern = raw.envelope.pattern;
                processed.envelope.priority = raw.envelope.priority;
                processed.envelope.lastModifiedBy = raw.envelope.latestMember;
                processed.envelope.isMine = (owner === me.zypId);
                processed.envelope.allowableActions = raw.allowableActions;
            }
            else if (raw.type === 'ACCEPT') {
                var m = raw.state.members;
                for(let i=0; i < m.length; i++) {
                    var memberId = (m[i].member._id || m[i].member.id);
                    if (m[i].lastEvent === 'ACCEPTED' || m[i].lastEvent === 'SENT') {
                        processed.envelope.active.push(memberId);
                    }
                    else if (m[i].lastEvent === 'REMOVED' && memberId === me.zypId) {
                        raw.state.open = false;
                    }
                }
                processed.envelope.allowableActions = raw.allowableActions;
            }
            else if (raw.type === 'REJECT') {
                var m = raw.state.members;
                for(let i=0; i < m.length; i++) {
                    var memberId = (m[i].member._id || m[i].member.id);
                    if (m[i].lastEvent !== 'REJECTED') {
                        processed.envelope.active.push(memberId);
                    }
                }
                processed.envelope.allowableActions = raw.allowableActions;
            }
            else {
                //  it is an update so we need to adjust the envelop a bit
                processed.envelope.lastModifiedBy = raw.originator;
            }

            // all notifications always have a state
            processed.participants = [];
            for (let i = 0; i < raw.state.members.length; i++) {
                var p = {};
                p.member = {};
                p.member.zypId = raw.state.members[i].member._id || raw.state.members[i].member.id;
                p.member.enterpriseId = raw.state.members[i].member.originalId;
                p.eventTime = raw.state.members[i].eventTime;
                p.lastEvent = raw.state.members[i].lastEvent;

                processed.participants.push(p);
            }

            // does it have content?
            if (raw.content) {
                var content = {};
                content.created = raw.time.created;
                content.origin = owner;
                content.content = raw.content.message;
                processed.content.push(content);

                for (let i = 0; i < raw.content.replies.length; i++) {
                    content = {};
                    content.created = raw.content.replies[i].created;
                    content.origin = raw.content.replies[i].origin._id || raw.content.replies[i].origin.id;
                    content.content = raw.content.replies[i].content;

                    processed.content.push(content);
                }
            }

        }
        else {
            // converting back a message that was already processed
            processed.envelope = raw.envelope;
            processed.participants = raw.participants;
            processed.content = raw.content;

            owner = processed.envelope.originator.zypId;
        }

        processed.state = raw.state;
        if (processed.state.members) {
            delete processed.state.members;
        }

        // Adjust the counts here to reflect changes to include originator in counts
        // Leaving the server unchanged for now to keep compatiblity with MayDay
        processed.state.curMemberCount = processed.envelope.active.length;
        ++processed.state.startMemberCount;

        return processed;
    };

    function Message(raw, inbox, user, events, apiUtils) {
        _(this)._message = _rawToProcessed(raw, user, inbox);
        _(this)._user = user;
        _(this)._events = events;
        _(this)._apiUtils = apiUtils;
    }

    /**
     * Get the message Id
     * @memberof Message
     * @public
     * @function Message#getId
     *
     * @return {string} returns the UUID of the message, or null if there is an error
     *
     */
    Message.prototype.getId = function () {
        if (_(this)._message) {
            return _(this)._message.id;
        }
        else {
            var error = 'Message.getId(): no message\n' + err;
            _(this)._events.fire('error', error);
            return null;
        }
    };

    /**
     * Get the message time
     * @memberof Message
     * @public
     * @function Message#getTimes
     *
     * @return {object} returns message time, or null if there is an error
     *
     */
    Message.prototype.getTimes = function () {
        if (_(this)._message) {
            return _(this)._message.time;
        }
        else {
            var error = 'Message.getTimes(): no message\n' + err;
            _(this)._events.fire('error', error);
            return null;
        }
    };

    /**
     * Get the message envelope
     * @memberof Message
     * @public
     * @function Message#getEnvelope
     *
     * @return {object} returns message envelope, or null if there is an error
     *
     */
    Message.prototype.getEnvelope = function () {
        if (_(this)._message) {
            return _(this)._message.envelope;
        }
        else {
            var error = 'Message.getEnvelope(): no message\n' + err;
            _(this)._events.fire('error', error);
            return null;
        }
    };

    /**
     * Get the message participants
     * @memberof Message
     * @public
     * @function Message#getParticipants
     *
     * @return {object} returns message participants, or null if there is an error
     *
     */
    Message.prototype.getParticipants = function () {
        if (_(this)._message) {
            return _(this)._message.participants;
        }
        else {
            var error = 'Message.getParticipants(): no message\n' + err;
            _(this)._events.fire('error', error);
            return null;
        }
    };

    /**
     * Get the message state
     * @memberof Message
     * @public
     * @function Message#getState
     *
     * @return {object} returns message state, or null if there is an error
     *
     */
    Message.prototype.getState = function () {
        if (_(this)._message) {
            return _(this)._message.state;
        }
        else {
            var error = 'Message.getState(): no message\n' + err;
            _(this)._events.fire('error', error);
            return null;
        }
    };

    /**
     * Get the message content
     * @memberof Message
     * @public
     * @function Message#getContent
     *
     * @return {object} returns message content, or null if there is an error
     *
     */
    Message.prototype.getContent = function () {
        if (_(this)._message) {
            return _(this)._message.content;
        }
        else {
            var error = 'Message.getContent(): no message\n' + err;
            _(this)._events.fire('error', error);
            return null;
        }
    };

    /**
     * Get the entire message object
     * @memberof Message
     * @public
     * @function Message#getMessage
     *
     * @return {object} returns the message, or null if there is an error
     *
     */
    Message.prototype.getMessage = function () {
        if (_(this)._message) {
            return _(this)._message;
        }
        else {
            var error = 'Message.getMessage(): no message\n' + err;
            _(this)._events.fire('error', error);
            return null;
        }
    };

    /**
     * Update an existing message
     * @memberof Message
     * @public
     * @function Message#update
     *
     * @param {string} action The action to perform on the message. Must be one of the allowed actions in the message.
     * @param {string} [data] Action specific data.
     * If the Action is 'FORWARD' then data must contain the UUID of the member the message is being forwarded to
     * If the Action is 'DELEGATE' then the data must contain the UUID of the member the message is being delagated to
     *
     * @return {boolean} returns if the request was successfully made, a successful request may still result in an error being emitted. A successful message will emit the messages id on the 'update' topic
     *
     * @fires MessageNotification
     */
    Message.prototype.update = function (action, data) {
        if (!_(this)._user.isLoggedIn()) {
            return false;
        }
        if (!_verifyAction(action, _(this)._message.envelope.allowableActions)) {
            var error = 'Error: Action ' + action + ' is not allowed on message ' + _(this)._message.id;
            _(this)._events.fire('error', error);
            return false;
        }

        _(this)._apiUtils.put('conversations/' + _(this)._message.id + '/' + action, data).then(cid => {
            _(this)._events.fire('notification', 'message:update', cid);
        }).catch(err => {
            var error = 'Message update failed\n' + err;
            _(this)._events.fire('error', error);
        });
    };

    /**
     * Message Event received in Zyp.onNotification()
     *
     * @event MessageNotification
     * @type {object}
     * @property {string} type Message creation/update (message:new, message:update)
     * @property {MessageStatus} id
     */

    /**
     * The UUID of the message
     *
     * @typedef {Object} MessageStatus
     * @property {string} id Id of the message that was created or updated
     */

    return Message;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = Message;
}
