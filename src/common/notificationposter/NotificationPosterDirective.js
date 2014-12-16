(function() {
  var module = angular.module('loom_notification_poster_directive', []);

  module.directive('loomNotificationPoster',
      function($rootScope, notificationService, diffService, mapService, dialogService, $timeout, pulldownService,
          $translate, refreshService, testService, debugService) {
        return{
          restrict: 'C',
          replace: true,
          scope: true,
          template: '<div class="panel flat">' +
              '  <div class="btn-group" ng-show="debugService.showDebugButtons">' +
              '    <button type="button" ng-click="switchCoords()"' +
              '      class="btn btn-default">Switch Coords</button>' +
              '    <button type="button" ng-click="addNotification()"' +
              '      class="btn btn-default">Post Notification</button>' +
              '    <button type="button" ng-click="performDiff()"' +
              '      class="btn btn-default">Perform Diff</button>' +
              '    <button type="button" ng-click="clearDiff()"' +
              '      class="btn btn-default">Clear Diff</button>' +
              '    <button type="button" ng-click="mapService.activateDragZoom()"' +
              '      class="btn btn-default">Drag Zoom</button>' +
              '    <button type="button" ng-click="addModal()"' +
              '      class="btn btn-default">Modal</button>' +
              '    <button type="button" ng-click="localize()"' +
              '      class="btn btn-default">Switch Language</button>' +
              '    <button type="button" ng-click="refreshService.refreshLayers()"' +
              '      class="btn btn-default">Refresh Layers</button>' +
              '    <button type="button" ng-click="testStart()"' +
              '      class="btn btn-default">Start Test</button>' +
              '    <button type="button" ng-click="testStop()"' +
              '      class="btn btn-default">Stop Test</button>' +
              '  </div>' +
              '</div>',
          // The linking function will add behavior to the template
          link: function(scope) { //Unused: element, attrs
            scope.mapService = mapService;
            scope.refreshService = refreshService;
            scope.debugService = debugService;

            function addNotification() {
              notificationService.addNotification({
                text: '1 Added, 3 Modified, 1 Deleted',
                read: false,
                type: 'loom-update-notification',
                repos: [
                  {
                    name: 'geogig_repo',
                    features: [
                      {change: 'MODIFIED', geometry: 'blah', id: 'layer1/feature3'},
                      {change: 'REMOVED', geometry: 'blah', id: 'layer1/feature5'},
                      {change: 'MODIFIED', geometry: 'blah', id: 'layer2/feature2'},
                      {change: 'MODIFIED', geometry: 'blah', id: 'layer2/feature4'},
                      {change: 'ADDED', geometry: 'blah', id: 'layer2/feature6'}
                    ]
                  }
                ],
                callback: function(feature) {
                  console.log(feature.feature + ' was clicked!');
                }
              });
            }

            scope.testStart = function() {
              testService.start();
            };
            scope.testStop = function() {
              testService.stop();
            };

            scope.addNotification = addNotification;

            function performDiff() {
              diffService.setTitle('Merge Results');
              diffService.performDiff('repo', 'from', 'to');
              pulldownService.conflictsMode();
            }

            scope.performDiff = performDiff;

            function clearDiff() {
              diffService.clearDiff();
              pulldownService.defaultMode();
            }

            scope.clearDiff = clearDiff;

            scope.switchCoords = function() {
              if (settings.coordinateDisplay === coordinateDisplays.DD) {
                settings.coordinateDisplay = coordinateDisplays.DMS;
              } else {
                settings.coordinateDisplay = coordinateDisplays.DD;
              }
              mapService.switchMousePosCoordFormat();
            };

            scope.addModal = function() {
              // The dialog service works through promises, the promise will tell you what button
              // was pushed.
              dialogService.open('My Title', 'This is the message of the dialog.',
                  [$translate.instant('btn_ok'), 'Cancel'], false).then(function(button) {
                switch (button) {
                  case 0:
                    console.log('OK was clicked!');
                    break;
                  case 1:
                    console.log('Cancel was clicked!');
                    break;
                }
              });

              $timeout(function() {
                // Don't do this, it makes it unclosable! (no buttons and no close button)
                dialogService.warn('WARNING', 'This is a warning message.', null, false);
              },2000);

              $timeout(function() {
                dialogService.error('ERROR', 'This is an error message.');
              }, 4000);
            };

            var activeLang = 'en';
            scope.localize = function() {
              if (activeLang === 'en') {
                $translate.use('es');
                activeLang = 'es';
              } else {
                $translate.use('en');
                activeLang = 'en';
              }
              $rootScope.$broadcast('translation_change', activeLang);
            };
          }
        };
      });
}());
