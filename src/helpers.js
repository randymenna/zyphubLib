/**
 * Created by randy on 1/6/17.
 */
var moment = require('moment');

const Helpers = {

    sortByModifiedDate(c) {
        return c.sort(function (l, r) {
            return moment(l.time.modified).isBefore(r.time.modified) ? 1 : -1;
        });
    },

    removeClosed(conversations) {
        for (var i = conversations.length - 1; i > -1; i--) {
            if (!conversations[i].state.open) {
                conversations.splice(i, 1);
            }
        }
        return conversations;
    },


};

export default Helpers;