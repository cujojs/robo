(function(define) {

define(['./support/when'], function(when) {

    function createState(name, stateDef, transition) {
        var state, transitions;

        transitions = stateDef.transitions;
        state = {
            name: name,
            isFinal: !transitions || !!stateDef.isFinal
        };

        if(transitions) {
            for(var event in transitions) {
                if(transitions.hasOwnProperty(event))
                state[event] = function() {
                    return transition(event, transitions[event]);
                }
            }
        }

        return state;
    }

    /**
     * Creates a state machine
     * @param stateTable {Object} the state and transition definitions
     */
    function Machina(stateTable) {
        var machina, stateDefs, states, state;

        machina = this;
        stateDefs = stateTable.states;
        states = {};

        function transition(event, toName) {
            var deferred, to;

            deferred = when.defer();
            to = states[toName];

            if(to) {
                deferred.resolve(to);

            } else {
                deferred.reject(event);

            }

            return deferred.promise;
        }

        for(state in stateDefs) {
            if(stateDefs.hasOwnProperty(state)) {
                states[state] = createState(state, stateDefs[state], transition);
            }
        }

        machina._proto = {
            state: states[stateTable.initial],

            transition: function(event) {

                function applyTransition(state, event) {
                    var transition = state[event];
                    if (transition) {
                        return transition();
                    } else {
                        throw event;
                    }
                }

                var self, onResolve, promise;

                self = this;

                onResolve = function(endState) {
                    self.state = endState;
                    if (endState.isFinal) {
                        self.transition = function() {};
                    }
                };

                promise = typeof event === 'string'
                    ? applyTransition(this.state, event)
                    : when.reduce(event, applyTransition, this.state);

                return when(promise, onResolve);

            },
            
            isFinal: function() {
                return this.state.isFinal;
            }
        };
    }

    function Run() {
    }

    Machina.prototype = {
        /**
         * Starts an instance of this state machine
         */
        start: function() {
            Run.prototype = this._proto;
            return new Run();
        },

        accepts: function(events) {
            return this.start().transition(events);
        }
    };

    return Machina;
});
}(typeof define === 'function' && define.amd
    ? define
    : typeof require === 'function'
        ? function(deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
        : function(deps, factory) { this.Machina = factory(this.when); }
));

