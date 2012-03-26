var delay, Machine, Evented, table, machine;

delay = require('when/delay');
Machine = require('../Machine');
Evented = require('../Evented');
table = {
    start:'none',
    states:{
        none: {
            isFinal: true,
            transitions: {
                request: 'pending'
            }
        },
        pending: {
            transitions: {
                ignore: 'none',
                block: 'blocked',
                accept: 'accepted',
                resend: 'pending',
                remove: 'none'                
            }
        },
        accepted: {
            isFinal: true,
            transitions: {
                remove: 'none'
            }
        },
        blocked: {
            isFinal: true,
            transitions: {
                unblock: 'none'
            }
        }
    }
};

function fail(e) {
    console.error('ERROR', e);
	console.error(e.stack);
}

function success(r) {
//	console.log(r);
}

function progress(p) {
	var message = p.event + ': ' + p.from.name + ' -> ' + p.to.name;
	console.log(message);
	return delay(1000);
}

function expectedError(e) {
    console.log('EXPECTED ERROR', e);
}

machine = new Machine(table);

var events = new Evented();
events.on('request:start', progress);
events.on('accept:start', progress);
events.on('remove:start', progress);

// Examples of other events
events.on('request:end', progress);
events.on('accept:end', progress);
events.on('remove:end', progress);
//events.on('none:leave', progress);
//events.on('pending:enter', progress);
//events.on('pending:leave', progress);

c1 = machine.start(events.emitter);

//c1.transition('request').then(success, fail);
//c1.transition('accept').then(success, fail);
//c1.transition('remove').then(success, fail);

//c1.transition(['request', 'accept']).then(success, fail);
machine.accepts(['request', 'foo']).then(success, fail);
