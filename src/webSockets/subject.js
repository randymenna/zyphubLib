/**
 *
 * Created by randy on 10/9/15.
 */
"use strict";

var SubjectObserver = (function() {

    function SubjectObserver() {
        this.observerCollection = [];
    }

    SubjectObserver.prototype.registerObserver = function(observer) {
        // to avoid over subscription, check the element isnt already in the array
        var index = this.observerCollection.indexOf(observer);
        if (index == -1) {
            this.observerCollection.push(observer);
        }
    };

    SubjectObserver.prototype.unregisterObserver = function(observer) {
        for(var i=0; i < this.observerCollection.length; i++) {
            if (observer === this.observerCollection[i]){
                this.observerCollection.splice(i,1);
                break;
            }
        }
    };

    SubjectObserver.prototype.notifyObservers = function(data) {
        for (var i = 0; i < this.observerCollection.length; i++ ) {
            var notify = this.observerCollection[i];
            if (typeof notify === "function") {
                notify(data);
            } else {
                console.warn("An observer was found without a notify function");
            }
        }
    };

    return SubjectObserver;

})();

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = SubjectObserver;
}
