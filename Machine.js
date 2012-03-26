(function(define) {

define(['./Evented', 'when'], function(Evented, when) {

	var undef;

	var isArray = Array.isArray || function(it) {
		return Object.prototype.toString.call(it) == '[object Array]';
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

	/**
	 * A Run is one execution of a Machine
	 * @constructor
	 * @param start {String} Machine starting state
	 * @param emitter {Function} function to be invoked with event notifications
	 */
	function Run(start, emitter) {
		this.state = start;
		this.emitter = emitter;
	}

	/**
	 * Creates a state machine
	 * @constructor
	 * @param stateTable {Object} the state and transition definitions
	 */
	function Machine(stateTable) {
		var self, blueprint, stateDefs, states, state, inflightTransition;

		self = this;
		stateDefs = stateTable.states;
		states = {};

		function transition(from, event, to, emitter) {

			// TODO: Consider using deferred progress events instead of or
			// in addition to an event emitter
			function transitionStart(data) {
//				console.log('start', data);
				return emitter ? emitter(event + ":start", data) : data;
			}

			function leaveFrom(data) {
//				console.log('leave', data);
				return emitter ? emitter(from.name+':leave', data) : data;
			}

			function enterTo(data) {
//				console.log('enter', data);
				return emitter ? emitter(to.name+':enter', data) : data;
			}

			function transitionEnd(data) {
//				console.log('end', data);
				return emitter ? emitter(event+':end', data) : data;
			}

			var steps = [transitionStart, leaveFrom, enterTo, transitionEnd];

			return to
				? when.reduce(steps,
					function(val, nextStep) {
						return nextStep(val);
					}, { from: from, to: to, event: event })
					.then(function() {
						return to;
					})
				: rejected(event);

		}

		function available(state) {
			var available, transitions;

			available = [];
			transitions = state.transitions;

			for(var event in transitions) {
				if(transitions.hasOwnProperty(event)) {
					// TODO: Add conditional transitions
					available.push(event);
				}
			}

			return available;
		}

		for(state in stateDefs) {
			if(stateDefs.hasOwnProperty(state)) {
				states[state] = createState(state, stateDefs[state]);
			}
		}

		/**
		 * The blueprint (states, events, transitions) of this Machine
		 */
		blueprint = {
			states: states,

			/**
			 * Returns the valid set of transitions that can be taken from
			 * the current state.
			 *
			 * @return {Array}
			 */
			available: function() {
				return available(this.state);
			},

			/**
			 * Transition from the current state to a new state
			 * @param event {String|Array} event name or sequence of event names of the transition(s) to make.
			 *  If event is an Array of Strings, they will be applied in order.  If the sequence of events
			 *  is NOT a valid transition, the returned promise will reject.
			 * @return {Promise} a promise that will resolve when the transition has completed
			 */
			transition: function(event) {

				var self;//, from, origTransition;

				self = this;

				function completeTransition() {
					return self;
				}

				inflightTransition = when(inflightTransition, function() {

					var from = self.state;

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
							? transition(from, event, states[to], self.emitter)
							.then(
								function(to) {
									self.state = to;
									return to;
								}
							)
							: rejected(event);
					}

					return isArray(event)
						? when.reduce(event, applyTransition, from).then(completeTransition, completeTransition)
						: when(applyTransition(from, event), completeTransition, completeTransition);

				});

				return inflightTransition;
			},

			/**
			 * @return {Boolean} true iff the current state is a final state
			 */
			isFinal: function() {
				return this.state.isFinal;
			}
		};

		/**
		 * Starts a new run of this Machine
		 * @param [start] {String} starting state.  If not supplied, defaults to the
		 *  starting state with which the Machine was configured
		 * @param eventEmitter
		 */
		this.start = function(start, eventEmitter) {
			var run;

			if (typeof start === 'function') {
				eventEmitter = start;
				start = states[stateTable.start];
			} else {
				start = states[start || stateTable.start];
			}

			Run.prototype = blueprint;
			run = new Run(start, eventEmitter);
			Run.prototype = undef;

			return run;
		};

	}

	Machine.prototype = {
		/**
		 * Determines if the supplied sequence of events causes a transition that
		 * ends in a final state.
		 * @param events {Array|String} sequence of events, or a single event
		 * @return {Promise} a promise that resolves if the supplied sequence of
		 * event represent a valid transition that ends at a final state, and rejects
		 * if either the squence of events is not valid, or the ending state is not
		 * final.
		 */
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

