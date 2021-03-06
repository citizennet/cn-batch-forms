export default function BatchResults($state, parent, $stateParams) {
  'ngInject';

  var vm = this;
  vm.parent = parent;
  vm.results = vm.parent.results;
  vm.originals = vm.parent.models;
  vm.config = vm.parent.resultsConfig;
  vm.displayName = vm.config && vm.config.displayName || 'name';
  vm.formName = $state.current.name;
  vm.text = vm.config.text;

  vm.activate = activate;
  vm.showEdit = showEdit;
  vm.submit = submit;

  vm.activate();

  //////////

  function activate() {
    if (vm.config.idParam) {
      vm.results.forEach((result, index) => {
        if (_.isFunction(vm.config.buildEditSref)) {
          result.editSref = vm.config.buildEditSref(result.body, index);
        }
        else {
          const params = _.assign({}, $stateParams, {[vm.config.idParam]: vm.originals[index].id});
          result.editSref = `${$state.current.name}(${angular.toJson(params)})`;
        }
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

  function showEdit(result) {
    return result.editSref && _.inRange(result.status, 200, 299);
  }

  function submit(handler) {
    vm.parent.closeModal();
    if(handler) {
      handler();
    }
  }

}
