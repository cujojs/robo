(function(define) {

define(['./Evented', './support/when'], function(Evented, when) {

    var isArray = Array.isArray || function(it) {
        return it && (it instanceof Array || typeof it === 'array');
    };

    function rejected(reason) {
        var d = when.defer();
        d.reject(reason);
        return d.promise;
    }

    function createState(name, stateDef) {
        var state, transitions, event;

        transitions = stateDef.transitions;
        state = {
            name: name,
            isFinal: !transitions || !!stateDef.isFinal,
            transitions: {}
        };

        if(transitions) {
            for(event in transitions) {
                if(transitions.hasOwnProperty(event)) {
                    state.transitions[event] = transitions[event];
                }
            }
        }

        return state;
    }

    function Run(start, emitter) {
        this.state = start;
        this.emitter = emitter;
    }

    /**
     * Creates a state machine
     * @param stateTable {Object} the state and transition definitions
     */
    function Machine(stateTable) {
        var self, blueprint, stateDefs, states, state;

        self = this;
        stateDefs = stateTable.states;
        states = {};

        function transition(from, event, to, emitter) {

            function transitionStart(data) {
                return emitter ? emitter(event + ":start", data) : data;
            }

            function leaveFrom(data) {
                return emitter ? emitter(from.name+':leave', data) : data;
            }

            function enterTo(data) {
                return emitter ? emitter(to.name+':enter', data) : data;
            }

            function transitionEnd(data) {
                return emitter ? emitter(event+':end', data) : data;
            }

            var steps = [transitionStart, leaveFrom, enterTo, transitionEnd];
            return to
                ? when.reduce(steps,
                    function(val, nextStep) {
                        return nextStep(val);
                    }).then(function() { return to; })
                : rejected(event);

        }

        for(state in stateDefs) {
            if(stateDefs.hasOwnProperty(state)) {
                states[state] = createState(state, stateDefs[state]);
            }
        }
        
        blueprint = {
            states: states,
            
            available: function() {
                var available, transitions, transition;
                
                available = [];
                transitions = this.state.transitions;
                
                for(var event in transitions) {
                    transition = transitions[event];

                    // TODO: Add conditional transitions
//                    if(!transition.condition || transition.condition()) {
                        available.push(event);
//                    }
                }
                
                return available;
            },
            
            transition: function(event) {

                var self, from, origTransition, promise;

                self = this;
                from = this.state;

                origTransition = this.transition;
                this.transition = function(event) {
                    return when(promise, function() {
                        return origTransition(event);
                    });
                };

                function completeTransition() {
                    self.transition = origTransition;
                    return self;
                }

                function applyTransition(from, event) {
                    var available, transitions, to;

                    available = self.available();
                    transitions = from.transitions;

                    if(event) {
                        if (available.indexOf(event) >= 0) {
                            to = transitions[event];
                        }
                    } else if (available.length === 1) {
                        to = transitions[available[0]];
                    }

                    return to
                        ? transition(from, event, states[to], self.emitter)
                        : rejected(event);
                }

                function onResolve(endState) {
                    self.state = endState;
                    return completeTransition();
                }

                promise = isArray(event)
                    ? when.reduce(event, applyTransition, from).then(onResolve, completeTransition)
                    : when(applyTransition(from, event), onResolve, completeTransition);

                return promise;
            },

            isFinal: function() {
                return this.state.isFinal;
            }
        };
        
        this.start = function(start, eventEmitter) {
            if (typeof start === 'function') {
                eventEmitter = start;
                start = states[stateTable.start];
            } else {
                start = states[start || stateTable.start];
            }

            Run.prototype = blueprint;
            return new Run(start, eventEmitter);
        };

    }

    Machine.prototype = {
        accepts: function(events) {
            var run = this.start();
            
            return run.transition(events).then(
                function(run) {
                    return run.isFinal() ? run : rejected(run)
                });
        }
    };

    return Machine;
});
}(typeof define === 'function' && define.amd
    ? define
    : typeof require === 'function'
        ? function(deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
        : function(deps, factory) { this.Machine = factory(this.Evented, this.when); }
));

