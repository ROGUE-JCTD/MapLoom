(function() {
  var module = angular.module('loom_utils', []);

  module.directive('stopEvent', function() {
    return {
      link: function(scope, element, attr) {
        var events = attr.stopEvent.split(' ');
        var stopFunction = function(e) {
          e.stopPropagation();
        };
        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          element.bind(event, stopFunction);
        }
      }
    };
  });

  module.directive('autotextarea', function() {
    return {
      restrict: 'E',
      template: '<textarea rows="1" style="height:34px;"></textarea>',
      replace: true,
      scope: true,
      link: function(scope, element) {
        var observe;
        if (window.attachEvent) {
          observe = function(element, event, handler) {
            element.attachEvent('on' + event, handler);
          };
        }
        else {
          observe = function(element, event, handler) {
            element.addEventListener(event, handler, false);
          };
        }
        scope.prevHeight = 0;

        function resize() {
          var clone = element[0].cloneNode();
          element[0].parentNode.insertBefore(clone, element[0]);
          clone.style.height = 'auto';
          clone.style.width = element[0].style.width;
          clone.value = element[0].value;
          var height = (clone.scrollHeight + 2);
          clone.value = 'single';
          height += 34 - (clone.scrollHeight + 2);
          if (height !== scope.prevHeight) {
            element[0].style.height = height + 'px';
            scope.prevHeight = height;
            if (height >= 200) {
              element[0].style.overflowY = 'auto';
            } else {
              element[0].style.overflowY = 'hidden';
            }
          }
          element[0].parentNode.removeChild(clone);
        }

        /* 0-timeout to get the already changed text*/
        function delayedResize() {
          window.setTimeout(resize, 0);
        }

        window.setTimeout(resize, 250);

        observe(element[0], 'change', resize);
        observe(element[0], 'cut', delayedResize);
        observe(element[0], 'paste', delayedResize);
        observe(element[0], 'drop', delayedResize);
        observe(element[0], 'keydown', delayedResize);
      }
    };
  });

  module.directive('datetimepicker', function($rootScope, $translate) {
    return {
      restrict: 'E',
      template: '<div class="row">' +
          '<div ng-show="(editable !== \'false\')" ng-class="{\'col-md-6\': (time === \'true\'),' +
          ' \'col-md-12\': (time === \'false\') || (seperateTime === \'false\')}">' +
          '<div class="form-group">' +
          '<div class="input-group date datepicker">' +
          '<input type="text" class="form-control"/>' +
          '<span class="input-group-addon">' +
          '<span class="glyphicon glyphicon-calendar"></span>' +
          '</span>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div ng-show="(editable !== \'false\') && (time === \'true\') && (seperateTime === \'true\')" +' +
          'class="col-md-6">' +
          '<div class="form-group">' +
          '<div class="input-group date timepicker">' +
          '<input type="text" class="form-control"/>' +
          '<span class="input-group-addon">' +
          '<span class="glyphicon glyphicon-time"></span>' +
          '</span>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div ng-show="(editable === \'false\')">' +
          '<input type="text" ng-model="disabledText" disabled class="disabled-date form-control"/>' +
          '</div>' +
          '</div>',
      replace: true,
      scope: {
        dateObject: '=dateObject',
        dateKey: '=dateKey',
        editable: '@editable',
        defaultDate: '=defaultDate'
      },
      link: function(scope, element, attrs) {
        if (!goog.isDefAndNotNull(scope.editable)) {
          scope.editable = 'true';
        }
        if (!goog.isDefAndNotNull(attrs.time)) {
          scope.time = 'true';
        } else {
          scope.time = attrs.time;
        }
        if (!goog.isDefAndNotNull(attrs.seperateTime)) {
          scope.seperateTime = 'true';
        } else {
          scope.seperateTime = attrs.seperateTime;
        }
        var updateDateTime = function() {
          var newDate = new Date();
          var date = element.find('.datepicker').data('DateTimePicker').getDate();
          if (goog.isDefAndNotNull(date)) {
            newDate.setFullYear(date.year(), date.month(), date.date());
            if (scope.time === 'true' && scope.seperateTime === 'true') {
              var time = element.find('.timepicker').data('DateTimePicker').getDate();
              if (goog.isDefAndNotNull(time)) {
                newDate.setHours(time.hour(), time.minute(), time.second(), time.millisecond());
              } else {
                newDate.setHours(date.hour(), date.minute(), date.second(), date.millisecond());
              }
            } else {
              newDate.setHours(date.hour(), date.minute(), date.second(), date.millisecond());
            }
            if (!scope.$$phase && !$rootScope.$$phase) {
              scope.$apply(function() {
                scope.dateObject[scope.dateKey] = newDate.toISOString();
                scope.disabledText = newDate.toISOString();
              });
            } else {
              scope.dateObject[scope.dateKey] = newDate.toISOString();
              scope.disabledText = newDate.toISOString();
            }
          }
        };

        var dateOptions = {
          pickTime: (scope.time === 'true' && scope.seperateTime === 'false'),
          language: $translate.uses()
        };

        var timeOptions = {
          pickDate: false,
          language: $translate.uses()
        };

        if (scope.defaultDate) {
          var defaultDate = new Date();
          dateOptions.defaultDate = defaultDate;
          timeOptions.defaultDate = defaultDate;
        }

        if (goog.isDefAndNotNull(scope.dateObject[scope.dateKey])) {
          dateOptions.defaultDate = scope.dateObject[scope.dateKey];
          timeOptions.defaultDate = scope.dateObject[scope.dateKey];
        }

        var setUpPickers = function() {
          element.find('.datepicker').datetimepicker(dateOptions);
          element.find('.datepicker').on('change.dp', updateDateTime);
          if (scope.time === 'true' && scope.seperateTime === 'true') {
            element.find('.timepicker').datetimepicker(timeOptions);
            element.find('.timepicker').on('change.dp', updateDateTime);
          }
          if (goog.isDefAndNotNull(dateOptions.defaultDate)) {
            updateDateTime();
            var date = moment(new Date(dateOptions.defaultDate));
            date.lang($translate.uses());
            scope.disabledText = date.format('L') + ' ' + date.format('LT');
          } else {
            scope.disabledText = '';
          }
        };
        setUpPickers();

        scope.$on('translation_change', function(event, lang) {
          dateOptions.language = lang;
          timeOptions.language = lang;
        });
      }
    };
  });

  module.directive('latloneditor', function() {
    return {
      restrict: 'E',
      template: '<div ng-class="{\'has-error\': !geom.valid}" class="form-group">' +
          /*'<div class="input-group">' +
         '<div class="input-group-btn">' +
         '<button type="button" class="btn btn-default dropdown-toggle custom-width-100" data-toggle="dropdown">' +
         '<span class="caret"></span>' +
         '</button>' +
         '<ul id="display-list" class="dropdown-menu">' +
         '<li ng-repeat="display in coordinateDisplays">' +
         '<a ng-click="selectDisplay($index)">{{display}}</a></li>' +
         '</ul>' +
         '</div>' +*/
          '<input ng-model="coordinates" type="text" class="form-control" ng-change="validate()"/>' +
          /*'</div>' +*/
          '</div>',
      replace: true,
      scope: {
        geom: '=',
        coordDisplay: '=coordDisplay'
      },
      link: function(scope) {
        scope.coordinateDisplays = coordinateDisplays;
        if (scope.coordDisplay === coordinateDisplays.DMS) {
          scope.coordinates = ol.coordinate.toStringHDMS(scope.geom.coords);
        } else if (scope.coordDisplay === coordinateDisplays.DD) {
          scope.coordinates = ol.coordinate.createStringXY(scope.geom.coords, settings.DDPrecision);
        }

        scope.selectDisplay = function(index) {
          scope.coordDisplay = coordinateDisplays[index];
        };

        var validateDMS = function(name, split) {
          var upperBounds;
          var negateChar;
          var coordIndex;
          if (name === 'lon') {
            upperBounds = 180;
            negateChar = 'W';
            coordIndex = 0;
          } else if (name === 'lat') {
            upperBounds = 90;
            negateChar = 'S';
            coordIndex = 1;
          } else {
            return false;
          }
          if (split.length === 4) {
            for (var index = 0; index < 3; index++) {
              split[index] = split[index].replace(/[^\d\.]/g, '');
            }
            clean(split, '');
            var newPos = parseInt(split[0], 10) + ((parseInt(split[1], 10) +
                (parseFloat(split[2]) / 60)) / 60);
            if (newPos < 0 || newPos > upperBounds) {
              return false;
            }
            if (split[3].toUpperCase() === negateChar) {
              newPos = -newPos;
            }
            scope.geom.coords[coordIndex] = newPos;
          } else {
            return false;
          }
          return true;
        };

        scope.validate = function() {
          var split = scope.coordinates.replace(/[^\dEWewNSns\.]/g, ' ').split(' ');
          clean(split, '');
          var valid = false;
          var split2 = split.splice(0, 4);
          if (split.length === 4) {
            if (split[3].toUpperCase() === 'S' || split[3].toUpperCase() === 'N') {
              valid = validateDMS('lat', split);
              if (valid === true && (split2[3].toUpperCase() === 'W' || split2[3].toUpperCase() === 'E')) {
                valid = validateDMS('lon', split2);
              } else {
                valid = false;
              }
            } else if (split[3].toUpperCase() === 'W' || split[3].toUpperCase() === 'E') {
              valid = validateDMS('lon', split);
              if (valid === true && (split2[3].toUpperCase() === 'S' || split2[3].toUpperCase() === 'N')) {
                valid = validateDMS('lat', split2);
              } else {
                valid = false;
              }
            }
          }
          scope.geom.valid = valid;
        };
      }
    };
  });

  module.controller('modalToggle', function($scope) {
    $scope.toggleModal = function(id) {
      $(id).modal('toggle');
    };
  });

  module.filter('reverse', function() {
    return function(items) {
      if (goog.isDefAndNotNull(items)) {
        return items.slice().reverse();
      } else {
        return items;
      }
    };
  });

  module.filter('stripWhiteSpace', function() {
    return function(str) {
      if (goog.isDefAndNotNull(str)) {
        return goog.string.removeAll(goog.string.collapseWhitespace(str), ' ');
      } else {
        return str;
      }
    };
  });
})();
