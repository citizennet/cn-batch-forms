'use strict';

(function () {
  angular.module('cn.batch-forms', ['schemaForm', 'cn.flex-form', 'cn.util', 'ui.router']);
})();
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

(function () {
  'use strict';

  angular.module('cn.batch-forms').controller('BatchResults', BatchResults);

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

    vm.activate = activate;
    vm.submit = submit;

    vm.activate();

    //////////

    function activate() {
      console.log('vm.parent:', vm.parent);
      if (vm.config.idParam) {
        vm.results.forEach(function (result, i) {
          var params = _.assign({}, $stateParams, _defineProperty({}, vm.config.idParam, vm.originals[i].id));
          result.editSref = $state.current.name + '(' + angular.toJson(params) + ')';
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
            handler: function handler() {
              if (vm.config && vm.config.returnState) {
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
      if (handler) {
        handler();
      }
    }
  }
})();
'use strict';

(function () {
  'use strict';

  angular.module('cn.batch-forms').config(cnBatchFormsConfig).run(addTemplates);

  var TYPE = 'cn-dirty-check';
  var TEMPLATE_URL = 'cn-batch-forms/cn-dirty-check.html';

  cnBatchFormsConfig.$inject = ['cnFlexFormServiceProvider'];

  function cnBatchFormsConfig(cnFlexFormServiceProvider) {
    cnFlexFormServiceProvider.registerField({
      condition: function condition(field) {
        return field.type === TYPE;
      },
      handler: function handler(field) {/*console.log('field.readonly:', field.key, field.readonly)*/},
      type: TYPE,
      templateUrl: TEMPLATE_URL
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
                 ng-disabled="form.readonly"\
                 name="{{form.key.slice(-1)[0]}}"/>\
        </div>');
  }
})();
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

(function () {
  angular.module('cn.batch-forms').factory('cnBatchForms', cnBatchForms);

  cnBatchForms.$inject = ['cnFlexFormService', 'cnFlexFormTypes', 'sfPath', '$rootScope', '$state', '$timeout', 'cnModal'];
  function cnBatchForms(cnFlexFormService, cnFlexFormTypes, sfPath, $rootScope, $state, $timeout, cnModal) {

    var instances = 0;

    var fieldTypeHandlers = {
      'string': processDefault,
      'number': processNumber,
      'url': 'processDefault',
      'cn-autocomplete': processSelect,
      'cn-currency': processNumber,
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
        getChangedModels: getChangedModels,
        getEditModeLegends: getEditModeLegends,
        getModelValues: getModelValues,
        getSchemaDefault: getSchemaDefault,
        getTitleMap: getTitleMap,
        onFieldScope: onFieldScope,
        processCondition: processCondition,
        processForm: processForm,
        processField: processField,
        processItems: processItems,
        processDate: processDate,
        processDefault: processDefault,
        processNumber: processNumber,
        processSelect: processSelect,
        processToggle: processToggle,
        setValue: setValue,
        showResults: showResults
      }).constructor(schema, model, models);
    }

    function constructor(schema, model, models) {
      console.log('BatchForms:', schema, model, models);

      this.instance = instances;
      //cnFlexFormModalLoaderService.resolveMapping('results', this.instance, this);
      instances++;

      this.schema = schema;
      this.model = model;
      this.models = models;
      this.editModes = {};
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
      var key = scope.form._key;
      //console.log('onFieldScope:', key, scope.form.key, scope);
      if (key) {
        this.fieldRegister[key].ngModel = scope.ngModel;
      }
      // prevent edit mode radiobuttons from setting form to dirty
      else if (scope.form.key[0] === '__batchConfig') {
          scope.ngModel.$pristine = false;
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
        if (child.batchConfig && show) {
          //console.log('child:', child);
          child.htmlClass = (child.htmlClass || '') + ' cn-batch-field clearfix';
          var batchField = this.createBatchField(child);
          var dirtyCheck = child.key && this.createDirtyCheck(child);
          // add mode buttons after field
          field[children][i] = {
            type: 'section',
            htmlClass: 'cn-batch-wrapper',
            items: dirtyCheck ? [child, dirtyCheck, batchField] : [child, batchField],
            condition: this.processCondition(child.condition)
          };
          delete child.condition;
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

    function processCondition(condition) {
      return condition && condition.replace(/\b(model)\.(\S*)\b/g, '($1.$2 === undefined ? $1.__ogValues["$2"] : $1.$2)');
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

          if (_.allEqual(field.batchConfig.ogValues)) {
            var key = '__ogValues["' + field.key + '"]';
            var first = _.first(field.batchConfig.ogValues);
            cnFlexFormService.parseExpression(key, this.model).set(first);
          }

          handler.bind(this)(field);
        } else return false;
      } else if (field.items) {
        if (field.batchConfig) {
          field.items.forEach(function (child) {
            child.batchConfig = _.clone(field.batchConfig);
          });
        }
        this.processItems(field);
        if (!field.items.length) return false;

        if (field.batchConfig) {
          if (!_.isObject(field.batchConfig)) field.batchConfig = {};
          field.batchConfig.key = 'component_' + _.uniqueId();
          field.batchConfig.watch = [];

          field.items.forEach(function (item, i) {
            var child = item.items[0];
            if (!i) {
              field.batchConfig.editModes = child.batchConfig.editModes;
              field.batchConfig.default = child.batchConfig.default;
            }
            field.batchConfig.watch.push({
              resolution: 'model.__batchConfig["' + child.key + '"] = model.__batchConfig["' + field.batchConfig.key + '"]'
            });
            item.items[2].condition = 'false';
          });
        }
      }
      return true;
    }

    function getTitleMap(editModes) {
      var _this = this;

      editModes = editModes || ['replace'];

      return editModes.map(function (value) {
        _this.editModes[value] = true;
        return {
          name: _.capitalize(value),
          value: value
        };
      });
    }

    function getSchemaDefault(def) {
      return def || 'replace';
    }

    function createBatchField(field) {
      var batchConfig = field.batchConfig;
      var key = '__batchConfig["' + (field.key || batchConfig.key) + '"]';

      var batchField = {
        key: key,
        type: 'radiobuttons',
        titleMap: this.getTitleMap(batchConfig.editModes),
        htmlClass: 'cn-batch-options',
        btnClass: 'btn-sm cn-no-dirty-check',
        watch: batchConfig.watch || []
      };

      if (batchField.titleMap.length === 1) {
        batchField.condition = 'false';
      }

      this.addToSchema(key, {
        type: 'string',
        title: 'Edit Mode',
        default: this.getSchemaDefault(batchConfig.default)
      });

      if (batchConfig.onSelect) {
        batchField.watch.push({
          resolution: function resolution(val, prev) {
            if (!val) return;
            batchConfig.onSelect[val](prev);
          }
        });
      }

      return batchField;
    }

    function createDirtyCheck(field) {
      var _this2 = this;

      var path = sfPath.parse(field.key);
      var key = '__dirtyCheck["' + path[0] + '"]';
      var child = path.length > 1;
      var htmlClass = '';

      //if(child) htmlClass += ' semi-transparent';
      if (field.notitle || !field.schema.title) htmlClass += ' notitle';

      var dirtyCheck = {
        key: key,
        htmlClass: htmlClass,
        type: 'cn-dirty-check'
      };

      this.addToSchema(key, {
        type: 'boolean',
        notitle: true
      });

      if (!child) {
        if (field.watch) {
          if (!_.isArray(field.watch)) field.watch = [field.watch];
        } else {
          field.watch = [];
        }

        field.watch.push({
          resolution: function resolution(val, prev) {
            if (!angular.equals(val, prev)) {
              var register = _this2.fieldRegister[field.key];
              if (register) {
                if (register.ngModel && register.ngModel.$dirty || register.initiated) {
                  //console.log('dirtyCheck.key:', dirtyCheck.key);
                  cnFlexFormService.parseExpression(dirtyCheck.key, _this2.model).set(true);
                } else {
                  register.initiated = true;
                }
              }
              // debug
              else {
                  console.log('noregister:', register);
                }
            }
          }
        });
      }

      return dirtyCheck;
    }

    function addToSchema(key, schema) {
      var path = sfPath.parse(key);
      var depth = this.schema.schema;

      path.forEach(function (k, i) {
        if (i === path.length - 1) {
          if (!depth.properties) {
            depth.properties = {};
          }
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
      var _this3 = this;

      var models = [];

      _.each(this.fieldRegister, function (register, key) {
        var dirty = cnFlexFormService.parseExpression('__dirtyCheck["' + key + '"]', _this3.model).get();

        if (!dirty) return;

        var mode = cnFlexFormService.parseExpression('__batchConfig["' + key + '"]', _this3.model).get();

        _this3.models.forEach(function (model, i) {
          if (!models[i]) models[i] = {};

          var val = cnFlexFormService.parseExpression(key, _this3.model).get();
          var update = cnFlexFormService.parseExpression(key, models[i]);
          var original = cnFlexFormService.parseExpression(key, _this3.models[i]);

          _this3.setValue(val, update, original, mode);
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
      } else if (mode === 'increase') {
        update.set(original.get() + val);
      } else if (mode === 'decrease') {
        update.set(original.get() - val);
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

    function processDefault(field) {
      var config = field.batchConfig;

      config.editModes = config.editModes || ['replace', 'prepend', 'append'];

      config.default = config.default || 'append';

      config.onSelect = {
        replace: function replace() {
          if (_.allEqual(config.ogValues)) {
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

    function processNumber(field) {
      var config = field.batchConfig;

      config.editModes = config.editModes || ['replace', 'decrease', 'increase'];

      if (_.allEqual(config.ogValues)) {
        field.placeholder = _.first(config.ogValues);
      } else {
        field.placeholder = '—';
      }
    }

    function processSelect(field) {
      var _this4 = this;

      var type = field.schema.type;
      var config = field.batchConfig;

      if (type === 'array') {
        config.editModes = config.editModes || ['replace', 'append'];

        config.default = config.default || 'append';

        config.onSelect = {
          replace: function replace(prev) {
            if (prev !== 'append') {
              cnFlexFormService.parseExpression(field.key, _this4.model).set([]);
            }
          },
          append: function append(prev) {
            if (prev !== 'replace') {
              cnFlexFormService.parseExpression(field.key, _this4.model).set([]);
            }
          },
          remove: function remove() {
            var val = _.chain(field.batchConfig.ogValues).flatten().uniq().value();
            cnFlexFormService.parseExpression(field.key, _this4.model).set(val);
          }
        };
      } else {

        var first = _.first(config.ogValues);
        //TODO: dynamically send back data
        if (first && _.allEqual(config.ogValues)) {
          var titleMap = field.titleMap || field.titleMapResolve && this.schema.data[field.titleMapResolve];
          if (titleMap /* && !_.isObject(first)*/) {
              first = _.find(titleMap, _defineProperty({}, field.valueProperty || 'value', first));
            }
          field.placeholder = first && first[field.displayProperty || 'name'];
        }

        if (!field.placeholder) {
          field.placeholder = '—';
        }
      }
    }

    function processDate(field) {
      var config = field.batchConfig;

      if (_.allEqual(config.ogValues)) {
        field.placeholder = moment(_.first(config.ogValues)).format('M/DD/YYYY h:mm a');
      } else {
        field.placeholder = '—';
      }
    }

    function processToggle(field) {
      var config = field.batchConfig;

      if (_.allEqual(config.ogValues)) {
        if (_.first(config.ogValues) == (field.onValue || true)) {
          field.undefinedClass = 'semi-transparent';
        } else {
          field.undefinedClass = 'disabled semi-transparent';
        }
      }
    }

    function clearDefaults() {
      this.schema.schema.required = undefined;
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
        schema.required = undefined;
        _.each(schema.properties, this.clearSchemaDefault.bind(this));
      } else if (schema.type === 'array' && schema.items) {
        this.clearSchemaDefault(schema.items);
      }
    }

    function showResults(results, config) {
      var _this5 = this;

      this.results = results;
      this.resultsConfig = config;

      if (this.modal) {
        this.modal.close();
      }

      this.modal = cnModal.open({
        controller: 'BatchResults',
        controllerAs: 'vm',
        templateUrl: 'cn-batch-forms/batch-results.html',
        resolve: {
          parent: function parent() {
            return _this5;
          }
        }
      });
    }

    function closeModal() {
      this.modal.close();
      this.results = [];
      this.resultsConfig = null;
    }

    function addMeta() {
      this.schema.meta = '\n          <div class="well">\n            <h5>Edit Modes</h5>\n            <p>Some types of fields allow you to apply batch changes in\n            different ways:</p>\n            <dl>\n              <dt>Replace:</dt>\n              <dd>Replace all the original values\n              with the new value. <em>(If you don\'t see an <b>Edit Mode</b> option\n              for a field, this will be the default)</em></dd>\n            </dl>\n            ' + this.getEditModeLegends() + '\n          </div>';
    }

    function getEditModeLegends() {
      var legends = '';

      if (this.editModes.prepend) {
        legends += '\n            <dl>\n              <dt>Prepend:</dt>\n              <dd>Add the new value to the start of the original\n              values for each item.</dd>\n            </dl>';
      }
      if (this.editModes.append) {
        legends += '\n            <dl>\n              <dt>Append:</dt>\n              <dd>Affix the new value at the end of the original\n              values for each item.</dd>\n            </dl>';
      }
      if (this.editModes.decrease) {
        legends += '\n            <dl>\n              <dt>Decrease:</dt>\n              <dd>Subtract the given value from the original\n              values for each item.</dd>\n            </dl>';
      }
      if (this.editModes.increase) {
        legends += '\n            <dl>\n              <dt>Increase:</dt>\n              <dd>Add the given value to the original\n              values for each item.</dd>\n            </dl>';
      }
      return legends;
    }
  }
})();
"use strict";

angular.module("cn.batch-forms").run(["$templateCache", function ($templateCache) {
  $templateCache.put("cn-batch-forms/batch-results.html", "<div class=\"cn-modal\">\n  <div class=\"modal-header clearfix\">\n    <cn-flex-form-header\n      ff-header-config=\"vm.headerConfig\"\n      ff-submit=\"vm.submit(handler)\">\n    </cn-flex-form-header>\n  </div>\n  <div class=\"modal-body cn-list\"\n       cn-responsive-height=\"80\"\n       cn-responsive-break=\"sm\"\n       cn-set-max-height>\n    <table class=\"table card-flex gutterless\">\n      <tbody>\n      <tr ng-repeat=\"result in vm.results\">\n        <td class=\"col-sm-10\">\n          <h6 ng-show=\"result.status == 200\">\n            {{result.body[vm.displayName]}}\n            <span class=\"text-mute\">({{result.body.id}})</span>\n          </h6>\n          <h6 ng-show=\"result.status != 200\">\n            {{vm.originals[$index][vm.displayName]}}\n            <span class=\"text-mute\">({{vm.originals[$index].id}})</span>\n          </h6>\n          <p ng-class=\"{\n               \'text-danger\': result.status != 200,\n               \'text-primary\': result.status == 200\n             }\">\n            <i class=\"fa fa-{{result.status == 200 ? \'check\' : \'times\'}}\"></i>\n            {{result.status == 200 ? \'updated successfully\' : result.body.message}}\n          </p>\n        </td>\n        <td class=\"col-sm-2 text-center\">\n          <a ng-show=\"result.editSref\"\n             class=\"btn btn-sm btn-transparent\"\n             ui-sref=\"{{result.editSref}}\">\n            <i class=\"icn-edit\"></i>\n          </a>\n        </td>\n      </tr>\n      </tbody>\n    </table>\n  </div>\n</div>\n");
}]);