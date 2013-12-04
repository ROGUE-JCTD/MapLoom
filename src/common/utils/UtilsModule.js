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

  module.directive('datetimepicker', function() {
    return {
      restrict: 'E',
      template: '<div class="row">' +
          '<div ng-class="{\'col-md-6\': (time === \'true\'),' +
          ' \'col-md-12\': (time === \'false\') || (seperateTime === \'false\')}">' +
          '<div class="form-group">' +
          '<div class="input-group date datepicker">' +
          '<input type="text" class="form-control" />' +
          '<span class="input-group-addon"><span class="glyphicon glyphicon-calendar"></span>' +
          '</span>' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div ng-show="(time === \'true\') && (seperateTime === \'true\')" class="col-md-6">' +
          '<div class="form-group">' +
          '<div class="input-group date timepicker">' +
          '<input type="text" class="form-control" />' +
          '<span class="input-group-addon"><span class="glyphicon glyphicon-time"></span>' +
          '</span>' +
          '</div>' +
          '</div>' +
          '</div></div>',
      replace: true,
      scope: {
        dateObject: '=dateObject',
        dateKey: '=dateKey'
      },
      link: function(scope, element, attrs) {
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
          newDate.setFullYear(date.year(), date.month(), date.date());
          if (scope.time === 'true' && scope.seperateTime === 'true') {
            var time = element.find('.timepicker').data('DateTimePicker').getDate();
            newDate.setHours(time.hour(), time.minute(), time.second(), time.millisecond());
          } else {
            newDate.setHours(date.hour(), date.minute(), date.second(), date.millisecond());
          }
          scope.dateObject[scope.dateKey] = newDate.toISOString();
        };
        element.find('.datepicker').datetimepicker({pickTime: (scope.time === 'true' && scope.seperateTime === 'false'),
          defaultDate: scope.dateObject[scope.dateKey]});
        element.find('.datepicker').on('change.dp', updateDateTime);
        if (scope.time === 'true' && scope.seperateTime === 'true') {
          element.find('.timepicker').datetimepicker({pickDate: false, defaultDate: scope.dateObject[scope.dateKey]});
          element.find('.timepicker').on('change.dp', updateDateTime);
        }
      }
    };
  });

  module.directive('latloneditor', function() {
    return {
      restrict: 'E',
      template: '<div ng-class="{\'has-error\': !formName.coords.$valid}" class="form-group">' +
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
          '<input name="coords" ng-model="coordinates" type="text" class="form-control" ng-change="validate()"/>' +
          /*'</div>' +*/
          '</div>',
      replace: true,
      scope: {
        geom: '=',
        formName: '=formName',
        coordDisplay: '=coordDisplay'
      },
      link: function(scope) {
        scope.coordinateDisplays = coordinateDisplays;
        if (scope.coordDisplay === coordinateDisplays.DMS) {
          scope.coordinates = ol.coordinate.toStringHDMS(scope.geom);
        } else if (scope.coordDisplay === coordinateDisplays.DD) {
          scope.coordinates = ol.coordinate.createStringXY(scope.geom, settings.DDPrecision);
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
            var newPos = parseInt(split[0], 10) + ((parseInt(split[1], 10) +
                (parseFloat(split[2]) / 60)) / 60);
            if (newPos < 0 || newPos > upperBounds) {
              return false;
            }
            if (split[3].toUpperCase() === negateChar) {
              newPos = -newPos;
            }
            scope.geom[coordIndex] = newPos;
          } else {
            return false;
          }
          return true;
        };

        scope.validate = function() {
          var split = scope.coordinates.replace(/[^\dEWewNSns\.]/g, ' ').split(' ');
          clean(split, '');
          var valid = false;
          if (split.length === 8) {
            var split2 = split.splice(0, 4);
            if (split[3].toUpperCase() === 'S' || split[3].toUpperCase() === 'N') {
              valid = validateDMS('lat', split);
              if (valid === true && (split2[3].toUpperCase() === 'W' || split2[3].toUpperCase() === 'E')) {
                valid = validateDMS('lon', split2);
              } else {
                valid = false;
              }
            } else {
              valid = validateDMS('lon', split);
              if (valid === true && (split2[3].toUpperCase() === 'S' || split2[3].toUpperCase() === 'N')) {
                valid = validateDMS('lat', split2);
              } else {
                valid = false;
              }
            }
          }
          scope.formName.$valid = valid;
          scope.formName.coords.$valid = valid;
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
})();
