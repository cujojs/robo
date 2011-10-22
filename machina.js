(function(define) {

define(['./support/when'], function(when) {
    
    function noop() {}
    
    function rejected(reason) {
        var d = when.defer();
        d.reject(reason);
        return d.promise;
    }

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
        var machina, stateDefs, states, state, initial;

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

        initial = states[stateTable.start];

        machina.blueprint = {
            state: initial,

            transition: function(event) {

                var self, restoreTransition, onResolve, promise;

                self = this;

                restoreTransition = this.transition;
                this.transition = noop;

                function applyTransition(state, event) {
                    var transition = state[event];
                    if (typeof transition === 'function') {
                        return transition();
                    } else {
                        return rejected(event);
                    }
                }
                
                function completeTransition(val) {
                    self.transition = self.state.isFinal
                        ? rejected
                        : restoreTransition;

                    return val;
                }

                onResolve = function(endState) {
                    self.state = endState;
                    return completeTransition(self);
                };

                promise = typeof event === 'string'
                    ? applyTransition(this.state, event)
                    : when.reduce(event, applyTransition, this.state);

                return when(promise, onResolve, completeTransition);
            },
            
            isFinal: function() {
                return this.state.isFinal;
            }
        };
    }

    function Run() {}

    Machina.prototype = {
        /**
         * Starts an instance of this state machine
         */
        start: function() {
            Run.prototype = this.blueprint;
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

