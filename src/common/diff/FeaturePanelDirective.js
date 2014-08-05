(function() {

  var module = angular.module('loom_feature_panel_directive', []);

  module.directive('loomFeaturePanel',
      function($rootScope, $translate, mapService, $timeout, featureDiffService, featureBlameService) {
        return {
          restrict: 'C',
          scope: {
            panel: '=',
            title: '=panelTitle'
          },
          templateUrl: 'diff/partial/featurepanel.tpl.html',
          link: function(scope, element, attrs) {
            scope.mapid = attrs.mapid;
            scope.authorsShown = false;

            var target = 'preview-map-' + scope.mapid;
            var loadingtarget = '#loading-' + scope.mapid;
            function updateVariables() {
              scope.authorsShown = false;
              scope.isMergePanel = scope.panel === featureDiffService.merged;
              scope.isConflictPanel = scope.isMergePanel && featureDiffService.change !== 'MERGED';

              if (scope.isMergePanel) {
                scope.$watch('panel.attributes', function() {
                  for (var i = 0; i < scope.panel.attributes.length; i++) {
                    featureDiffService.updateChangeType(scope.panel.attributes[i]);
                  }
                  $rootScope.$broadcast('merge-feature-modified');
                }, true);
              }

              $timeout(function() {
                scope.panel.map.setTarget(target);
                mapService.zoomToExtent(featureDiffService.combinedExtent, false, scope.panel.map, 0.1);
                $timeout(function() {
                  $(loadingtarget).fadeOut();
                }, 500);
              }, 500);
            }

            scope.translate = function(value) {
              return $translate.instant(value);
            };

            scope.computeAuthorString = function(attribute) {
              if (scope.isConflictPanel) {
                return '---------------------';
              }
              if (goog.isDefAndNotNull(attribute) && goog.isDefAndNotNull(attribute.commit)) {
                var returnString = '';
                returnString += attribute.commit.author.name + ' - ';
                var date = new Date(attribute.commit.author.timestamp);
                returnString += date.toLocaleDateString() + ' @ ' + date.toLocaleTimeString();
                return returnString;
              }
              return '';
            };

            scope.selectValue = function(property, index) {
              if (index === null) {
                property.newvalue = null;
              } else {
                property.newvalue = property.enum[index]._value;
              }
              scope.validateField(property, 'newvalue');
            };

            scope.selectBooleanValue = function(property, index) {
              property.newvalue = property.enum[index]._value === 'true';
              scope.validateField(property, 'newvalue');
            };

            scope.validateInteger = function(property, key) {
              property.valid = validateInteger(property[key]);
            };

            scope.validateDouble = function(property, key) {
              property.valid = validateDouble(property[key]);
            };

            scope.validateField = function(property, key) {
              property.valid = true;
              switch (property.type) {
                case 'xsd:int':
                  property.valid = validateInteger(property[key]);
                  break;
                case 'xsd:integer':
                  property.valid = validateInteger(property[key]);
                  break;
                case 'xsd:double':
                  property.valid = validateDouble(property[key]);
                  break;
                case 'xsd:decimal':
                  property.valid = validateDouble(property[key]);
                  break;
              }

              if (featureDiffService.schema[property.attributename]._nillable === 'false' &&
                  (property[key] === '' || property[key] === null)) {
                property.valid = false;
              }
            };

            scope.$on('feature-diff-performed', updateVariables);
            scope.$on('show-authors', function() {
              scope.authorsShown = true;
            });

            scope.$on('hide-authors', function() {
              scope.authorsShown = false;
            });
          }
        };
      }
  );
})();
