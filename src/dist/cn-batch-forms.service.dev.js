"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearSchemaDefault = clearSchemaDefault;
exports.processDiff = processDiff;
exports.processSchemaDiff = processSchemaDiff;
exports.processFormDiff = processFormDiff;
exports.setValue = setValue;
exports.processCondition = processCondition;
exports["default"] = cnBatchFormsProvider;

// Needed for test bundle
var _ = typeof window !== 'undefined' && window._ || require('lodash');

var fieldTypeHandlers = {
  'string': 'processDefault',
  'number': 'processNumber',
  'url': 'processDefault',
  'array': 'processSelect',
  'cn-autocomplete': 'processSelect',
  'cn-currency': 'processNumber',
  'cn-datetimepicker': 'processDate',
  'cn-toggle': 'processToggle'
};

function clearSchemaDefault(service, schema, key) {
  // save for hydrating newly added array items
  service.defaults[key] = schema["default"]; // then remove because we don't want to override saved values with defaults

  if ("default" in schema) schema["default"] = undefined;

  if (schema.type === 'object' && schema.properties) {
    if ("required" in schema) schema.required = undefined; // _.each(schema.properties, service.clearSchemaDefault.bind(this));

    for (var k in schema.properties) {
      clearSchemaDefault(service, schema.properties[k], "".concat(key, ".").concat(k));
    }
  } else if (schema.type === 'array' && schema.items) {
    clearSchemaDefault(service, schema.items, "".concat(key, "[]"));
  }
}

function processDiff(service) {
  var schema = service.schema;
  return function (payload) {
    var updateSchema = payload.params.updateSchema;

    var links = _.filter(schema.batchConfig.links, function (ls) {
      return _.includes(ls, updateSchema);
    });

    var hardLinks = _.filter(schema.batchConfig.hardLinks, function (ls) {
      return _.includes(ls, updateSchema);
    }); // ;_;


    Object.assign(service.schema.schema.properties, payload.diff.schema);
    processSchemaDiff(service, service.schema.schema, _.flatten(links.concat(hardLinks)));
    processFormDiff(service, payload.diff.form);
  };
}

function processSchemaDiff(service, schema, links) {
  var key = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";

  if (_.has(schema, "default") && _.every(links, function (l) {
    return !_.startsWith(key, l);
  })) {
    clearSchemaDefault(service, schema, key);
  } else if (schema.type === 'object') {
    _.forEach(schema.properties, function (v, k) {
      var prefix = key ? "".concat(key, ".") : key;
      processSchemaDiff(service, v, links, "".concat(prefix).concat(k));
    });
  } else if (schema.type === 'array') {
    processSchemaDiff(service, schema.items, links, "".concat(key, "[]"));
  }
}

function processFormDiff(service, updates) {
  _.each(updates, function (update, key) {
    if (!update.batchConfig) return;
    var forms = service.getFormFromRegister(key);

    _.each(forms, function (_ref) {
      var wrapper = _ref.wrapper;

      if (wrapper && _.has(update, 'condition')) {
        wrapper.condition = processCondition(update.condition);
        delete update.condition;
      }
    });
  });
}

