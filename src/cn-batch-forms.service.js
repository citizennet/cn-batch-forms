(function() {
  angular
      .module('cn.batch-forms')
      .factory('cnBatchForms', cnBatchForms);

  cnBatchForms.$inject = ['cnFlexFormService', 'cnFlexFormTypes'];
  function cnBatchForms(cnFlexFormService, cnFlexFormTypes) {
    var fieldTypeHandlers = {
      'string': processString,
      'cn-autocomplete': processSelect,
      'cn-datetimepicker': processDate
    };

    return {
      augmentSchema
    };

    //////////

    function augmentSchema(schema, model, models) {
      if(!models.length) return schema;

      var service = BatchForms(schema, model, models);

      return service.schema;
    }

    function BatchForms() {
      return Object.create({
        constructor,
        createBatchField,
        processForm,
        processField,
        processDate,
        processHidden,
        processString,
        processSelect,
        getModelValues
      }).constructor();
    }

    function constructor(schema, model, models) {
      this.schema = schema;
      this.model = model;
      this.models = models;

      if(schema.forms) {
        schema.forms.forEach(this.processForm);
      }
      else {
        this.processForm(schema.form);
      }

      return this;
    }

    function processForm(form) {
      let i = form.items.length;
      while(i) {
        let field = form.items[i - 1];
        this.processField(field);
        if(field.batchConfig) {
          let batchField = this.createBatchField(field);
          form.items.splice(i, 0, batchField);
        }
      }
    }

    function processField(field) {
      if(!field.batchConfig) {
        processHidden(field);
        return;
      }
      if(field.key) {
        field.schema = field.schema || cnFlexFormService.getSchema(field);

        let fieldType = cnFlexFormTypes.getFieldType(field);
        let handler = fieldTypeHandlers[fieldType];

        if(handler) {
          if(!_.isObject(field.batchConfig)) field.batchConfig = {};
          field.batchConfig.ogValues = this.getModelValues(field);

          handler.bind(this)(field);
        }
        else {
          this.processHidden(field);
          return;
        }
      }
      else if(field.items) {
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
        key: `$$batch$$.${field.key}`,
        schema: {
          type: 'string',
          title: 'Edit Mode'
        }
      };
    }

    function getModelValues(field) {
      return this.models.map(model => {
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

      if(_.uniq(field.batchConfig.ogValues).length === 1) {
        field.placeholder = _.first(field.batchConfig.ogValues);
      }
      else {
        field.placeholder = '—';
      }
    }

    function processSelect(field) {
      let type = field.schema.type;

      if(type === 'array') {
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
          replace: (prev) => {
            if(prev !== 'push') {
              cnFlexFormService.parseExpression(field.key, this.model).set([]);
            }
          },
          push: (prev) => {
            if(prev !== 'replace') {
              cnFlexFormService.parseExpression(field.key, this.model).set([]);
            }
          },
          remove: () => {
            let val = _.chain(field.batchConfig.ogValues).flatten().uniq().value();
            cnFlexFormService.parseExpression(field.key, this.model).set(val);
          }
        };
      }
      else {
        field.batchConfig.titleMap = field.batchConfig.titleMap || [{
          name: 'Replace',
          value: 'replace'
        }];

        field.batchConfig.onSelect = {
          replace: (prev) => {
            let first = _.first(field.batchConfig.ogValues);
            if(_.every(field.batchConfig.ogValues, first)) {
              field.placeholder = first[field.displayProperty || 'name'];
            }
            else {
              field.placeholder = '—';
            }
          }
        };
      }

      field.batchConfig.watch = {
        resolution: (val, prev) => {
          field.batchConfig.onSelect[val](prev);
        }
      };
    }

    function processDate(field) {

    }
  }

})();