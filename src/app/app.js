angular.module('ngBoilerplate', [
  'templates-app',
  'templates-common',
  'loom',
  'ui.bootstrap',
  'ui.router'
])

.run(function run() {
})

.controller('AppCtrl', function AppCtrl($scope, $location) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
    if (angular.isDefined(toState.data.pageTitle)) {
      $scope.pageTitle = toState.data.pageTitle + ' | ngBoilerplate';
    }
  });
});