function setValue(ffService) {
  return function (val, update, original, mode, model) {
    if (mode === 'replace') {
      update.set(val);
    } else if (mode === 'append') {
      var originalVal = original.get();

      if (_.isArray(originalVal)) {
        var uniqVal = _([]).concat(originalVal, val).uniq(function (v) {
          return v.key || angular.toJson(v);
        }).value();

        update.set(uniqVal);
      } else if (_.isString(originalVal)) {
        var updateVal = val ? "".concat(originalVal, " ").concat(val.trim()) : originalVal;
        update.set(updateVal);
      } else {
        update.set(val);
      }
    } else if (mode === 'prepend') {
      var _originalVal = original.get();

      if (_.isArray(_originalVal)) {
        var _uniqVal = _([]).concat(val, _originalVal).uniq(function (v) {
          return v.key || angular.toJson(v);
        }).value();

        update.set(_uniqVal);
      } else if (_.isString(_originalVal)) {
        var _updateVal = val ? "".concat(val.trim(), " ").concat(_originalVal) : _originalVal;

        update.set(_updateVal);
      } else {
        update.set(val);
      }
    } else if (mode === 'increase') {
      update.set(_.add(original.get() || 0, val));
    } else if (mode === 'decrease') {
      update.set(_.subtract(original.get() || 0, val));
    } else if (mode === 'stringReplace' && original.get()) {
      var key = original.path().key;
      var replaceStr = ffService.parseExpression("__replace_".concat(key), model).get();
      var replaceExp = new RegExp(_.escapeRegExp(replaceStr), 'gi');
      var withStr = ffService.parseExpression("__with_".concat(key), model).get() || '';

      var _updateVal2 = replaceStr ? original.get().replace(replaceExp, withStr).trim() : original.get();

      update.set(_updateVal2);
    }
  };
}

function processCondition(condition) {
  if (!condition) return condition;
  console.log('processCondition');
  console.log(condition);
  console.log(condition.match(/(model)\.(\S*)\.([^.]+\([^)]*\))(.*)$/));
  var fnMatch = condition.match(/(model)\.(\S*)\.([^.]+\([^)]*\))(.*)$/);
  console.log(fnMatch); // (
  //   model.admin === undefined ?
  //   model.__ogValues["admin"].enable_special_ad_categories == false || !(model.admin.special_ad_categories.includes('HOUSING') 
  //   : model.admin.enable_special_ad_categories == false || !  (model.admin.special_ad_categories.includes('HOUSING')) || model.admin.special_ad_categories.includes('CREDIT') || model.admin.special_ad_categories.includes('EMPLOYMENT')
  // )

  return fnMatch ? "(".concat(fnMatch[1], ".").concat(fnMatch[2], " === undefined ?\n      ").concat(fnMatch[1], ".__ogValues[\"").concat(fnMatch[2], "\"].").concat(fnMatch[3], " :\n      ").concat(fnMatch[1], ".").concat(fnMatch[2], ".").concat(fnMatch[3], ")\n      ").concat(fnMatch[4]).trim().replace(/\s+/g, ' ') : condition.replace(/\b(model)\.(\S*)\b/g, '($1.$2 === undefined ? $1.__ogValues["$2"] : $1.$2)');
}

function cnBatchFormsProvider() {
  return {
    registerField: registerField,
    $get: cnBatchForms
  }; ///////////

  function registerField(fieldType) {
    if (fieldType.handler) {
      fieldTypeHandlers[fieldType.type] = fieldType.handler;
    }
  }
}

