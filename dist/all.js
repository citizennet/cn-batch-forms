'use strict';

(function () {
  angular.module('cn.batch-forms', ['cn-flex-form', 'cn.util']);
})();
'use strict';

(function () {
  angular.module('cn.batch-forms').factory('cnBatchForms', cnBatchForms);

  cnBatchForms.$inject = ['cnFlexFormService'];
  function cnBatchForms(cnFlexFormService) {
    var fieldTypeHandlers = {
      'string': processString,
      'cn-autocomplete': processSelect
    };

    return {
      augmentSchema: augmentSchema
    };

    //////////

    function augmentSchema(schema, model, models) {
      if (!models.length) return schema;

      var service = BatchForms(schema, model, models);

      return service.schema;
    }

    function BatchForms() {
      return Object.create({
        constructor: constructor,
        processField: processField,
        postProcessField: postProcessField,
        processHidden: processHidden,
        processString: processString,
        processSelect: processSelect,
        getModelValues: getModelValues
      }).constructor();
    }

    function constructor(schema, model, models) {
      var _this = this;

      this.schema = schema;
      this.model = model;
      this.models = models;

      if (schema.forms) {
        schema.forms.forEach(function (form) {
          return form.forEach(_this.processField);
        });
      } else {
        schema.form.forEach(this.processField);
      }

      return this;
    }

    function processField(field) {
      if (!field.batchConfig) {
        processHidden(field);
        return;
      }
      if (field.key) {
        field.schema = field.schema || cnFlexFormService.getSchema(field);

        var fieldType = cnFlexFormTypes.getFieldType(field);
        var handler = fieldTypeHandlers[fieldType];

        if (handler) {
          if (!_.isObject(field.batchConfig)) field.batchConfig = {};
          field.batchConfig.ogValues = this.getModelValues(field);

          handler.bind(this)(field);
          this.postProcessField(field);
        } else {
          this.processHidden(field);
          return;
        }
      } else if (field.items) {
        field.items.forEach(this.processField);
      }
    }

    function postProcessField(field) {}

    function getModelValues(field) {
      return this.models.map(function (model) {
        return cnFlexFormService.parseExpression(field.key, model).get();
      });
    }

    function processHidden(field) {
      field.condition = 'false';
    }

    function processString(field) {
      field.batchConfig.titleMap = field.batchConfig.titleMap || [{
        name: 'Replace',
        value: 'replace'
      }, {
        name: 'Append',
        value: 'push'
      }];

      if (_.uniq(field.batchConfig.ogValues).length === 1) {
        field.placeholder = _.first(field.batchConfig.ogValues);
      } else {
        field.placeholder = '—';
      }
    }

    function processSelect(field) {
      var _this2 = this;

      var type = field.schema.type;

      if (type === 'array') {
        field.batchConfig.titleMap = field.batchConfig.titleMap || [{
          name: 'Replace',
          value: 'replace'
        }, {
          name: 'Append',
          value: 'push'
        }, {
          name: 'Remove',
          value: 'remove'
        }];

        field.batchConfig.onSelect = {
          replace: function replace(prev) {
            if (prev !== 'push') {
              cnFlexFormService.parseExpression(field.key, _this2.model).set([]);
            }
          },
          push: function push(prev) {
            if (prev !== 'replace') {
              cnFlexFormService.parseExpression(field.key, _this2.model).set([]);
            }
          },
          remove: function remove() {
            var val = _.chain(field.batchConfig.ogValues).flatten().uniq().value();
            cnFlexFormService.parseExpression(field.key, _this2.model).set(val);
          }
        };
      } else {
        field.batchConfig.titleMap = field.batchConfig.titleMap || [{
          name: 'Replace',
          value: 'replace'
        }];

        field.batchConfig.onSelect = {
          replace: function replace(prev) {
            var first = _.first(field.batchConfig.ogValues);
            if (_.every(field.batchConfig.ogValues, first)) {
              field.placeholder = first[field.displayProperty || 'name'];
            } else {
              field.placeholder = '—';
            }
          }
        };
      }

      field.batchConfig.watch = {
        resolution: function resolution(val, prev) {
          field.batchConfig.onSelect[val](prev);
        }
      };
    }
  }
})();