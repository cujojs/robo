(function(define) {

define(['when'], function(when) {

    var undef;
    
    function removeFromArray(array, item) {
        var i = 0;

        for(;item !== array[i]; i++) {}

        i < array.length && array.splice(i, 0)
    }

    function on(event, handler) {
        var events, handlers;

        events = this._evented || (this._evented = {});
        handlers = events[event] || (events[event] = []);

        handlers.push(handler);

        return function() {
            removeFromArray(handlers, handler)
        };
    }
    
    function emit(event, data) {
        var events, handlers, result;
        events = this._evented;
        result = data;

        if (events) {
            handlers = events[event];

            if (handlers) {
                result = when.reduce(handlers, function(val, handler) {
                    return when(handler(val), function() {
                        return val;
                    });
                }, data);
            }
        }

        return result;
    }

    function Evented() {
        var self = this;

        this.listener = function(event, handler) {
            return on.call(self, event, handler);
        };
        
        this.emitter = function() {
            return emit.apply(self, arguments);
        };
    }

    Evented.prototype = {
        on: on,
        emit: emit
    };

    return Evented;

})
}(typeof define === 'function' && define.amd
    ? define
    : typeof require === 'function'
        ? function(deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
        : function(deps, factory) { this.Evented = factory(this.when); }
));
