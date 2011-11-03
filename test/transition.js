var Machine, Evented, table, machine;

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
    console.trace(e);
}

function success(r) {
    console.log('OK', r.state);
}

function progress(p) {
    console.log('PROGRESS', p);
}

function expectedError(e) {
    console.log('EXPECTED ERROR', e);
}

machine = new Machine(table);

var events = new Evented();
events.on('request:start', progress);
events.on('request:end', progress);

events.on('none:leave', progress);
events.on('pending:enter', progress);
events.on('pending:leave', progress);

events.on('accept:start', progress);
events.on('accept:end', progress);

c1 = machine.start(events.emitter);

//c1.transition('request').then(success, fail);
//c1.transition('accept').then(success, fail);

c1.transition(['request', 'accept']).then(success, fail);
//c1.transition('remove').then(success, fail);
//machine.accepts(['request', 'foo']).then(success, fail);
