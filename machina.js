(function(define) {

define(['./Evented', './support/when'], function(Evented, when) {

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

    function Run() {}

    /**
     * Creates a state machine
     * @param stateTable {Object} the state and transition definitions
     */
    function Machina(stateTable) {
        var self, blueprint, stateDefs, states, state;

        self = this;
        stateDefs = stateTable.states;
        states = {};

        function transition(from, event, to, emitter) {

            function transitionStart(data) {
                return emitter.emit('start:'+event, data);
            }

            function leaveFrom(data) {
//                return data;
                return emitter.emit('leave:'+from.name, data);
            }

            function enterTo(data) {
//                return data;
                return emitter.emit('enter:'+to.name, data);
            }

            function transitionEnd(data) {
//                return to;
                return when(emitter.emit('end:'+event, data), function() { return to; });
            }

            var steps = [transitionStart, leaveFrom, enterTo, transitionEnd];
            return to
                ? when.reduce(steps,
                    function(val, nextStep) {
                        return nextStep(val);
                    })
                : rejected(event);

        }

        for(state in stateDefs) {
            if(stateDefs.hasOwnProperty(state)) {
                states[state] = createState(state, stateDefs[state]);
            }
        }
        
        var on = Evented.prototype.on;

        blueprint = {
            state: states[stateTable.start],
            
            states: states,
            
            on: function(event, handler) {
                if(event.indexOf(':') < 0) {
                    event = (states[event] ? 'enter:' : 'end:') + event;
                }
                
                on.call(this, event, handler);
            },

            emit: Evented.prototype.emit,

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

                function completeTransition(val) {
                    self.transition = origTransition;
                    return val;
                }

                function applyTransition(from, event) {
                    var to = from.transitions[event];
                    return to
                        ? transition(from, event, states[to], self.emitter)
                        : rejected(event);
                }

                function onResolve(endState) {
                    self.state = endState;
                    return completeTransition(self);
                }

                promise = typeof event === 'string'
                    ? applyTransition(from, event)
                    : when.reduce(event, applyTransition, from);

                promise = when(promise, onResolve, completeTransition);

                return promise;
            },

            isFinal: function() {
                return this.state.isFinal;
            }
        };
        
        this.start = function() {
            Run.prototype = blueprint;
            var run = new Run();
            
            Evented.call(run);
            
            return run;
        };

    }

    Machina.prototype = {
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
        : function(deps, factory) { this.Machina = factory(this.Evented, this.when); }
));

