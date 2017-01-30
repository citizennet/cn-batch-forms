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
    vm.originals = vm.parent.models;
    vm.config = vm.parent.resultsConfig;
    vm.displayName = vm.config && vm.config.displayName || 'name';
    vm.formName = $state.current.name;
    vm.onEdit  = vm.config && vm.config.onEdit;
    vm.text = vm.config.text;

    vm.activate = activate;
    vm.handleEdit = handleEdit;
    vm.showEdit = showEdit;
    vm.submit = submit;

    vm.activate();

    //////////

    function activate() {
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

    function handleEdit(config, result) {
      if (_.isFunction(vm.onEdit)) {
        vm.onEdit(result.body);
      }
      else {
        const params = _.assign({}, $stateParams, { [config.idParam]: result.body.id });
        $state.go($state.current.name, params);
      }
    }

    function showEdit(config, result) {
      return config.idParam && _.inRange(result.status, 200, 299);
    }

    function submit(handler) {
      vm.parent.closeModal();
      if(handler) {
        handler();
      }
    }

  }

})();
