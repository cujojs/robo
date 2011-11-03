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
                        var next = nextStep(val);
                        return next;
                    }, { from: from, to: to, event: event }).then(function() { return to; })
                : rejected(event);

        }
        
        function available(state) {
            var available, transitions;//, transition;
            
            available = [];
            transitions = state.transitions;
            
            for(var event in transitions) {
                if(transitions.hasOwnProperty(event)) {
//                        transition = transitions[event];

                    // TODO: Add conditional transitions
//                        if (!transition.condition || transition.condition()) {
                        available.push(event);
//                        }
                }
            }
            
            return available;
        }

        for(state in stateDefs) {
            if(stateDefs.hasOwnProperty(state)) {
                states[state] = createState(state, stateDefs[state]);
            }
        }
        
        blueprint = {
            states: states,
            
            available: function() {
                return available(this.state);
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
                
                function nextState(from, event) {
                    var allowed, transitions, to;

                    allowed = available(from);
                    transitions = from.transitions;

                    if(event) {
                        if (allowed.indexOf(event) >= 0) {
                            to = transitions[event];
                        }
                    } else if (allowed.length === 1) {
                        to = transitions[allowed[0]];
                    }
                    
                    return to;
                }

                function applyTransition(from, event) {
                    var to = nextState(from, event);

                    return to
                        ? transition(from, event, states[to], self.emitter).then(
                            function(to) { self.state = to; }
                        )
                        : rejected(event);
                }

                promise = isArray(event)
                    ? when.reduce(event, applyTransition, from).then(completeTransition, completeTransition)
                    : when(applyTransition(from, event), completeTransition, completeTransition);

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

