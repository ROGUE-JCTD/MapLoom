(function() {
  var module = angular.module('loom_notification_poster_directive', []);

  module.directive('loomNotificationPoster',
      function($rootScope, notificationService, diffService) {
        return{
          restrict: 'C',
          replace: true,
          template: '<div class="panel flat">' +
              '  <div class="btn-group">' +
              '    <button type="button" ng-click="addNotification()"' +
              '      class="btn btn-default">Post Notification</button>' +
              '    <button type="button" ng-click="performDiff()"' +
              '      class="btn btn-default">Perform Diff</button>' +
              '    <button type="button" ng-click="clearDiff()"' +
              '      class="btn btn-default">Clear Diff</button>' +
              '  </div>' +
              '</div>',
          // The linking function will add behavior to the template
          link: function(scope) { //Unused: element, attrs
            function addNotification() {
              notificationService.addNotification({
                text: '1 Added, 3 Modified, 1 Deleted',
                read: false,
                type: 'loom-update-notification',
                repos: [
                  {
                    name: 'geogit_repo',
                    layers: [
                      {
                        name: 'layer1',
                        adds: [],
                        modifies: ['feature3'],
                        deletes: ['feature5']
                      },
                      {
                        name: 'layer2',
                        adds: ['feature6'],
                        modifies: ['feature2', 'feature4'],
                        deletes: []
                      }
                    ]
                  }
                ],
                callback: function(feature) {
                  alert(feature.feature + ' was clicked!');
                }
              });
            }

            scope.addNotification = addNotification;

            function performDiff() {
              diffService.performDiff('repo', 'from', 'to');
            }

            scope.performDiff = performDiff;

            function clearDiff() {
              diffService.clearDiff();
            }

            scope.clearDiff = clearDiff;
          }
        };
      });
}());
