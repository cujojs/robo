var Machina, table, machine;

Machina = require('../machina');
table = {
     start: 'one',
     states: {
         one: {
             data: 1,
             transitions: {
                 gotoTwo: 'two',
                 go: 'two'
             }
         },
         two: {
             data: 2,
             transitions: {
                 gotoThree: 'three',
                 go: 'three'
             }
         },
         three: {
             data: 3
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

 machine = new Machina(table);

 console.log("MACHINE", machine);

 var run1 = machine.start();
 var run2 = machine.start();

 run1.transition('gotoTwo')
         .then(success, fail);

 run1 = machine.start();

 run1.transition('gotoTwo')
         .then(function(r) { return r.transition('go'); })
         .then(success, fail);

 run1 = machine.start();

 run1.transition('gotoTwo')
         .then(function(r) { return run2.transition('go'); })
         .then(function(r) {
             console.log(run1.state);
             console.log(run2.state);
         });

 run1 = machine.start();

 run1.transition('error').then(fail, expectedError);

 machine.accepts(['go', 'go']).then(success, fail, progress);

 run1 = machine.start();
 run1.transition(['go', 'go', 'foo']).then(fail, expectedError, progress);