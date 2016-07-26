(function() {
  'use strict';

  angular
      .module('cn.batch-forms')
      .controller('BatchResults', BatchResults);

  BatchResults.$inject = ['$state', 'parent', '$stateParams'];

  function BatchResults($state, parent, $stateParams) {

    var vm = this;
    vm.parent = parent;
    vm.results = vm.parent.results;
    //vm.errors = _.reject(vm.results, {status: 200});
    vm.originals = vm.parent.models;
    vm.config = vm.parent.resultsConfig;
    vm.displayName = vm.config && vm.config.displayName || 'name';
    vm.formName = $state.current.name;
    vm.text = vm.config.text;

    vm.activate = activate;
    vm.submit = submit;

    vm.activate();

    //////////

    function activate() {
      console.log('vm.parent:', vm.parent);
      if(vm.config.idParam) {
        vm.results.forEach((result, i) => {
          let params = _.assign({}, $stateParams, {[vm.config.idParam]: vm.originals[i].id});
          result.editSref = `${$state.current.name}(${angular.toJson(params)})`;
          console.log('result.editSref:', result);
        });
      }

      vm.headerConfig = {
        title: {
          main: 'Batch Results'
        },
        actionConfig: {
          actions: [{
            text: 'Continue Editing'
          }, {
            text: 'Done',
            handler: () => {
              if(vm.config && vm.config.returnState) {
                $state.go(vm.config.returnState.name, vm.config.returnState.params);
              }
            }
          }]
        },
        noData: true
      };

    }

    function submit(handler) {
      console.log('submit:', handler);
      vm.parent.closeModal();
      if(handler) {
        handler();
      }
    }

  }

})();