(function() {
  'use strict';

  angular
      .module('cn.batch-forms')
      .controller('BatchResults', BatchResults);

  BatchResults.$inject = ['$state', 'parent', '$timeout'];

  function BatchResults($state, parent, $timeout) {

    var vm = this;
    vm.parent = parent;
    vm.results = vm.parent.results;
    vm.originals = vm.parent.models;
    vm.config = vm.parent.resultsConfig;
    vm.displayName = vm.config && vm.config.displayName || 'name';

    vm.activate = activate;
    vm.cancel = cancel;
    vm.done = cancel;

    vm.activate();

    //////////

    function activate() {
      console.log('vm.parent:', vm.parent);

      if(!vm.results) {
        // the modal doesn't go away without the timeout
        $timeout(vm.cancel);
      }

      vm.headerConfig = {
        title: {
          main: 'Batch Results'
        },
        actionConfig: {
          actions: [{
            text: 'Cool'
          }]
        },
        noData: true
      };
    }

    function cancel() {
      $state.go('^');
    }

  }

})();