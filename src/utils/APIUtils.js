'use strict';

import {camelizeKeys}           from 'humps';
import request                  from 'superagent';

var APIUtils = (function() {


    function APIUtils() {
        this.root = '//beta.conversepoint.com:19690/v1/';
        this.token = '';
        this.bearer = '';

        this.normalizeResponse = function (response) {
            return camelizeKeys(response.body);
        };
    }

    APIUtils.prototype.setToken = function (token) {
        this.token = token;
        if (token) {
            this.bearer = 'Bearer ' + token;
        } else {
            this.bearer = null;
        }
    };

    APIUtils.prototype.get = function (path) {
        return new Promise((resolve, reject) => {
            request.get(this.root + path)
                .set({'Authorization': this.bearer})
                // .withCredentials()
                .end((err, res) => {
                    if (err || !res.ok) {
                        reject(this.normalizeResponse(err || res));
                    }
                    else {
                        resolve(this.normalizeResponse(res));
                    }
                });
        });
    };

    APIUtils.prototype.post = function (path, body) {
        return new Promise((resolve, reject) => {
            request.post(this.root + path, body)
            //.set('Access-Control-Allow-Credentials', false)
            // .withCredentials()
                .set({'Authorization': this.bearer})
                .set({'Content-Type': 'application/json'})
                .end((err, res) => {
                    if (err || !res.ok) {
                        reject(this.normalizeResponse(err || res));
                    }
                    else {
                        resolve(this.normalizeResponse(res));
                    }
                });
        });
    };

    APIUtils.prototype.patch = function (path, body) {
        return new Promise((resolve, reject) => {
            request.patch(this.root + path, body)
                .set({'Authorization': this.bearer})
                //.withCredentials()
                .end((err, res) => {
                    if (err || !res.ok) {
                        reject(this.normalizeResponse(err || res));
                    }
                    else {
                        resolve(this.normalizeResponse(res));
                    }
                });
        });
    };

    APIUtils.prototype.put = function (path, body) {
        return new Promise((resolve, reject) => {
            request.put(this.root + path, body)
            //.withCredentials()
                .set({'Authorization': this.bearer})
                .set({'Content-Type': 'application/json'})
                .end((err, res) => {
                    if (err || !res.ok) {
                        reject(this.normalizeResponse(err || res));
                    }
                    else {
                        resolve(this.normalizeResponse(res));
                    }
                });
        });
    };

    APIUtils.prototype.del = function (path) {
        return new Promise((resolve, reject) => {
            request.del(this.root + path)
            //.withCredentials()
                .set({'Authorization': this.bearer})
                .end((err, res) => {
                    if (err || !res.ok) {
                        reject(this.normalizeResponse(err || res));
                    }
                    else {
                        resolve(this.normalizeResponse(res));
                    }
                });
        });
    };

    APIUtils.prototype.checkLoginStatus = function() {
        return this.get('auth/check');
    };

    APIUtils.prototype.login = function(user) {
        return this.post('users/login', user);
    };

    APIUtils.prototype.loginByKey = function(user) {
        return this.post('users/login/apikey', user);
    };

    APIUtils.prototype.logout = function() {
        return this.post('users/logout');
    };

    return APIUtils;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = APIUtils;
}