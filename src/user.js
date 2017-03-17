'use strict';

var User = (function() {

    var processUser = function(u) {
        if (!u) {
            return null;
        }
        var user = {};
        user.zypId = u.profile[0];
        user.enterpriseId = u.originalId;
        user.token = u.token;
        user.enterprisesUUID = u.enterpriseId;
        user.firstTimeLogin = u.firstTimeLogin;

        return(user);
    };

    /*
     * Instantiate User
     *
     * @constructor
     * @name Zyp.User
     * @access protected
     */
    function User(events, api) {
        this._events = events;
        this._currentUser = null;
        this._loggedIn = false;
        this._apiUtils = api;
    };

    User.prototype.isLoggedIn = function () {
        if (!this._loggedIn) {
            var error = 'Not logged in';
            this._events.fire('error', error);
            return false;
        } else {
            return true;
        }
    };

    User.prototype.setLoggedIn = function (state) {
        this._loggedIn = state;
    };

    User.prototype.getCurrentUser = function() {
        return this._currentUser;
    };

    User.prototype.getCurrentZypId = function() {
        if (this._currentUser) {
            return this._currentUser.zypId;
        } else {
            return null;
        }
    };

    User.prototype.getCurrentEnterpriseId = function() {
        if (this._currentUser) {
            return this._currentUser.enterpriseId;
        } else {
            return null;
        }
    };

    User.prototype.setCurrentUser = function(currentUser) {
       this._currentUser = processUser(currentUser);
    };

    User.prototype.processEnterpriseUsers = function(u) {
        var processed = [];
        for (let i=0; i < u.length; i++) {
            processed.push(processUser(u[i]));
        }
        return processed;
    };

    /*
     * Set the name associated with a users ZypHub profile
     *
     * @name Zyp.User#setName
     * @function
     * @memberof Zyp.User
     *
     * @param {string} first First name
     * @param {string} last Last name
     *
     * @return {boolean} returns if the request was successfully made, a successful request may still result in an error being emitted on the error topic
     */
    User.prototype.setName = function(first, last) {
        if (!this.isLoggedIn()) {
            return false;
        }

        var name = {
            firstName: first,
            lastName: last
        };
        this._apiUtils.post('users/register', name).then(user => {
            this._events.fire('user', user);
        }).catch(err => {
            var error = 'nameProfile('+ first + ',' + last+') failed: ' + err;
            this._events.fire('error', error);
        });
    };

    return User;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = User;
}

