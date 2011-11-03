var Machine, table, machine;

Machine = require('../machina');
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

c1 = machine.start();

c1.transition(['request', 'accept']).then(success, fail);
c1.transition('remove').then(success, fail);
//machine.accepts(['request', 'foo']).then(success, fail);
