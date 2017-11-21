export default function addBatchResultsTmpl($templateCache) {
  'ngInject';
  $templateCache.put(
    'cn-batch-forms/batch-results.html',
    `
    <div class="cn-modal">
      <div class="modal-header clearfix">
        <cn-flex-form-header
          ff-header-config="vm.headerConfig"
          ff-submit="vm.submit(handler)">
        </cn-flex-form-header>
      </div>
      <div class="modal-body cn-list card-flex"
           cn-responsive-height="80"
           cn-responsive-break="sm"
           cn-set-max-height>

        <div class="padding-20"
             ng-if="vm.text">
          <p class="no-margin text-mute"
             ng-bind-html="vm.text">
          </p>
        </div>

        <table class="table gutterless">
          <tbody>
          <tr ng-repeat="result in vm.results">
            <td class="col-sm-10">
              <h6 ng-show="result.status == 200">
                {{result.body[vm.displayName]}}
                <span class="text-mute">({{result.body.id}})</span>
              </h6>
              <h6 ng-show="result.status != 200">
                {{vm.originals[$index][vm.displayName]}}
                <span class="text-mute">({{vm.originals[$index].id}})</span>
              </h6>
              <p ng-class="{
                   'text-danger': result.status != 200,
                   'text-primary': result.status == 200
                 }">
                <i class="fa fa-{{result.status == 200 ? 'check' : 'times'}}"></i>
                {{result.status == 200 ? 'updated successfully' : result.body.message}}
              </p>
            </td>
            <td class="col-sm-2 text-center">
              <a class="btn btn-sm btn-transparent"
                 ng-show="vm.showEdit(result)"
                 ui-sref="{{ result.editSref }}">
                <i class="icn-edit"></i>
              </a>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
    `
  );
}
