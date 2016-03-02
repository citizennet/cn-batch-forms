'use strict';

(function () {
  angular.module('cn.batch-forms', ['cn-flex-form', 'cn.util']);
})();
'use strict';

(function () {
  angular.module('cn.batch-forms').factory('cnBatchForms', cnBatchForms);

  cnBatchForms.$inject = ['cnFlexFormService', 'cnFlexFormTypes'];
  function cnBatchForms(cnFlexFormService, cnFlexFormTypes) {
    var fieldTypeHandlers = {
      'string': processString,
      'cn-autocomplete': processSelect,
      'cn-datetimepicker': processDate
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
        createBatchField: createBatchField,
        processForm: processForm,
        processField: processField,
        processDate: processDate,
        processHidden: processHidden,
        processString: processString,
        processSelect: processSelect,
        getModelValues: getModelValues
      }).constructor();
    }

    function constructor(schema, model, models) {
      this.schema = schema;
      this.model = model;
      this.models = models;

      if (schema.forms) {
        schema.forms.forEach(this.processForm);
      } else {
        this.processForm(schema.form);
      }

      return this;
    }

    function processForm(form) {
      var i = form.items.length;
      while (i) {
        var field = form.items[i - 1];
        this.processField(field);
        if (field.batchConfig) {
          var batchField = this.createBatchField(field);
          form.items.splice(i, 0, batchField);
        }
      }
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
        } else {
          this.processHidden(field);
          return;
        }
      } else if (field.items) {
        this.processForm(field);
      }
    }

    function createBatchField(field) {
      return {
        type: 'radiobuttons',
        titleMap: field.batchConfig.titleMap,
        watch: {
          resolution: field.batchConfig.onSelect
        },
        key: '$$batch$$.' + field.key,
        schema: {
          type: 'string',
          title: 'Edit Mode'
        }
      };
    }

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
      var _this = this;

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
              cnFlexFormService.parseExpression(field.key, _this.model).set([]);
            }
          },
          push: function push(prev) {
            if (prev !== 'replace') {
              cnFlexFormService.parseExpression(field.key, _this.model).set([]);
            }
          },
          remove: function remove() {
            var val = _.chain(field.batchConfig.ogValues).flatten().uniq().value();
            cnFlexFormService.parseExpression(field.key, _this.model).set(val);
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

    function processDate(field) {}
  }
})();