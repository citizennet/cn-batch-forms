const TYPE = 'cn-dirty-check';
const TEMPLATE_URL = 'cn-batch-forms/cn-dirty-check.html';

export function cnBatchFormsConfig(cnFlexFormServiceProvider) {
  'ngInject';
  cnFlexFormServiceProvider.registerField({
    condition: (field) => field.type === TYPE,
    handler: (field) => {/*console.log('field.readonly:', field.key, field.readonly)*/},
    type: TYPE,
    templateUrl: TEMPLATE_URL
  });
}

export function addDirtyCheckTpl($templateCache) {
  'ngInject';
  $templateCache.put(
      TEMPLATE_URL,
      '\
      <div class="checkbox cn-dirty-check {{form.htmlClass}}">\
        <input type="checkbox"\
               ng-model="$$value$$"\
               ng-model-options="form.ngModelOptions"\
               sf-changed="form"\
               ng-disabled="form.readonly"\
               name="{{form.key.slice(-1)[0]}}"/>\
      </div>'
  );
}
