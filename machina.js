(function(define) {

define(['./support/when'], function(when) {

    function removeFromArray(array, item) {
        var i = 0;

        for(;item !== array[i]; i++) {}

        i < array.length && array.splice(i, 0)
    }

    function rejected(reason) {
        var d = when.defer();
        d.reject(reason);
        return d.promise;
    }

    function createState(name, stateDef, transition) {
        var state, transitions, event;

        transitions = stateDef.transitions;
        state = new State(name, !transitions || !!stateDef.isFinal);

        if(transitions) {
            
            for(event in transitions) {
                if(transitions.hasOwnProperty(event)) {
                    state[event] = function() {
                        return transition(state, event, transitions[event]);
                    }
                }
            }
        }

        return state;
    }

    var Evented = {
        on: function(actions) {
            var events, remove;

            events = this._events;

            if(typeof actions === 'function') {
                events.start.push(actions);
                remove = function() {
                    removeFromArray(events, actions);
                }
            } else {
                var start, end;

                start = actions.start;
                end   = actions.end;

                start && events.start.push(start);
                end   && events.end.push(end);

                remove = function() {
                    if(start) removeFromArray(events.start, start);
                    if(end)   removeFromArray(events.end,   end);
                }
            }

            return remove;
        },
        
        _emit: function(event, data) {
            var actions;
            
            actions = this._events[event];

            return when.reduce(actions, function(value, nextAction) {
                return nextAction(value);
            }, data);
        }
    };
    
    function makeEvented(target) {
        target._events = {
            start: [],
            end:   []
        };

        return target;
    }

    function State(name, isFinal) {
        this.name = name;
        this.isFinal = isFinal;
        makeEvented(this);
    }
    
    State.prototype = {
        on: function(actions) {
            Evented.on.call(this, { start: actions.enter||actions, end: actions.leave });
        },

        enter: function(data) {
            return Evented._emit.call(this, 'start', data);
        },
        
        leave: function(data) {
            return Evented._emit.call(this, 'end', data);
        }
    };

    function Run() {
        makeEvented(this);
    }

    function applyTransition(state, event) {
        var transition = state[event];

        return typeof transition === 'function'
            ? transition()
            : rejected(event);
    }

    /**
     * Creates a state machine
     * @param stateTable {Object} the state and transition definitions
     */
    function Machina(stateTable) {
        var self, blueprint, stateDefs, states, state;

        self = this;
        stateDefs = stateTable.states;
        states = {};

        function transition(from, event, toName) {
            var to = states[toName];

            function transitionStart(data) {
                return Evented._emit.call(self, 'start', data);
            }

            function leaveFrom(data) {
                return from.leave(data);
            }

            function enterTo(data) {
                return to.enter(data);
            }

            function transitionEnd(data) {
                return Evented._emit.call(self, 'end', data).then(function() { return to; });
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
                states[state] = createState(state, stateDefs[state], transition);
            }
        }

        blueprint = {
            state: states[stateTable.start],

            transition: function(event) {

                var self, origTransition, onResolve, promise;

                self = this;

                origTransition = this.transition;
                this.transition = function(event) {
                    return when(promise, function() {
                        return origTransition(event);
                    });
                };

                function completeTransition(val) {
                    self.transition = self.state.isFinal
                        ? rejected
                        : origTransition;

                    return val;
                }

                onResolve = function(endState) {
                    self.state = endState;
                    return completeTransition(self);
                };

                promise = typeof event === 'string'
                    ? applyTransition(this.state, event)
                    : when.reduce(event, applyTransition, this.state);

                promise = when(promise, onResolve, completeTransition);

                return promise;
            },

            isFinal: function() {
                return this.state.isFinal;
            }
        };
        
        this.start = function() {
            Run.prototype = blueprint;
            return new Run();
        };

        makeEvented(this);
        this.on = function(what, actions) {
            if(states[what]) {
                states[what].on(actions);
            } else {
                Evented.on.call(this, actions);
            }
        }
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
        : function(deps, factory) { this.Machina = factory(this.when); }
));

