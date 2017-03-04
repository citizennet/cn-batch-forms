(function() {
  angular
      .module('cn.batch-forms')
      .provider('cnBatchForms', cnBatchFormsProvider);

  let fieldTypeHandlers = {
    'string': 'processDefault',
    'number': 'processNumber',
    'url': 'processDefault',
    'array': 'processSelect',
    'cn-autocomplete': 'processSelect',
    'cn-currency': 'processNumber',
    'cn-datetimepicker': 'processDate',
    'cn-toggle': 'processToggle'
  };

  function cnBatchFormsProvider() {
    return {
      registerField,
      $get: cnBatchForms
    };

    ///////////

    function registerField(fieldType) {
      if(fieldType.handler) {
        fieldTypeHandlers[fieldType.type] = fieldType.handler;
      }
    }
  }

  cnBatchForms.$inject = [
    'cnFlexFormService',
    'cnFlexFormTypes',
    'sfPath',
    '$rootScope',
    '$timeout',
    'cnModal'
  ];
  function cnBatchForms(
      cnFlexFormService,
      cnFlexFormTypes,
      sfPath,
      $rootScope,
      $timeout,
      cnModal) {

    let instances = 0;

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
        clearSchemaDefault,
        closeModal,
        createDirtyCheck,
        createBatchField,
        getChangedModels,
        getEditModeLegends,
        getFormFromRegister,
        getModelValues,
        getSchemaDefault,
        getTitleMap,
        handleLinks,
        onFieldScope,
        onReprocessField,
        processCondition,
        processSchema,
        processField,
        processItems,
        processDate,
        processDefault,
        processLinkList,
        processLinks,
        processNumber,
        processSelect,
        processToggle,
        registerFieldWatch,
        resetDefaults,
        restoreDefaults,
        setValidation,
        setValue,
        showResults
      }).constructor(schema, model, models);
    }

    function constructor(schema, model, models) {

      this.instance = instances;
      //cnFlexFormModalLoaderService.resolveMapping('results', this.instance, this);
      instances++;

      this.schema = schema;
      this.model = model;
      this.models = models;
      this.defaults = {};
      this.editModes = {};
      this.fieldRegister = {};

      this.processSchema();

      if(schema.forms) {
        let i = schema.forms.length - 1;
        while(i > -1) {
          this.processItems(schema.forms[i].form);
          if(!schema.forms[i].form.length) {
            schema.forms.splice(i, 1);
          }
          --i;
        }
      }
      else {
        this.processItems(schema.form);
      }

      this.addMeta();
      this.processLinks();

      $rootScope.$on('schemaFormPropagateScope', this.onFieldScope.bind(this));
      $rootScope.$on('cnFlexFormReprocessField', this.onReprocessField.bind(this));

      return this;
    }

    function onFieldScope(event, scope) {
      let key = cnFlexFormService.getKey(scope.form.key);

      if(!key.startsWith('__')) {
        if (!this.fieldRegister[key]) this.fieldRegister[key] = {};
        const register = this.fieldRegister[key];
        register.ngModel = scope.ngModel;
        register.scope = scope;

        if(!this.fieldRegister[key].field) this.fieldRegister[key].field = scope.form;
      }

      // prevent edit mode radiobuttons from setting form to dirty
      else if(scope.form.key[0] === '__batchConfig') {
        scope.ngModel.$pristine = false;
      }
    }

    function processItems(fields) {
      let i = fields.length - 1;
      while(i > -1) {
        const child = this.processField(fields[i]);
        if(child && child.batchConfig) {
          if(child.type !== 'fieldset') {
            child.htmlClass = (child.htmlClass || '') + ' cn-batch-field clearfix';
          }
          let batchField = this.createBatchField(child);
          let dirtyCheck = child.key && this.createDirtyCheck(child);
          // add mode buttons after field
          fields[i] = {
            type: 'section',
            htmlClass: 'cn-batch-wrapper',
            items: dirtyCheck ? [child, dirtyCheck, batchField] : [child, batchField],
            condition: this.processCondition(child.condition)
          };
          delete child.condition;
          if(child.key) {
            if (!this.fieldRegister[child.key]) this.fieldRegister[child.key] = {};
            this.fieldRegister[child.key].field = child;
            this.fieldRegister[child.key].dirtyCheck = dirtyCheck;
          }
        }
        if(!child) {
          // remove field if batch isn't supported by it or children
          fields.splice(i, 1);
        }
        --i;
      }
    }

    function processCondition(condition) {
      return condition && condition.replace(/\b(model)\.(\S*)\b/g, '($1.$2 === undefined ? $1.__ogValues["$2"] : $1.$2)');
    }

    function processField(field) {
      if(field.key) {
        if(!field.batchConfig) return false;

        field._key = field.key;
        field._placeholder = field.placeholder;
        field.schema = field.schema || cnFlexFormService.getSchema(field.key, this.schema.schema.properties);
        field.type = field.type || field.schema.type;

        delete field.required;
        if(field.conditionals) delete field.conditionals.required;

        let fieldType = cnFlexFormTypes.getFieldType(field);
        let handler = fieldTypeHandlers[fieldType];

        if(handler) {
          if(_.isString(handler)) handler = this[handler];
          if(!_.isObject(field.batchConfig)) field.batchConfig = {};
          field.batchConfig.ogValues = this.getModelValues(field);

          if(_.allEqual(field.batchConfig.ogValues)) {
            let key = `__ogValues["${field.key}"]`;
            let first = _.first(field.batchConfig.ogValues);
            cnFlexFormService.parseExpression(key, this.model).set(first);
          }

          return handler.bind(this)(field);
        }
        else return false;
      }

      if (field.items) {
        if(field.batchConfig) {
          field.items.forEach(child => {
            child.batchConfig = _.clone(field.batchConfig);
          });
        }
        this.processItems(field.items);
        if(!field.items.length) return false;

        if(field.batchConfig) {
          if(!_.isObject(field.batchConfig)) field.batchConfig = {};
          field.batchConfig.key = `component_${_.uniqueId()}`;
          field.batchConfig.watch = [];

          field.items.forEach((item, i) => {
            let child = item.items[0];
            if(!i) {
              field.batchConfig.editModes = child.batchConfig.editModes;
              field.batchConfig.default = child.batchConfig.default;
            }
            field.batchConfig.watch.push({
              resolution: `model.__batchConfig["${child.key}"] = model.__batchConfig["${field.batchConfig.key}"]`
            });
            item.items[2].condition = 'false';
          });
        }
      }
      return field;
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
      let batchConfig = field.batchConfig;
      let key = `__batchConfig["${field.key || batchConfig.key}"]`;

      let batchField = {
        key,
        type: 'radiobuttons',
        titleMap: this.getTitleMap(batchConfig.editModes),
        htmlClass: 'cn-batch-options',
        btnClass: 'btn-sm cn-no-dirty-check',
        watch: batchConfig.watch || []
      };

      if(batchField.titleMap.length === 1) {
        batchField.condition = 'false';
      }

      this.addToSchema(key, {
        type: 'string',
        title: 'Edit Mode',
        default: this.getSchemaDefault(batchConfig.default)
      });

      if(batchConfig.onSelect) {
        batchField.watch.push({
          resolution: (val, prev) => {
            if(!val) return;
            batchConfig.onSelect[val](prev);
          }
        });
      }

      return batchField;
    }

    function setValidation(field, val) {
      let key = cnFlexFormService.getKey(field.key);

      if (field.schema && field.schema.type === 'array') {
        if (_.isUndefined(field.schema._minItems)) field.schema._minItems = field.schema.minItems;
        field.schema.minItems = val ? field.schema._minItems : 0;
      }

      let forms = key ? this.getFormFromRegister(key) : [];

      forms.forEach(form => {
        if(form.scope) {
          form.scope.options = {
            tv4Validation: val
          };
          Object.keys(form.ngModel.$error)
              .filter(function(k) {
                return k.indexOf('tv4-') === 0;
              })
              .forEach(function(k) {
                form.ngModel.$setValidity(k, true);
              });
        }
      });
      if (field.items) {
        field.items.forEach(i => this.setValidation(i, val));
      }
    }

    function getFormFromRegister(key) {
      if (key.includes('[]')) {
        let re = new RegExp(key.replace('[]', '\\[\\d*\\]'));
        return _.filter(this.fieldRegister, (form, k) => {
          return re.test(k);
        });
      } else if (this.fieldRegister[key]) {
        return [this.fieldRegister[key]];
      } else return [];
    }

    function createDirtyCheck(field) {
      //let path = sfPath.parse(field.key);
      let key = `__dirtyCheck["${field.key || field.batchConfig.key}"]`;
      //let child = path.length > 1;
      let htmlClass = '';

      //if(child) htmlClass += ' semi-transparent';
      if(field.notitle || !field.schema.title) htmlClass += ' notitle';

      let dirtyCheck = {
        key,
        htmlClass,
        type: 'cn-dirty-check',
        watch: [{
          resolution: (val) => {
            //$timeout(() => {
              this.setValidation(field, val);
              $rootScope.$broadcast('schemaFormValidate');
            //});
          }
        }]
      };

      this.addToSchema(key, {
        type: 'boolean',
        notitle: true
      });

      dirtyCheck.fieldWatch = {
        resolution: (val) => {
            const register = this.fieldRegister[field._key];
            if(register) {
              if(_.get(register, 'ngModel.$dirty')) {
                cnFlexFormService.parseExpression(key, this.model).set(true);
              }
            }
            // debug
            else {
              console.debug('no register:', field, this.fieldRegister);
            }
        }
      };

      this.registerFieldWatch(field, dirtyCheck.fieldWatch);

      return dirtyCheck;
    }

    function registerFieldWatch(field, watch) {
      if(field.watch) {
        if(!_.isArray(field.watch)) field.watch = [field.watch];
      }
      else {
        field.watch = [];
      }

      field.watch.push(watch);
    }

    function onReprocessField(e, key) {
      let register = this.fieldRegister[key];
      if(!register) return console.debug('no register:', key, this.fieldRegister);
      if(register.dirtyCheck) this.registerFieldWatch(register.field, register.dirtyCheck.fieldWatch);
    }

    function handleLinks(list, hard) {
      return val => {
        list.forEach(key => {
          if(!hard) {
            const register = this.fieldRegister[key];
            if(!_.get(register, 'ngModel.$dirty')) return;
          }
          cnFlexFormService.parseExpression(`__dirtyCheck["${key}"]`, this.model).set(val);
        });
      };
    }

    function processLinkList(list, hard) {
      list.forEach(keys => {
        keys.forEach(key => {
          let register = this.fieldRegister[key];
          if(!register) {
            console.debug('no register:', key);
            return;
          }
          let {field, dirtyCheck} = register;
          let handler = this.handleLinks(_.without(keys, key), hard);
          field.watch = field.watch || [];
          dirtyCheck.watch = dirtyCheck.watch || [];
          field.watch.push({resolution() {handler(true);}});
          dirtyCheck.watch.push({resolution: handler});
        });
      });
    }

    function processLinks() {
      if(this.schema.batchConfig) {
        if(this.schema.batchConfig.links) {
          this.processLinkList(this.schema.batchConfig.links);
        }
        if(this.schema.batchConfig.hardLinks) {
          this.processLinkList(this.schema.batchConfig.hardLinks, true);
        }
      }
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

        if(!dirty) return;

        let mode = cnFlexFormService
            .parseExpression(`__batchConfig["${key}"]`, this.model)
            .get();

        this.models.forEach((model, i) => {
          models[i] = models[i] || {};

          let path = sfPath.parse(key);
          // if column is json, we want to merge updates into model's current json value
          // so we copy the current value if we haven't already (on a previous iteration)
          if(path.length > 1 && !models[i][path[0]]) {
            models[i][path[0]] = this.models[i][path[0]];
          }

          let assignable = cnFlexFormService
              .parseExpression(key, this.models[i])
              .getAssignable();

          // if column is json and model's current value doesn't have parent property for
          // key we're updating, just copy over entire key instead of using specific
          // edit mode logic for new value
          if(assignable.fullPath !== key) {
            let val = cnFlexFormService
                .parseExpression(assignable.fullPath, this.model)
                .get();

            cnFlexFormService
                .parseExpression(assignable.fullPath, this.models[i])
                .set(val);
          }
          else {
            let val = cnFlexFormService.parseExpression(key, this.model).get();
            let update = cnFlexFormService.parseExpression(key, models[i]);
            let original = cnFlexFormService.parseExpression(key, this.models[i]);

            this.setValue(val, update, original, mode);
          }
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
        if (_.isArray(originalVal)) {
          const uniqVal = _([])
            .concat(originalVal, val)
            .uniq((value) => value.key || value)
            .value();

          update.set(uniqVal);
        }
        else if(_.isString(originalVal)) {
          update.set(`${originalVal} ${val.trim()}`);
        }
        else {
          update.set(val);
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
        else {
          update.set(val);
        }
      }
      else if(mode === 'increase') {
        update.set(_.add(original.get() || 0, val));
      }
      else if(mode === 'decrease') {
        update.set(_.subtract(original.get() || 0, val));
      }
      else if(mode === 'stringReplace' && original.get()) {
        let key = original.path().key;
        let replaceString = cnFlexFormService.parseExpression(`_replace_${key}`, this.model);
        let withString = cnFlexFormService.parseExpression(`_with_${key}`, this.model);
        let expression = new RegExp(_.escapeRegExp(replaceString.get()), "gi");
        update.set(original.get().replace(expression, withString.get()));
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

    function setPlaceholder(field, val) {
      if(!field.noBatchPlaceholder) {
        field._placeholder = val;
      }
    }

    function processDefault(field) {
      let config = field.batchConfig;

      config.editModes = config.editModes || ['replace', 'prepend', 'append', 'stringReplace'];

      config.default = config.default || 'append';

      if(!config.editModes.includes(config.default)) {
        config.default = config.editModes[0];
      }

      config.onSelect = {
        replace: () => {
          if(_.allEqual(config.ogValues)) {
            cnFlexFormService.parseExpression(field.key, this.model).set(_.first(config.ogValues), { silent: true });
          }
          else {
            setPlaceholder(field, '—');
          }
        },
        append: () => {
          setPlaceholder(field, '');
        },
        prepend: () => {
          setPlaceholder(field, '');
        },
        stringReplace: () => {
        }
      };

      if(config.editModes.includes('stringReplace')) {
        const dirtyCheck = this.createDirtyCheck(field);
        let configKey = `__batchConfig["${field.key || field.batchConfig.key}"]`;
        let replaceKey = `_replace_${field.key || field.batchConfig.key}`;
        let withKey = `_with_${field.key || field.batchConfig.key}`;
        let stringReplaceField = {
          type: 'component',
          items: [
          {
            key: replaceKey,
            title: 'Replace',
            watch: {
              resolution: `model.${dirtyCheck.key} = true`
            }
          }, {
            key: withKey,
            title: 'With',
            watch: {
              resolution: `model.${dirtyCheck.key} = true`
            }
          }],
          condition: `model.${configKey} === 'stringReplace'`
        };

        config.key = field.key;

        this.addToSchema(replaceKey, { type: 'string' });
        this.addToSchema(withKey, { type: 'string' });


        return {
          type: 'section',
          condition: field.condition,
          batchConfig: config,
          schema: field.schema,
          items: [_.extend(field, {condition: `model.${configKey} !== 'stringReplace'`}), stringReplaceField, dirtyCheck]
        };
      }

      return field;
    }

    function processNumber(field) {
      let config = field.batchConfig;

      config.editModes = config.editModes || ['replace', 'decrease', 'increase'];

      if(_.allEqual(config.ogValues)) {
        cnFlexFormService.parseExpression(field.key, this.model).set(_.first(config.ogValues), { silent: true });
      }
      else {
        field.placeholder = '—';
      }
      return field;
    }

    function setNestedPlaceholder(field) {
      if (field.items) {
        field.items.forEach(setNestedPlaceholder);
      } else {
        setPlaceholder(field, '—');
      }
    }

    function processSelect(field) {
      let type = field.schema.type;
      let config = field.batchConfig;

      if(type === 'array') {
        config.editModes = config.editModes || ['replace', 'append'];

        config.default = config.default || 'replace';

        if (_.allEqual(config.ogValues)) {
          // fucking angular infdigs
          $timeout(() =>
            cnFlexFormService.parseExpression(field.key, this.model).set(_.first(angular.copy(config.ogValues)), { silent: true })
          );
        } else {
          setNestedPlaceholder(field);
        }

        config.onSelect = {
          replace: (prev) => {
            if(prev && prev !== 'append') {
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
            cnFlexFormService.parseExpression(field.key, this.model).set(val, { silent: true });
          }
        };
      }
      else {

        let first = _.first(config.ogValues);
        //TODO: dynamically send back data
        if(first && _.allEqual(config.ogValues)) {
          cnFlexFormService.parseExpression(field.key, this.model).set(first, { silent: true });
        }

        if(!field.placeholder) {
          setPlaceholder(field, '—');
        }
      }
      return field;
    }

    function processDate(field) {
      let config = field.batchConfig;

      if(_.allEqual(config.ogValues)) {
        cnFlexFormService.parseExpression(field.key, this.model).set(_.first(config.ogValues, { silent: true }));
      }
      else {
        setPlaceholder(field, '—');
      }
      return field;
    }

    function processToggle(field) {
      let config = field.batchConfig;

      if(_.allEqual(config.ogValues)) {
        cnFlexFormService.parseExpression(field.key, this.model).set(_.first(config.ogValues, { silent: true }));
      }
      return field;
    }

    function processSchema() {
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

      $rootScope.$on('schemaFormBeforeAppendToArray', (e, form) => this.restoreDefaults(form));
      $rootScope.$on('schemaFormAfterAppendToArray', (e, form) => this.resetDefaults(form));
    }

    function restoreDefaults(form) {
      if(!form.items) return;
      form.items.forEach(item => {
        if(item.key) {
          if(item.schema) {
            let key = cnFlexFormService.getKey(item.key).replace(/\[\d+]/g, '[]');
            item.schema.default = this.defaults[key];
          }
          item.placeholder = item._placeholder;
          item.noBatchPlaceholder = true;
        }
        this.restoreDefaults(item);
      });
    }

    function resetDefaults(form) {
      if(!form.items) return;
      form.items.forEach(item => {
        if(item.schema) {
          item.schema.default = undefined;
        }
        this.resetDefaults(item);
      });
    }

    function clearSchemaDefault(schema, key) {
      // save for hydrating newly added array items
      this.defaults[key] = schema.default;

      // then remove because we don't want to override saved values with defaults
      schema.default = undefined;

      if(schema.type === 'object' && schema.properties) {
        schema.required = undefined;
        // _.each(schema.properties, this.clearSchemaDefault.bind(this));
        for(let k in schema.properties) {
          this.clearSchemaDefault(schema.properties[k], `${key}.${k}`);
        }
      }
      else if(schema.type === 'array' && schema.items) {
        this.clearSchemaDefault(schema.items, `${key}[]`);
      }
    }

    function showResults(results, config) {
      this.results = results;
      this.resultsConfig = config;

      if(this.modal) {
        this.modal.close();
      }

      this.modal = cnModal.open({
        controller: 'BatchResults',
        controllerAs: 'vm',
        templateUrl: 'cn-batch-forms/batch-results.html',
        resolve: {
          parent: () => this
        }
      });
    }

    function closeModal() {
      this.modal.close();
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
