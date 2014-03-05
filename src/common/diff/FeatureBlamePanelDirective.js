(function() {

  var module = angular.module('loom_feature_blame_panel_directive', []);

  module.directive('loomFeatureBlamePanel',
      function($rootScope, mapService, $timeout, featureBlameService) {
        return {
          restrict: 'C',
          scope: {
            panel: '=',
            title: '=panelTitle'
          },
          templateUrl: 'diff/partial/featureblamepanel.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapid = attrs.mapid;

            var target = 'preview-map-' + scope.mapid;
            var loadingtarget = '#loading-' + scope.mapid;

            function updateVariables() {
              $timeout(function() {
                scope.panel.map.setTarget(target);
                mapService.zoomToExtent(scope.panel.bounds, false, scope.panel.map);
                $timeout(function() {
                  $(loadingtarget).fadeOut();
                }, 500);
              }, 500);
            }

            scope.computeAuthorString = function(name) {
              if (goog.isDefAndNotNull(scope.panel)) {
                if (!goog.isDefAndNotNull(name) && goog.isDefAndNotNull(scope.panel.geometry)) {
                  name = scope.panel.geometry.attributename;
                }
                var attrs = featureBlameService.attributes;
                var returnString = '';
                if (goog.isDefAndNotNull(attrs)) {
                  forEachArrayish(attrs, function(attribute) {
                    if (attribute.name === name) {
                      returnString += attribute.commit.author.name + ' - ';
                      var date = moment(new Date(attribute.commit.author.timestamp));
                      returnString += date.format('L') + ' ' + date.format('LT');
                      returnString += ' (' + attribute.commit.id.substr(0, 8) + '...)';
                    }
                  });
                }
                return returnString;
              }
              return null;
            };

            //scope.$on('blame-performed', updateVariables);
          }
        };
      }
  );
})();
