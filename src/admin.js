'use strict';

var Admin = (function() {

    /*
     * Undocumented API
     */
    /*
    var _enterprises = [];
    var _currentEnterpriseUsers = [];
    var _currentEnterprise = {};
    */

    function Admin(events, user, api) {
        this._events = events;
        this._user = user;

        this._enterprises = [];
        this._currentEnterpriseUsers = [];
        this._currentEnterprise = {};
        this._apiUtils = api;
    };


    Admin.prototype.getEnterprises = function() {
        var user2 = this._user.getCurrentUser();

        if (!this._user.isLoggedIn()) {
            return false;
        }

        this._apiUtils.get('admin/enterprises').then(enterprises => {
            this._enterprises = enterprises;
            this._events.fire('notification','enterprise:list', enterprises);
        }).catch(err => {
            var error = 'Enterprise fetch failed\n' + err;
            this._events.fire('error', error);
        });

        return true;
    };

    Admin.prototype.newEnterprise = function(enterprise) {
        if (!this._user.isLoggedIn()) {
            return false;
        }

        this._apiUtils.post('admin/enterprises', enterprise).then(e => {
            this._currentEnterprise = e;
            this._enterprises[e._id] = e;
            this._events.fire('notification','enterprise:new', e);
        }).catch(err => {
            var error = 'Enterprise creation failed\n' + err;
            this._events.fire('error', err);
        });
        return true;
    };


    Admin.prototype.setEnterprise = function(enterprise) {
        if (!this._user.isLoggedIn()) {
            return false;
        }
        this._currentEnterprise = enterprise;
        this._events.fire('notification','enterprise:select', enterprise);
        return true;
    };

    Admin.prototype.getEnterpriseUsers = function() {
        if (!this._user.isLoggedIn()) {
            return false;
        }
        this._apiUtils.get('admin/enterprises/users/' + this._currentEnterprise.id).then(users => {
            this._currentEnterpriseUsers = this._user.processEnterpriseUsers(users);
            this._events.fire('notification','enterprise:users', this._currentEnterpriseUsers);
        }).catch(err => {
            var error = 'Fetch Enterprise users failed\n' + err;
            this._events.fire('error', err);
        });
        return true;
    };

    return Admin;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = Admin;
}

