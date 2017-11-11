import BatchResults from './batch-results';
import { cnBatchFormsConfig, addDirtyCheckTpl } from './cn-batch-forms.routes';
import cnBatchFormsProvider from './cn-batch-forms.service';
import addBatchResultsTpl from './batch-results.tpl';

angular
  .module('cn.batch-forms', [
    'schemaForm',
    'cn.flex-form',
    'cn.util',
    'ui.router'
  ])
  .controller('BatchResults', BatchResults)
  .provider('cnBatchForms', cnBatchFormsProvider)
  .config(cnBatchFormsConfig)
  .run(addDirtyCheckTpl)
  .run(addBatchResultsTpl);
