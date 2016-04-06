(function() {
  angular
      .module('cn.batch-forms')
      .factory('cnBatchForms', cnBatchForms);

  cnBatchForms.$inject = [
    'cnFlexFormService',
    'cnFlexFormTypes',
    'sfPath',
    '$rootScope',
    '$state',
    '$timeout',
    'cnFlexFormModalLoaderService'
  ];
  function cnBatchForms(
      cnFlexFormService,
      cnFlexFormTypes,
      sfPath,
      $rootScope,
      $state,
      $timeout,
      cnFlexFormModalLoaderService) {

    let instances = 0;

    let fieldTypeHandlers = {
      'string': processDefault,
      'number': processNumber,
      'cn-autocomplete': processSelect,
      'cn-currency': processNumber,
      'cn-datetimepicker': processDate,
      'cn-toggle': processToggle
    };

    return {
      augmentSchema
    };

    //////////

    function augmentSchema(schema, model, models) {
      if(!models.length) return schema;

      var service = BatchForms(schema, model, models);

      return service;
    }

    function BatchForms(schema, model, models) {
      return Object.create({
        constructor,
        addMeta,
        addToSchema,
        clearDefaults,
        clearSchemaDefault,
        closeModal,
        createDirtyCheck,
        createBatchField,
        getChangedModels,
        getEditModeLegends,
        getModelValues,
        getSchemaDefault,
        getTitleMap,
        onFieldScope,
        processCondition,
        processForm,
        processField,
        processItems,
        processDate,
        processDefault,
        processNumber,
        processSelect,
        processToggle,
        setValue,
        showResults
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
      this.editModes = {};
      this.fieldRegister = {};

      this.clearDefaults();

      if(schema.forms) {
        let i = schema.forms.length - 1;
        while(i > -1) {
          this.processForm(schema.forms[i]);
          if(!schema.forms[i].form.length) {
            schema.forms.splice(i, 1);
          }
          --i;
        }
        //schema.forms.forEach(this.processForm.bind(this));
      }
      else {
        this.processForm(schema.form);
      }

      this.addMeta();

      $rootScope.$on('schemaFormPropagateScope', this.onFieldScope.bind(this));

      console.log('BatchDone:', schema, model, models);

      return this;
    }

    function onFieldScope(event, scope) {
      let key = scope.form._key;
      //console.log('onFieldScope:', key, scope.form.key, scope);
      if(key) {
        this.fieldRegister[key].ngModel = scope.ngModel;
      }
      // prevent edit mode radiobuttons from setting form to dirty
      else if(scope.form.key[0] === '__batchConfig') {
        scope.ngModel.$pristine = false;
      }

    }

    function processForm(form) {
      this.processItems(form, 'form');
    }

    function processItems(field, children = 'items') {
      //console.log('processItems:', field, children);
      let i = field[children].length - 1;
      while(i > -1) {
        let child = field[children][i];
        let show = this.processField(child);
        if(child.batchConfig && show) {
          //console.log('child:', child);
          child.htmlClass = (child.htmlClass || '') + ' cn-batch-field';
          let batchField = this.createBatchField(child);
          let dirtyCheck = this.createDirtyCheck(child);
          // add mode buttons after field
          field[children][i] = {
            type: 'section',
            htmlClass: 'cn-batch-wrapper',
            items: [child, dirtyCheck, batchField],
            condition: this.processCondition(child.condition)
          };
          delete child.condition;
          this.fieldRegister[child.key] = {
            field: child
          };
        }
        if(!show) {
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
      if(field.key) {
        if(!field.batchConfig) return false;

        field._key = field.key;
        field.schema = field.schema || cnFlexFormService.getSchema(field.key, this.schema.schema.properties);
        field.type = field.type || field.schema.type;
        //field.required = false;

        let fieldType = cnFlexFormTypes.getFieldType(field);
        let handler = fieldTypeHandlers[fieldType];

        if(handler) {
          if(!_.isObject(field.batchConfig)) field.batchConfig = {};
          field.batchConfig.ogValues = this.getModelValues(field);

          if(_.allEqual(field.batchConfig.ogValues)) {
            let key = `__ogValues["${field.key}"]`;
            let first = _.first(field.batchConfig.ogValues);
            cnFlexFormService.parseExpression(key, this.model).set(first);
          }

          handler.bind(this)(field);
        }
        else return false;
      }
      else if(field.items) {
        this.processItems(field);
        if(!field.items.length) return false;
      }
      return true;
    }

    function getTitleMap(editModes) {
      editModes = editModes || ['replace'];

      return editModes.map(value => {
        this.editModes[value] = true;
        return {
          name: _.capitalize(value),
          value
        };
      });
    }

    function getSchemaDefault(def) {
      return def || 'replace';
    }

    function createBatchField(field) {
      let key = `__batchConfig["${field.key}"]`;

      let batchField = {
        key,
        type: 'radiobuttons',
        titleMap: this.getTitleMap(field.batchConfig.editModes),
        htmlClass: 'cn-batch-options',
        btnClass: 'btn-sm cn-no-dirty-check'
      };

      if(batchField.titleMap.length === 1) {
        batchField.condition = 'false';
      }

      this.addToSchema(key, {
        type: 'string',
        title: 'Edit Mode',
        default: this.getSchemaDefault(field.batchConfig.default)
      });

      if(field.batchConfig.onSelect) {
        batchField.watch = {
          resolution: (val, prev) => {
            console.log('field.batchConfig.onSelect, val, prev:', field.batchConfig.onSelect, val, prev);
            field.batchConfig.onSelect[val](prev);
          }
        };
      }

      return batchField;
    }

    function createDirtyCheck(field) {
      let path = sfPath.parse(field.key);
      let key = `__dirtyCheck["${path[0]}"]`;
      let child = path.length > 1;
      let htmlClass = '';

      //if(child) htmlClass += ' semi-transparent';
      if(field.notitle || !field.schema.title) htmlClass += ' notitle';

      let dirtyCheck = {
        key,
        htmlClass,
        type: 'cn-dirty-check'
      };

      this.addToSchema(key, {
        type: 'boolean',
        notitle: true
      });

      console.log('dirtyCheck:', field.key, dirtyCheck.readonly);

      if(!child) {
        if(field.watch) {
          if(!_.isArray(field.watch)) field.watch = [field.watch];
        }
        else {
          field.watch = [];
        }

        field.watch.push({
          resolution: (val, prev) => {
            if(!angular.equals(val, prev)) {
              let register = this.fieldRegister[field.key];
              if(register) {
                if((register.ngModel && register.ngModel.$dirty) || register.initiated) {
                  //console.log('dirtyCheck.key:', dirtyCheck.key);
                  cnFlexFormService.parseExpression(dirtyCheck.key, this.model).set(true);
                }
                else {
                  console.log('initiated:', register);
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
      let path = sfPath.parse(key);
      let depth = this.schema.schema;

      path.forEach((k, i) => {
        if(i === path.length - 1) {
          if(!depth.properties) {
            depth.properties = {};
          }
          depth.properties[k] = schema;
        }
        else if(k === '') {
          if(!depth.items) {
            depth.items = {
              type: 'object'
            };
          }
          depth = depth.items;
        }
        else {
          if(!depth.properties) {
            depth.properties = {};
          }
          if(!depth.properties[k]) {
            depth.properties[k] = {
              type: 'object'
            };
          }
          depth = depth.properties[k];
        }
      });
    }

    function getModelValues(field) {
      return this.models.map(model => {
        return cnFlexFormService.parseExpression(field.key, model).get();
      });
    }

    function getChangedModels() {
      let models = [];

      _.each(this.fieldRegister, (register, key) => {
        let dirty = cnFlexFormService
            .parseExpression(`__dirtyCheck["${key}"]`, this.model)
            .get();

        console.log('key, dirty:', key, dirty, register);
        if(!dirty) return;

        let mode = cnFlexFormService
            .parseExpression(`__batchConfig["${key}"]`, this.model)
            .get();

        this.models.forEach((model, i) => {
          if(!models[i]) models[i] = {};

          let val = cnFlexFormService
              .parseExpression(key, this.model)
              .get();
          let update = cnFlexFormService
              .parseExpression(key, models[i]);
          let original = cnFlexFormService
              .parseExpression(key, this.models[i]);

          this.setValue(val, update, original, mode);
        });
      });

      return models;
    }

    function setValue(val, update, original, mode) {
      if(mode === 'replace') {
        update.set(val);
      }
      else if(mode === 'append') {
        let originalVal = original.get();
        if(_.isArray(originalVal)) {
          update.set(originalVal.concat(val));
        }
        else if(_.isString(originalVal)) {
          update.set(`${originalVal} ${val.trim()}`);
        }
      }
      else if(mode === 'prepend') {
        let originalVal = original.get();
        if(_.isArray(originalVal)) {
          update.set(val.concat(originalVal));
        }
        else if(_.isString(originalVal)) {
          update.set(`${val.trim()} ${originalVal}`);
        }
      }
      else if(mode === 'increase') {
        update.set(original.get() + val);
      }
      else if(mode === 'decrease') {
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
      let config = field.batchConfig;

      config.editModes = config.editModes || ['replace', 'prepend', 'append'];

      config.default = config.default || 'append';

      config.onSelect = {
        replace: () => {
          if(_.allEqual(config.ogValues)) {
            field.placeholder = _.first(config.ogValues);
          }
          else {
            field.placeholder = '—';
          }
        },
        append: () => {
          field.placeholder = '';
        },
        prepend: () => {
          field.placeholder = '';
        }
      };
    }

    function processNumber(field) {
      let config = field.batchConfig;

      config.editModes = config.editModes || ['replace', 'decrease', 'increase'];

      if(_.allEqual(config.ogValues)) {
        field.placeholder = _.first(config.ogValues);
      }
      else {
        field.placeholder = '—';
      }

      console.log('number placeholder:', field.placeholder);
    }

    function  processSelect(field) {
      let type = field.schema.type;
      let config = field.batchConfig;

      if(type === 'array') {
        config.editModes = config.editModes || ['replace', 'append'];

        config.default = config.default || 'append';

        config.onSelect = {
          replace: (prev) => {
            if(prev !== 'append') {
              cnFlexFormService.parseExpression(field.key, this.model).set([]);
            }
          },
          append: (prev) => {
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

        let first = _.first(config.ogValues);
        //TODO: dynamically send back data
        if(first && _.allEqual(config.ogValues)) {
          let titleMap = field.titleMap || (field.titleMapResolve && this.schema.data[field.titleMapResolve]);
          console.log('titleMap, first:', titleMap, first);
          if(titleMap/* && !_.isObject(first)*/) {
            first = _.find(titleMap, {[field.valueProperty || 'value']: first});
          }
          field.placeholder = first[field.displayProperty || 'name'];
        }

        if(!field.placeholder) {
          field.placeholder = '—';
        }
      }
    }

    function processDate(field) {
      let config = field.batchConfig;

      if(_.allEqual(config.ogValues)) {
        field.placeholder = moment(_.first(config.ogValues)).format('M/DD/YYYY h:mm a');
      }
      else {
        field.placeholder = '—';
      }
    }

    function processToggle(field) {
      let config = field.batchConfig;

      if(_.allEqual(config.ogValues)) {
        if(_.first(config.ogValues) == field.onValue) {
          field.undefinedClass = 'semi-transparent';
        }
        else {
          field.undefinedClass = 'disabled semi-transparent';
        }
      }
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
      if(schema.type === 'object' && schema.properties) {
        _.each(schema.properties, this.clearSchemaDefault.bind(this));
      }
      else if(schema.type === 'array' && schema.items) {
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

      let config = this.resultsConfig;
      if(config && config.returnState) {
        //timeout needed so current state
        $timeout(() => $state.go(config.returnState.name, config.returnState.params));
      }

      this.results = [];
      this.resultsConfig = null;
    }

    function addMeta() {
      this.schema.meta = `
          <div class="well">
            <h5>Edit Modes</h5>
            <p>Some types of fields allow you to apply batch changes in
            different ways:</p>
            <dl>
              <dt>Replace:</dt>
              <dd>Replace all the original values
              with the new value. <em>(If you don't see an <b>Edit Mode</b> option
              for a field, this will be the default)</em></dd>
            </dl>
            ${this.getEditModeLegends()}
          </div>`;
    }

    function getEditModeLegends() {
      let legends = '';

      if(this.editModes.prepend) {
        legends += `
            <dl>
              <dt>Prepend:</dt>
              <dd>Add the new value to the start of the original
              values for each item.</dd>
            </dl>`;
      }
      if(this.editModes.append) {
        legends += `
            <dl>
              <dt>Append:</dt>
              <dd>Affix the new value at the end of the original
              values for each item.</dd>
            </dl>`;
      }
      if(this.editModes.decrease) {
        legends += `
            <dl>
              <dt>Decrease:</dt>
              <dd>Subtract the given value from the original
              values for each item.</dd>
            </dl>`;
      }
      if(this.editModes.increase) {
        legends += `
            <dl>
              <dt>Increase:</dt>
              <dd>Add the given value to the original
              values for each item.</dd>
            </dl>`;
      }
      return legends;
    }
  }

})();