function cnBatchForms(cnFlexFormConfig, cnFlexFormService, cnFlexFormTypes, sfPath, $rootScope, $timeout, cnModal) {
  'ngInject';

  var instances = 0;
  return {
    augmentSchema: augmentSchema
  }; //////////

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
      closeModal: closeModal,
      createDirtyCheck: createDirtyCheck,
      createBatchField: createBatchField,
      getChangedModels: getChangedModels,
      getEditModeLegends: getEditModeLegends,
      getFormFromRegister: getFormFromRegister,
      getModelValues: getModelValues,
      getSchemaDefault: getSchemaDefault,
      getTitleMap: getTitleMap,
      handleLinks: handleLinks,
      onFieldScope: onFieldScope,
      onReprocessField: onReprocessField,
      processCondition: processCondition,
      processSchema: processSchema,
      processField: processField,
      processItems: processItems,
      processDate: processDate,
      processDefault: processDefault,
      processLinkList: processLinkList,
      processLinks: processLinks,
      processNumber: processNumber,
      processSelect: processSelect,
      processToggle: processToggle,
      registerFieldWatch: registerFieldWatch,
      resetDefaults: resetDefaults,
      restoreDefaults: restoreDefaults,
      setValidation: setValidation,
      setValue: setValue(cnFlexFormService),
      showResults: showResults
    }).constructor(schema, model, models);
  }

  function constructor(schema, model, models) {
    this.instance = instances; //cnFlexFormModalLoaderService.resolveMapping('results', this.instance, this);

    instances++;
    this.schema = schema;
    this.model = model;
    this.models = models;
    this.defaults = {};
    this.editModes = {};
    this.fieldRegister = {};
    this.processSchema();
    cnFlexFormConfig.onProcessDiff = processDiff(this);

    if (schema.forms) {
      var i = schema.forms.length - 1;

      while (i > -1) {
        this.processItems(schema.forms[i].form);

        if (!schema.forms[i].form.length) {
          schema.forms.splice(i, 1);
        }

        --i;
      }
    } else {
      this.processItems(schema.form);
    }

    this.addMeta();
    this.processLinks();
    $rootScope.$on('schemaFormPropagateScope', this.onFieldScope.bind(this));
    $rootScope.$on('cnFlexFormReprocessField', this.onReprocessField.bind(this));
    console.info('BatchDone:', schema, model, models);
    return this;
  }

  function onFieldScope(event, scope) {
    var key = cnFlexFormService.getKey(scope.form.key);

    if (!key.startsWith('__')) {
      if (!this.fieldRegister[key]) this.fieldRegister[key] = {};
      var register = this.fieldRegister[key];
      register.ngModel = scope.ngModel;
      register.scope = scope;
      if (!this.fieldRegister[key].field) this.fieldRegister[key].field = scope.form;
    } // prevent edit mode radiobuttons from setting form to dirty
    else if (scope.form.key[0] === '__batchConfig') {
        scope.ngModel.$pristine = false;
      }
  }

  function processItems(fields) {
    var i = fields.length - 1;

    while (i > -1) {
      var child = this.processField(fields[i]);

      if (child && child.batchConfig) {
        if (child.type !== 'fieldset') {
          child.htmlClass = (child.htmlClass || '') + ' cn-batch-field clearfix';
        }

        var batchField = this.createBatchField(child);
        var dirtyCheck = child.key && this.createDirtyCheck(child); // add mode buttons after field

        fields[i] = {
          type: 'section',
          htmlClass: 'cn-batch-wrapper',
          items: dirtyCheck ? [child, dirtyCheck, batchField] : [child, batchField],
          condition: this.processCondition(child.condition)
        };
        delete child.condition;

        if (child.key) {
          if (!this.fieldRegister[child.key]) this.fieldRegister[child.key] = {};
          this.fieldRegister[child.key].field = child;
          this.fieldRegister[child.key].dirtyCheck = dirtyCheck;
          this.fieldRegister[child.key].wrapper = fields[i];
        }
      }

      if (!child) {
        // remove field if batch isn't supported by it or children
        fields.splice(i, 1);
      }

      --i;
    }
  }

  function processField(field) {
    if (field.key) {
      if (!field.batchConfig) return false;
      field._key = field.key;
      field._placeholder = field.placeholder;
      field.schema = field.schema || cnFlexFormService.getSchema(field.key, this.schema.schema.properties);
      field.type = field.type || field.schema.type;
      delete field.required;
      if (field.resolve) delete field.resolve.required;
      if (field.conditionals) delete field.conditionals.required;
      var fieldType = cnFlexFormTypes.getFieldType(field);
      var handler = fieldTypeHandlers[fieldType];

      if (handler) {
        if (_.isString(handler)) handler = this[handler];
        if (!_.isObject(field.batchConfig)) field.batchConfig = {};
        field.batchConfig.ogValues = this.getModelValues(field);

        if (_.allEqual(field.batchConfig.ogValues)) {
          var key = "__ogValues[\"".concat(field.key, "\"]");

          var first = _.first(field.batchConfig.ogValues);

          cnFlexFormService.parseExpression(key, this.model).set(first);
        }

        if (field.items) {
          var externalFields = _(field.items).filter(function (x) {
            return x.key && !x.key.includes(field.key);
          }).map(function (x) {
            return _.assign(x, {
              parent: field.key,
              batchConfig: {
                "default": field.batchConfig["default"]
              }
            });
          }).value();

          _.forEach(externalFields, processField.bind(this));

          _.forEach(externalFields, createBatchField.bind(this));
        }

        return handler.bind(this)(field);
      } else return false;
    }

    if (field.items) {
      if (field.batchConfig) {
        field.items.forEach(function (child) {
          child.batchConfig = _.clone(field.batchConfig);
        });
      }

      this.processItems(field.items);
      if (!field.items.length) return false;

      if (field.batchConfig) {
        if (!_.isObject(field.batchConfig)) field.batchConfig = {};
        field.batchConfig.key = "component_".concat(_.uniqueId());
        field.batchConfig.watch = [];
        field.items.forEach(function (item, i) {
          var child = item.items[0];

          if (!i) {
            field.batchConfig.editModes = child.batchConfig.editModes;
            field.batchConfig["default"] = child.batchConfig["default"];
          }

          field.batchConfig.watch.push({
            resolution: "model.__batchConfig[\"".concat(child.key, "\"] = model.__batchConfig[\"").concat(field.batchConfig.key, "\"]")
          }); //item.items[2].condition = 'false';

          item.items[2].htmlClass = 'hide';
        });
      }
    }

    return field;
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
    var key = "__batchConfig[\"".concat(field.key || batchConfig.key, "\"]");
    var batchField = {
      key: key,
      type: 'radiobuttons',
      titleMap: this.getTitleMap(batchConfig.editModes),
      htmlClass: 'cn-batch-options',
      btnClass: 'btn-sm cn-no-dirty-check',
      watch: batchConfig.watch || []
    };

    if (batchField.titleMap.length === 1) {
      //batchField.condition = 'false';
      batchField.htmlClass = 'hide';
    }

    this.addToSchema(key, {
      type: 'string',
      title: 'Edit Mode',
      "default": this.getSchemaDefault(batchConfig["default"])
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

  function setValidation(field, val) {
    var _this2 = this;

    var key = cnFlexFormService.getKey(field.key);

    if (field.schema && field.schema.type === 'array') {
      if (_.isUndefined(field.schema._minItems)) field.schema._minItems = field.schema.minItems;
      field.schema.minItems = val ? field.schema._minItems : 0;
    }

    var forms = key ? this.getFormFromRegister(key) : [];
    forms.forEach(function (form) {
      if (form.scope) {
        form.scope.options = form.scope.options || {};
        form.scope.options.tv4Validation = val;
        Object.keys(form.ngModel.$error).filter(function (k) {
          return k.indexOf('tv4-') === 0;
        }).forEach(function (k) {
          form.ngModel.$setValidity(k, true);
        });
      }
    });

    if (field.items) {
      field.items.forEach(function (i) {
        return _this2.setValidation(i, val);
      });
    }
  }

  function getFormFromRegister(key) {
    if (key.includes('[]')) {
      var re = new RegExp(key.replace('[]', '\\[\\d*\\]'));
      return _.filter(this.fieldRegister, function (form, k) {
        return re.test(k);
      });
    } else if (this.fieldRegister[key]) {
      return [this.fieldRegister[key]];
    } else return [];
  }

  function createDirtyCheck(field) {
    var _this3 = this;

    //let path = sfPath.parse(field.key);
    var key = "__dirtyCheck[\"".concat(field.key || field.batchConfig.key, "\"]"); //let child = path.length > 1;

    var htmlClass = ''; //if(child) htmlClass += ' semi-transparent';

    if (field.notitle || !field.schema.title) htmlClass += ' notitle';
    var dirtyCheck = {
      key: key,
      htmlClass: htmlClass,
      type: 'cn-dirty-check',
      watch: [{
        resolution: function resolution(val) {
          //$timeout(() => {
          _this3.setValidation(field, val);

          $rootScope.$broadcast('schemaFormValidate'); //});
        }
      }]
    };
    this.addToSchema(key, {
      type: 'boolean',
      notitle: true
    });
    dirtyCheck.fieldWatch = {
      resolution: function resolution(val) {
        var register = _this3.fieldRegister[field._key];

        if (register) {
          if (_.get(register, 'ngModel.$dirty')) {
            cnFlexFormService.parseExpression(key, _this3.model).set(true);
          }
        } // debug
        else {
            console.debug('no register:', field, _this3.fieldRegister);
          }
      }
    };
    this.registerFieldWatch(field, dirtyCheck.fieldWatch);
    return dirtyCheck;
  }

  function registerFieldWatch(field, watch) {
    if (field.watch) {
      if (!_.isArray(field.watch)) field.watch = [field.watch];
    } else {
      field.watch = [];
    }

    field.watch.push(watch);
  }

  function onReprocessField(e, key) {
    var register = this.fieldRegister[key];
    if (!register) return console.debug('no register:', key, this.fieldRegister);
    if (register.dirtyCheck) this.registerFieldWatch(register.field, register.dirtyCheck.fieldWatch);
  }

  function handleLinks(list, hard) {
    var _this4 = this;

    return function (val) {
      list.forEach(function (key) {
        if (!hard) {
          var register = _this4.fieldRegister[key];
          if (!_.get(register, 'ngModel.$dirty')) return;
        }

        cnFlexFormService.parseExpression("__dirtyCheck[\"".concat(key, "\"]"), _this4.model).set(val);
      });
    };
  }

  function processLinkList(list, hard) {
    var _this5 = this;

    list.forEach(function (keys) {
      keys.forEach(function (key) {
        var register = _this5.fieldRegister[key];

        if (!register) {
          console.debug('no register:', key);
          return;
        }

        var field = register.field,
            dirtyCheck = register.dirtyCheck;

        var handler = _this5.handleLinks(_.without(keys, key), hard);

        field.watch = field.watch || [];
        dirtyCheck.watch = dirtyCheck.watch || [];
        field.watch.push({
          resolution: function resolution() {
            handler(true);
          }
        });
        dirtyCheck.watch.push({
          resolution: handler
        });
      });
    });
  }

  function processLinks() {
    if (this.schema.batchConfig) {
      if (this.schema.batchConfig.links) {
        this.processLinkList(this.schema.batchConfig.links);
      }

      if (this.schema.batchConfig.hardLinks) {
        this.processLinkList(this.schema.batchConfig.hardLinks, true);
      }
    }
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
    var _this6 = this;

    var models = [];

    _.each(this.fieldRegister, function (register, key) {
      var configKey = register.field.parent ? register.field.parent : key;
      var dirty = cnFlexFormService.parseExpression("__dirtyCheck[\"".concat(configKey, "\"]"), _this6.model).get();
      if (!dirty) return;
      var mode = cnFlexFormService.parseExpression("__batchConfig[\"".concat(configKey, "\"]"), _this6.model).get();

      _this6.models.forEach(function (model, i) {
        models[i] = models[i] || {};
        var path = sfPath.parse(key); // if column is json, we want to merge updates into model's current json value
        // so we copy the current value if we haven't already (on a previous iteration)

        if (path.length > 1 && !models[i][path[0]]) {
          models[i][path[0]] = _this6.models[i][path[0]];
        }

        var assignable = cnFlexFormService.parseExpression(key, _this6.models[i]).getAssignable(); // if column is json and model's current value doesn't have parent property for
        // key we're updating, just copy over entire key instead of using specific
        // edit mode logic for new value

        if (assignable.fullPath !== key) {
          var val = cnFlexFormService.parseExpression(assignable.fullPath, _this6.model).get();
          cnFlexFormService.parseExpression(assignable.fullPath, _this6.models[i]).set(val);
        } else {
          var _val = cnFlexFormService.parseExpression(key, _this6.model).get();

          var update = cnFlexFormService.parseExpression(key, models[i]);
          var original = cnFlexFormService.parseExpression(key, _this6.models[i]);

          _this6.setValue(_val, update, original, mode, _this6.model);
        }
      });
    });

    return models;
  }

  function setPlaceholder(field, val) {
    if (field.noBatchPlaceholder) return;
    field.placeholder = val;
  }

  function processDefault(field) {
    var _this7 = this;

    var config = field.batchConfig;
    config.editModes = config.editModes || ['replace', 'prepend', 'append', 'stringReplace'];
    config["default"] = config["default"] || 'append';

    if (!config.editModes.includes(config["default"])) {
      config["default"] = config.editModes[0];
    }

    config.onSelect = {
      replace: function replace() {
        if (_.allEqual(config.ogValues)) {
          cnFlexFormService.parseExpression(field.key, _this7.model).set(_.first(config.ogValues), {
            silent: true
          });
        } else {
          setPlaceholder(field, '—');
        }
      },
      append: function append() {
        setPlaceholder(field, '');
      },
      prepend: function prepend() {
        setPlaceholder(field, '');
      },
      stringReplace: function stringReplace() {}
    };

    if (config.editModes.includes(config["default"])) {
      config.onSelect[config["default"]]();
    }

    if (config.editModes.includes('stringReplace')) {
      var dirtyCheck = this.createDirtyCheck(field);
      var configKey = "__batchConfig[\"".concat(field.key || field.batchConfig.key, "\"]");
      var replaceKey = "__replace_".concat(field.key || field.batchConfig.key);
      var withKey = "__with_".concat(field.key || field.batchConfig.key);
      var stringReplaceField = {
        type: 'component',
        items: [{
          key: replaceKey,
          title: 'Replace',
          watch: {
            resolution: "model.".concat(dirtyCheck.key, " = true")
          }
        }, {
          key: withKey,
          title: 'With',
          watch: {
            resolution: "model.".concat(dirtyCheck.key, " = true")
          }
        }],
        condition: "model.".concat(configKey, " === 'stringReplace'")
      };
      config.key = field.key;
      this.addToSchema(replaceKey, {
        type: 'string'
      });
      this.addToSchema(withKey, {
        type: 'string'
      });
      return {
        type: 'section',
        condition: field.condition,
        batchConfig: config,
        schema: field.schema,
        items: [_.extend(field, {
          condition: "model.".concat(configKey, " !== 'stringReplace'")
        }), stringReplaceField, dirtyCheck]
      };
    }

    return field;
  }

  function processNumber(field) {
    var config = field.batchConfig;
    config.editModes = config.editModes || ['replace', 'decrease', 'increase'];

    if (_.allEqual(config.ogValues)) {
      cnFlexFormService.parseExpression(field.key, this.model).set(_.first(config.ogValues), {
        silent: true
      });
    } else {
      field.placeholder = '—';
    }

    return field;
  }

  function setNestedPlaceholder(field) {
    if (field.items) {//field.items.forEach(setNestedPlaceholder);
    } else {
      setPlaceholder(field, '—');
    }
  }

  function processSelect(field) {
    var _this8 = this;

    var type = field.schema.type;
    var config = field.batchConfig;

    if (type === 'array') {
      config.editModes = config.editModes || ['replace', 'append'];
      config["default"] = config["default"] || 'replace';

      if (_.allEqual(config.ogValues)) {
        // fucking angular infdigs
        $timeout(function () {
          return cnFlexFormService.parseExpression(field.key, _this8.model).set(_.first(angular.copy(config.ogValues)), {
            silent: true
          });
        });
      } else {
        setNestedPlaceholder(field);
      }

      config.onSelect = {
        replace: function replace(prev) {
          if (prev && prev !== 'append') {
            cnFlexFormService.parseExpression(field.key, _this8.model).set([]);
          }
        },
        append: function append(prev) {
          if (prev !== 'replace') {
            cnFlexFormService.parseExpression(field.key, _this8.model).set([]);
          }
        },
        remove: function remove() {
          var val = _.chain(field.batchConfig.ogValues).flatten().uniq().value();

          cnFlexFormService.parseExpression(field.key, _this8.model).set(val, {
            silent: true
          });
        }
      };
    } else {
      var first = _.first(config.ogValues); //TODO: dynamically send back data


      if (first && _.allEqual(config.ogValues)) {
        cnFlexFormService.parseExpression(field.key, this.model).set(first, {
          silent: true
        });
      }

      if (!field.placeholder) {
        setPlaceholder(field, '—');
      }
    }

    return field;
  }

  function processDate(field) {
    var config = field.batchConfig;

    if (_.allEqual(config.ogValues)) {
      cnFlexFormService.parseExpression(field.key, this.model).set(_.first(config.ogValues, {
        silent: true
      }));
    } else {
      setPlaceholder(field, '—');
    }

    return field;
  }

  function processToggle(field) {
    var config = field.batchConfig;

    if (_.allEqual(config.ogValues)) {
      cnFlexFormService.parseExpression(field.key, this.model).set(_.first(config.ogValues, {
        silent: true
      }));
    }

    return field;
  }

  function processSchema() {
    var _this9 = this;

    this.schema.schema.required = undefined;

    _.each(this.schema.schema.properties, function (val, key) {
      return clearSchemaDefault(_this9, val, key);
    });

    this.schema.schema.properties.__batchConfig = {
      type: 'object',
      properties: {}
    };
    this.schema.schema.properties.__dirtyCheck = {
      type: 'object',
      properties: {}
    };
    $rootScope.$on('schemaFormBeforeAppendToArray', function (e, form) {
      return _this9.restoreDefaults(form);
    });
    $rootScope.$on('schemaFormAfterAppendToArray', function (e, form) {
      return _this9.resetDefaults(form);
    });
  }

  function restoreDefaults(form) {
    var _this10 = this;

    if (!form.items) return;
    form.items.forEach(function (item) {
      if (item.key) {
        if (item.schema) {
          var key = cnFlexFormService.getKey(item.key).replace(/\[\d+]/g, '[]');
          item.schema["default"] = _this10.defaults[key];
        }
      }

      _this10.restoreDefaults(item);
    });
    setNoPlaceholder(form.items);
  }

  function setNoPlaceholder(items) {
    _.each(items, function (item) {
      item.placeholder = item._placeholder;
      item.noBatchPlaceholder = true;
      if (item.items) setNoPlaceholder(item.items);
    });
  }

  function resetDefaults(form) {
    var _this11 = this;

    if (!form.items) return;
    form.items.forEach(function (item) {
      if (item.schema) {
        item.schema["default"] = undefined;
      }

      _this11.resetDefaults(item);
    });
  }

  function showResults(results, config) {
    var _this12 = this;

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
          return _this12;
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
    this.schema.meta = "\n        <div class=\"well\">\n          <h5>Edit Modes</h5>\n          <p>Some types of fields allow you to apply batch changes in\n          different ways:</p>\n          <dl>\n            <dt>Replace:</dt>\n            <dd>Replace all the original values\n            with the new value. <em>(If you don't see an <b>Edit Mode</b> option\n            for a field, this will be the default)</em></dd>\n          </dl>\n          ".concat(this.getEditModeLegends(), "\n        </div>");
  }

  function getEditModeLegends() {
    var legends = '';

    if (this.editModes.prepend) {
      legends += "\n          <dl>\n            <dt>Prepend:</dt>\n            <dd>Add the new value to the start of the original\n            values for each item.</dd>\n          </dl>";
    }

    if (this.editModes.append) {
      legends += "\n          <dl>\n            <dt>Append:</dt>\n            <dd>Affix the new value at the end of the original\n            values for each item.</dd>\n          </dl>";
    }

    if (this.editModes.decrease) {
      legends += "\n          <dl>\n            <dt>Decrease:</dt>\n            <dd>Subtract the given value from the original\n            values for each item.</dd>\n          </dl>";
    }

    if (this.editModes.increase) {
      legends += "\n          <dl>\n            <dt>Increase:</dt>\n            <dd>Add the given value to the original\n            values for each item.</dd>\n          </dl>";
    }

    return legends;
  }
}