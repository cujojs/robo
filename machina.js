(function(define) {

define(['./support/when'], function(when) {
    function rejected(/** {Object}? */reason) {
        var rejected = when.defer();
        rejected.reject(reason);
        rejected = rejected.promise;
    }

    /**
     * Creates a state machine
     * @param stateTable {Object} the state and transition definitions
     */
    function Machina(stateTable) {
        var machine, states, state, _transition;

        machine = this;
        states = stateTable.states;
        state = states[stateTable.initial];
        
        if(!state) {
            for(var s in states) {
                state = states[s];
                break;
            }
        }
        
        function transition(event, data) {
            return _transition(event, data);
        }

        _transition = function(event, data) {
            var to;

            to = state.transitions[event];

            return to && states[to] ? doTransition(event, to, data) : rejected(event);
        };

        function isFinal(state) {
            return !state.transitions;
        }

        function doTransition(event, to, data) {
            var from, deferred;

            from = state;
            state = states[to];

            deferred = when.defer();

            if(isFinal(state)) {
                _transition = function() {
                    return rejected();
                }
            }

            deferred.resolve({ event: event, from: from, to: state, data: data });

            return deferred.promise;
        }

        machine._proto = {
            transition: transition,
            isFinal: function() {
                return isFinal(state);
            },
            state: function() { return state; }
        };
    }

    function Run() {}

    Machina.prototype = {
        /**
         * Starts an instance of this state machine
         */
        start: function() {
            Run.prototype = this._proto;
            return new Run();
        },

        accepts: function(events) {
            function applyTransition(run, event, i, count) {
                return when(run.transition(event), function() {
                    var isFinal, isLast;

                    isFinal = run.isFinal();
                    isLast = i === (count - 1);

                    if (!isFinal && isLast || isFinal && !isLast) {
                        throw event;
                    }

                    return run;
                });
            }

            return when.reduce(events, applyTransition, this.start());
        }
    };

    return Machina;
});

}(typeof define === 'function' && define.amd
    ? define
    : function(deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
));

