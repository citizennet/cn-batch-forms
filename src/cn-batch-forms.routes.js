(function() {
  'use strict';

  angular
      .module('cn.batch-forms')
      .config(cnBatchFormsConfig)
      .run(addTemplates);

  const TYPE = 'cn-dirty-check';
  const TEMPLATE_URL = 'cn-batch-forms/cn-dirty-check.html';

  cnBatchFormsConfig.$inject = [
    'cnFlexFormServiceProvider',
    'cnFlexFormModalLoaderServiceProvider'
  ];

  function cnBatchFormsConfig(
      cnFlexFormServiceProvider,
      cnFlexFormModalLoaderServiceProvider) {

    cnFlexFormServiceProvider.registerField({
      condition(field) {
        return field.type === TYPE;
      },
      handler(field) {

      },
      type: TYPE,
      templateUrl: TEMPLATE_URL
    });

    cnFlexFormModalLoaderServiceProvider.addMapping('results', {
      controller: 'BatchResults',
      controllerAs: 'vm',
      templateUrl: 'cn-batch-forms/batch-results.html'
    });
  }

  addTemplates.$inject = ['$templateCache'];
  function addTemplates($templateCache) {
    $templateCache.put(
        TEMPLATE_URL,
        '\
        <div class="checkbox cn-dirty-check {{form.htmlClass}}">\
          <input type="checkbox"\
                 ng-model="$$value$$"\
                 ng-model-options="form.ngModelOptions"\
                 sf-changed="form"\
                 name="{{form.key.slice(-1)[0]}}"/>\
        </div>'
    );
  }

})();