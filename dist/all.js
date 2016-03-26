'use strict';

(function () {
  angular.module('cn.batch-forms', ['schemaForm', 'cn.flex-form', 'cn.util', 'ui.router']);
})();
'use strict';

(function () {
  'use strict';

  angular.module('cn.batch-forms').controller('BatchResults', BatchResults);

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

      if (!vm.results) {
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
'use strict';

(function () {
  'use strict';

  angular.module('cn.batch-forms').config(cnBatchFormsConfig).run(addTemplates);

  var TYPE = 'cn-dirty-check';
  var TEMPLATE_URL = 'cn-batch-forms/cn-dirty-check.html';

  cnBatchFormsConfig.$inject = ['cnFlexFormServiceProvider', 'cnFlexFormModalLoaderServiceProvider'];

  function cnBatchFormsConfig(cnFlexFormServiceProvider, cnFlexFormModalLoaderServiceProvider) {

    cnFlexFormServiceProvider.registerField({
      condition: function condition(field) {
        return field.type === TYPE;
      },
      handler: function handler(field) {},

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
    $templateCache.put(TEMPLATE_URL, '\
        <div class="checkbox cn-dirty-check {{form.htmlClass}}">\
          <input type="checkbox"\
                 ng-model="$$value$$"\
                 ng-model-options="form.ngModelOptions"\
                 sf-changed="form"\
                 name="{{form.key.slice(-1)[0]}}"/>\
        </div>');
  }
})();
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

(function () {
  angular.module('cn.batch-forms').factory('cnBatchForms', cnBatchForms);

  cnBatchForms.$inject = ['cnFlexFormService', 'cnFlexFormTypes', 'sfPath', '$rootScope', '$state', '$timeout', 'cnFlexFormModalLoaderService'];
  function cnBatchForms(cnFlexFormService, cnFlexFormTypes, sfPath, $rootScope, $state, $timeout, cnFlexFormModalLoaderService) {

    var instances = 0;

    var fieldTypeHandlers = {
      'string': processString,
      'cn-autocomplete': processSelect,
      'cn-datetimepicker': processDate,
      'cn-toggle': processToggle
    };

    return {
      augmentSchema: augmentSchema
    };

    //////////

    function augmentSchema(schema, model, models) {
      if (!models.length) return schema;

      var service = BatchForms(schema, model, models);

      return service;
    }

    function BatchForms(schema, model, models) {
      return Object.create({
        constructor: constructor,
        addMeta: addMeta,
        addToSchema: addToSchema,
        clearDefaults: clearDefaults,
        clearSchemaDefault: clearSchemaDefault,
        closeModal: closeModal,
        createDirtyCheck: createDirtyCheck,
        createBatchField: createBatchField,
        onFieldScope: onFieldScope,
        processForm: processForm,
        processField: processField,
        processItems: processItems,
        processDate: processDate,
        processString: processString,
        processSelect: processSelect,
        processToggle: processToggle,
        getModelValues: getModelValues,
        getChangedModels: getChangedModels,
        setValue: setValue,
        showResults: showResults
      }).constructor(schema, model, models);
    }

    function constructor(schema, model, models) {
      console.log('BatchForms:', schema, model, models);

      this.instance = instances;
      cnFlexFormModalLoaderService.resolveMapping('results', this.instance, this);
      instances++;

      this.schema = schema;
      this.model = model;
      this.models = models;
      this.fieldRegister = {};

      this.clearDefaults();

      if (schema.forms) {
        var i = schema.forms.length - 1;
        while (i > -1) {
          this.processForm(schema.forms[i]);
          if (!schema.forms[i].form.length) {
            schema.forms.splice(i, 1);
          }
          --i;
        }
        //schema.forms.forEach(this.processForm.bind(this));
      } else {
          this.processForm(schema.form);
        }

      this.addMeta();

      $rootScope.$on('schemaFormPropagateScope', this.onFieldScope.bind(this));

      console.log('BatchDone:', schema, model, models);

      return this;
    }

    function onFieldScope(event, scope) {
      //console.log('onFieldScope:', scope.form.key, scope);
      var key = scope.form._key;
      if (key) {
        this.fieldRegister[key].ngModel = scope.ngModel;
      }
    }

    function processForm(form) {
      this.processItems(form, 'form');
    }

    function processItems(field) {
      var children = arguments.length <= 1 || arguments[1] === undefined ? 'items' : arguments[1];

      //console.log('processItems:', field, children);
      var i = field[children].length - 1;
      while (i > -1) {
        var child = field[children][i];
        var show = this.processField(child);
        if (child.batchConfig) {
          child.htmlClass = (child.htmlClass || '') + ' cn-batch-field';
          var batchField = this.createBatchField(child);
          var dirtyCheck = this.createDirtyCheck(child);
          // add mode buttons after field
          field[children][i] = {
            type: 'section',
            htmlClass: 'cn-batch-wrapper',
            items: [child, dirtyCheck, batchField]
          };
          this.fieldRegister[child.key] = {
            field: child
          };
        }
        if (!show) {
          // remove field if batch isn't supported by it or children
          field[children].splice(i, 1);
        }
        --i;
      }
    }

    function processField(field) {
      //console.log('processField:', field.batchConfig, field);
      if (field.key) {
        if (!field.batchConfig) return false;

        field._key = field.key;
        field.schema = field.schema || cnFlexFormService.getSchema(field.key, this.schema.schema.properties);
        field.type = field.type || field.schema.type;
        //field.required = false;

        var fieldType = cnFlexFormTypes.getFieldType(field);
        var handler = fieldTypeHandlers[fieldType];

        if (handler) {
          if (!_.isObject(field.batchConfig)) field.batchConfig = {};
          field.batchConfig.ogValues = this.getModelValues(field);

          handler.bind(this)(field);
        } else return false;
      } else if (field.items) {
        this.processItems(field);
        if (!field.items.length) return false;
      }
      return true;
    }

    function createBatchField(field) {
      var batchField = {
        type: 'radiobuttons',
        titleMap: field.batchConfig.titleMap,
        key: '__batchConfig.' + field.key,
        htmlClass: 'cn-batch-options',
        btnClass: 'btn-small'
      };

      if (batchField.titleMap.length === 1) {
        batchField.condition = 'false';
      }

      this.addToSchema(field.key, '__batchConfig', {
        type: 'string',
        title: 'Edit Mode',
        default: field.batchConfig.default
      });

      if (field.batchConfig.onSelect) {
        batchField.watch = {
          resolution: function resolution(val, prev) {
            field.batchConfig.onSelect[val](prev);
          }
        };
      }

      return batchField;
    }

    function createDirtyCheck(field) {
      var _this = this;

      var dirtyCheck = {
        type: 'cn-dirty-check',
        htmlClass: field.notitle || !field.schema.title ? 'notitle' : '',
        key: '__dirtyCheck.' + field.key
      };

      this.addToSchema(field.key, '__dirtyCheck', {
        type: 'boolean',
        notitle: true
      });

      if (field.watch) {
        if (!_.isArray(field.watch)) field.watch = [field.watch];
      } else {
        field.watch = [];
      }

      field.watch.push({
        resolution: function resolution(val, prev) {
          if (!angular.equals(val, prev)) {
            var register = _this.fieldRegister[field.key];
            if (register && register.ngModel.$dirty) {
              cnFlexFormService.parseExpression(dirtyCheck.key, _this.model).set(true);
            }
          }
        }
      });

      return dirtyCheck;
    }

    function addToSchema(key, start, schema) {
      var path = sfPath.parse(key);
      var depth = this.schema.schema.properties[start];

      path.forEach(function (k, i) {
        if (i === path.length - 1) {
          depth.properties[k] = schema;
        } else if (k === '') {
          if (!depth.items) {
            depth.items = {
              type: 'object'
            };
          }
          depth = depth.items;
        } else {
          if (!depth.properties) {
            depth.properties = {};
          }
          if (!depth.properties[k]) {
            depth.properties[k] = {
              type: 'object'
            };
          }
          depth = depth.properties[k];
        }
      });
    }

    function getModelValues(field) {
      return this.models.map(function (model) {
        return cnFlexFormService.parseExpression(field.key, model).get();
      });
    }

    function getChangedModels() {
      var _this2 = this;

      var models = [];

      _.each(this.fieldRegister, function (register, key) {
        var dirty = cnFlexFormService.parseExpression('__dirtyCheck.' + key, _this2.model).get();

        console.log('key, dirty:', key, dirty, register);
        if (!dirty) return;

        var mode = cnFlexFormService.parseExpression('__batchConfig.' + key, _this2.model).get();

        _this2.models.forEach(function (model, i) {
          if (!models[i]) models[i] = {};

          var val = cnFlexFormService.parseExpression(key, _this2.model).get();
          var update = cnFlexFormService.parseExpression(key, models[i]);
          var original = cnFlexFormService.parseExpression(key, _this2.models[i]);

          _this2.setValue(val, update, original, mode);
        });
      });

      return models;
    }

    function setValue(val, update, original, mode) {
      if (mode === 'replace') {
        update.set(val);
      } else if (mode === 'append') {
        var originalVal = original.get();
        if (_.isArray(originalVal)) {
          update.set(originalVal.concat(val));
        } else if (_.isString(originalVal)) {
          update.set(originalVal + ' ' + val.trim());
        }
      } else if (mode === 'prepend') {
        var originalVal = original.get();
        if (_.isArray(originalVal)) {
          update.set(val.concat(originalVal));
        } else if (_.isString(originalVal)) {
          update.set(val.trim() + ' ' + originalVal);
        }
      }
      /* This needs work, _.find(val, item) might not work because the
         the items we're comparing might have the same id but one might
         have different properties
      else if(mode === 'remove') {
        original.get().forEach(item => {
          if(!_.find(val, item)) {
            update = _.reject(update, item);
          }
        });
      }
      */
    }

    function processString(field) {
      var config = field.batchConfig;

      config.titleMap = config.titleMap || [{
        name: 'Replace',
        value: 'replace'
      }, {
        name: 'Prepend',
        value: 'prepend'
      }, {
        name: 'Append',
        value: 'append'
      }];

      config.default = config.default || 'append';

      config.onSelect = {
        replace: function replace() {
          if (_.uniq(config.ogValues).length === 1) {
            field.placeholder = _.first(config.ogValues);
          } else {
            field.placeholder = '—';
          }
        },
        append: function append() {
          field.placeholder = '';
        },
        prepend: function prepend() {
          field.placeholder = '';
        }
      };
    }

    function processSelect(field) {
      var _this3 = this;

      var type = field.schema.type;
      var config = field.batchConfig;

      if (type === 'array') {
        config.titleMap = config.titleMap || [{
          name: 'Replace',
          value: 'replace'
        }, {
          name: 'Append',
          value: 'append'
        } /*, {
           name: 'Remove',
           value: 'remove'
          }*/];

        config.default = config.default || 'append';

        config.onSelect = {
          replace: function replace(prev) {
            if (prev !== 'append') {
              cnFlexFormService.parseExpression(field.key, _this3.model).set([]);
            }
          },
          append: function append(prev) {
            if (prev !== 'replace') {
              cnFlexFormService.parseExpression(field.key, _this3.model).set([]);
            }
          },
          remove: function remove() {
            var val = _.chain(field.batchConfig.ogValues).flatten().uniq().value();
            cnFlexFormService.parseExpression(field.key, _this3.model).set(val);
          }
        };
      } else {
        config.titleMap = config.titleMap || [{
          name: 'Replace',
          value: 'replace'
        }];

        config.default = config.default || 'replace';

        //if(field.titleMap && !_.chain(field.titleMap).first().isObject().value()) {
        //  field.placeholder = _.first(config.ogValues);
        //}
        //if(field.schema.type === 'object') {
        var first = _.first(config.ogValues);
        if (_.isObject(first)) {
          if (_.every(config.ogValues, first)) {
            field.placeholder = first[field.displayProperty || 'name'];
          }
        } else if (_.uniq(config.ogValues).length === 1) {
          if (field.titleMap) {
            first = _.find(field.titleMap, _defineProperty({}, field.valueProperty || 'value', first));
          }
          field.placeholder = first[field.displayProperty || 'name'];
        }
        //}
        if (!field.placeholder) {
          field.placeholder = '—';
        }
      }
    }

    function processDate(field) {
      var config = field.batchConfig;

      config.titleMap = config.titleMap || [{
        name: 'Replace',
        value: 'replace'
      }];

      config.default = config.default || 'replace';

      if (_.uniq(config.ogValues).length === 1) {
        field.placeholder = moment(_.first(config.ogValues)).format('M/DD/YYYY h:mm a');
      } else {
        field.placeholder = '—';
      }
    }

    function processToggle(field) {
      var config = field.batchConfig;

      config.titleMap = config.titleMap || [{
        name: 'Replace',
        value: 'replace'
      }];

      config.default = config.default || 'replace';

      if (_.uniq(config.ogValues).length === 1) {}
    }

    function clearDefaults() {
      this.schema.schema.required = [];
      _.each(this.schema.schema.properties, this.clearSchemaDefault.bind(this));

      this.schema.schema.properties.__batchConfig = {
        type: 'object',
        properties: {}
      };

      this.schema.schema.properties.__dirtyCheck = {
        type: 'object',
        properties: {}
      };
    }

    function clearSchemaDefault(schema) {
      schema.default = undefined;
      if (schema.type === 'object' && schema.properties) {
        _.each(schema.properties, this.clearSchemaDefault.bind(this));
      } else if (schema.type === 'array' && schema.items) {
        this.clearSchemaDefault(schema.items);
      }
    }

    function showResults(results, config) {
      console.log('showResults:', results, this);
      this.results = results;
      this.resultsConfig = config;

      $state.go('.modal', {
        modal: 'results',
        modalId: this.instance
      });

      this.onCloseModal = $rootScope.$on('$stateChangeStart', this.closeModal.bind(this));
    }

    function closeModal(e, toState, toParams) {
      console.log('closeModal:', e, toState, toParams);
      console.log('this.resultsConfig:', this.resultsConfig);
      this.onCloseModal();

      var config = this.resultsConfig;
      if (config && config.returnState) {
        //timeout needed so current state
        $timeout(function () {
          return $state.go(config.returnState.name, config.returnState.params);
        });
      }

      this.results = [];
      this.resultsConfig = null;
    }

    function addMeta() {
      this.schema.meta = '\n          <div class="well">\n            <h5>Edit Modes</h5>\n            <p>Some types of fields allow you to apply batch changes in\n            different ways:</p>\n            <dl>\n              <dt>Replace:</dt>\n              <dd>Replace all the original values\n              with the new value. <em>(If you don\'t see an <b>Edit Mode</b> option\n              for a field, this will be the default)</em></dd>\n            </dl>\n            <dl>\n              <dt>Prepend:</dt>\n              <dd>Add the new value to the start of the original\n              values for each item.</dd>\n            </dl>\n            <dl>\n              <dt>Append:</dt>\n              <dd>Affix the new value at the end of the original\n              values for each item.</dd>\n            </dl>\n          </div>';
    }
  }
})();
"use strict";

angular.module("cn.batch-forms").run(["$templateCache", function ($templateCache) {
  $templateCache.put("cn-batch-forms/batch-results.html", "<div class=\"cn-modal\">\n  <div class=\"modal-header clearfix\">\n    <cn-flex-form-header\n      ff-header-config=\"vm.headerConfig\"\n      ff-submit=\"vm.done()\">\n    </cn-flex-form-header>\n  </div>\n  <div class=\"modal-body cn-list\"\n       cn-responsive-height=\"80\"\n       cn-responsive-break=\"sm\"\n       cn-set-max-height>\n    <ul class=\"list-group gutterless\">\n      <li ng-repeat=\"result in vm.results\"\n          class=\"list-group-item\"\n          ng-class=\"{\n            \'text-danger\': result.status != 200,\n            \'text-primary\': result.status == 200\n          }\">\n        <div class=\"row\">\n          <div class=\"col-sm-1 text-center\">\n            <i class=\"fa fa-{{result.status == 200 ? \'check\' : \'times\'}}\"></i>\n          </div>\n          <div class=\"col-sm-11\"\n               ng-show=\"result.status == 200\">\n            {{result.body[vm.displayName]}} ({{result.body.id}}):\n            updated successfully\n          </div>\n          <div class=\"col-sm-11\"\n               ng-show=\"result.status != 200\">\n            {{vm.originals[$index][vm.displayName]}} ({{vm.originals[$index].id}}):\n            {{result.body.message}}\n          </div>\n        </div>\n      </li>\n    </ul>\n  </div>\n</div>\n");
}]);