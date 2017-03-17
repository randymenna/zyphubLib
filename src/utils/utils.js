/**
 * Created by randy on 10/7/15.
 */

const Utils = {
    isEmpty(object)
    {
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                return false;
            }
        }
        return true;
    },

    deepCopy(obj) {
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            var out = [], i = 0, len = obj.length;
            for ( ; i < len; i++ ) {
                out[i] = arguments.callee(obj[i]);
            }
            return out;
        }
        if (typeof obj === 'object') {
            var out = {}, i;
            for ( i in obj ) {
                out[i] = arguments.callee(obj[i]);
            }
            return out;
        }
        return obj;
    },

    extend(target, source) {
        target = target || {};
        for (var prop in source) {
            if (typeof source[prop] === 'object') {
                target[prop] = this.extend(target[prop], source[prop]);
            }
            else {
                target[prop] = source[prop];
            }
        }
        return target;
    },

    formatPhone(tel) {
        if (!tel) {
            return '';
        }

        var value = tel.toString().trim().replace(/^\+/, '');

        if (value.match(/[^0-9]/)) {
            return tel;
        }

        var country, city, number;

        switch (value.length) {
            case 1:
            case 2:
            case 3:
                city = value;
                break;

            default:
                city = value.slice(0, 3);
                number = value.slice(3);
        }

        if (number) {
            if (number.length > 3) {
                number = number.slice(0, 3) + '-' + number.slice(3, 7);
            }

            return ("(" + city + ") " + number).trim();
        }
        else {
            return "(" + city;
        }

    },

    stripPhone(phone) {
        var num = phone.replace(/[\+\(\)\- ]+/g, '');
        if (num.length === 11) {
            num = num.slice(1);
        }
        return num;
    },

    stripSpaces(key) {
        var num = key.replace(/[ ]+/g, '');
        return num;
    },


};

export default Utils;