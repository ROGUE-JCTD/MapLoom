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
          '<div ng-show="(editable !== \'false\') && (date === \'true\')"' +
          ' ng-class="{\'col-md-6\': (time === \'true\'),' +
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
          '<div ng-show="(editable !== \'false\') && (time === \'true\') && ((seperateTime === \'true\') ||' +
          ' (date === \'false\'))" ng-class="{\'col-md-6\': (date === \'true\' && seperateTime === \'true\'),' +
          ' \'col-md-12\': (date === \'false\')}">' +
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
        if (!goog.isDefAndNotNull(attrs.date)) {
          scope.date = 'true';
        } else {
          scope.date = attrs.date;
        }
        if (!goog.isDefAndNotNull(attrs.seperateTime)) {
          scope.seperateTime = 'true';
        } else {
          scope.seperateTime = attrs.seperateTime;
        }
        var updateDateTime = function() {
          var newDate = new Date();
          var date = element.find('.datepicker').data('DateTimePicker');
          if (goog.isDefAndNotNull(date)) {
            date = date.getDate();
            newDate.setFullYear(date.year(), date.month(), date.date());
          }
          var time = element.find('.timepicker').data('DateTimePicker');
          if (goog.isDefAndNotNull(time)) {
            time = time.getDate();
            newDate.setHours(time.hour(), time.minute(), time.second(), time.millisecond());
          }

          if (!scope.$$phase && !$rootScope.$$phase) {
            scope.$apply(function() {
              var momentDate = moment(new Date(dateOptions.defaultDate));
              momentDate.lang($translate.uses());
              if (time && date) {
                scope.dateObject[scope.dateKey] = newDate.toISOString();
                scope.disabledText = momentDate.format('L') + ' ' + momentDate.format('LT');
              } else if (time) {
                scope.dateObject[scope.dateKey] = newDate.toISOString().split('T')[1];
                scope.disabledText = momentDate.format('LT');
              } else if (date) {
                scope.dateObject[scope.dateKey] = newDate.toISOString().split('T')[0];
                scope.disabledText = momentDate.format('L');
              }
            });
          } else {
            var momentDate = moment(new Date(dateOptions.defaultDate));
            momentDate.lang($translate.uses());
            if (time && date) {
              scope.dateObject[scope.dateKey] = newDate.toISOString();
              scope.disabledText = momentDate.format('L') + ' ' + momentDate.format('LT');
            } else if (time) {
              scope.dateObject[scope.dateKey] = newDate.toISOString().split('T')[1];
              scope.disabledText = momentDate.format('LT');
            } else if (date) {
              scope.dateObject[scope.dateKey] = newDate.toISOString().split('T')[0];
              scope.disabledText = momentDate.format('L');
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
          if (scope.date === 'false') {
            timeOptions.defaultDate = '2014-03-10T' + scope.dateObject[scope.dateKey];
          } else if (scope.time === 'false') {
            dateOptions.defaultDate = scope.dateObject[scope.dateKey].replace('Z', '');
          } else {
            if (scope.dateObject[scope.dateKey].search('Z') === -1) {
              scope.dateObject[scope.dateKey] += 'Z';
            }
            dateOptions.defaultDate = scope.dateObject[scope.dateKey];
            timeOptions.defaultDate = scope.dateObject[scope.dateKey];
          }
        }

        var setUpPickers = function() {
          if (scope.date === 'true') {
            element.find('.datepicker').datetimepicker(dateOptions);
            element.find('.datepicker').on('change.dp', updateDateTime);
          }
          if (scope.time === 'true' && (scope.seperateTime === 'true' || scope.date === 'false')) {
            element.find('.timepicker').datetimepicker(timeOptions);
            element.find('.timepicker').on('change.dp', updateDateTime);
          }
          if (goog.isDefAndNotNull(dateOptions.defaultDate) || goog.isDefAndNotNull(timeOptions.defaultDate)) {
            updateDateTime();
            var date;
            if (scope.date === 'true' && scope.time === 'true') {
              date = moment(dateOptions.defaultDate);
              date.lang($translate.uses());
              scope.disabledText = date.format('L') + ' ' + date.format('LT');
            } else if (scope.time === 'true') {
              date = moment(new Date(timeOptions.defaultDate));
              date.lang($translate.uses());
              scope.disabledText = date.format('LT');
            } else if (scope.date === 'true') {
              date = moment.utc(dateOptions.defaultDate);
              date.lang($translate.uses());
              scope.disabledText = date.format('L');
            }
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
          '<div class="input-group">' +
          '<div class="input-group-btn">' +
          '<button type="button" class="btn btn-default dropdown-toggle custom-width-100" data-toggle="dropdown">' +
          '<span class="caret"></span>' +
          '</button>' +
          '<ul id="display-list" class="dropdown-menu">' +
          '<li ng-repeat="display in coordinateDisplays">' +
          '<a ng-click="selectDisplay(display)" translate="{{display}}"></a></li>' +
          '</ul>' +
          '</div>' +
          '<input ng-model="coordinates" type="text" class="form-control" ng-change="validate()"/>' +
          '</div>' +
          '</div>',
      replace: true,
      scope: {
        geom: '=',
        coordDisplay: '=coordDisplay'
      },
      link: function(scope) {
        if (scope.geom.projection !== 'EPSG:4326') {
          scope.coordinateDisplays = [coordinateDisplays.Other];
        } else {
          scope.coordinateDisplays = [coordinateDisplays.DMS, coordinateDisplays.DD];
        }

        var setUpCoordinates = function() {
          if (scope.coordDisplay.value === coordinateDisplays.DMS) {
            scope.coordinates = ol.coordinate.toStringHDMS(scope.geom.coords);
          } else {
            scope.coordinates = ol.coordinate.toStringXY(scope.geom.coords, settings.DDPrecision);
          }
        };

        setUpCoordinates();

        scope.selectDisplay = function(display) {
          scope.coordDisplay.value = display;
          setUpCoordinates();
          scope.validate();
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
          for (var index = 0; index < 2; index++) {
            split[index] = split[index].replace(/[^\d]/g, '');
          }
          var decimal = split[2].substr(split[2].indexOf('.') + 1).replace(/[^\d]/g, '');
          split[2] = split[2].substr(0, split[2].indexOf('.') + 1) + decimal;
          clean(split, '');
          if (split.length === 4) {
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

        var validateCoords = function(name, value, checkBounds) {
          var bounds;
          var coordIndex;
          var negate = value.indexOf('-') === 0;
          if (name === 'lon') {
            bounds = 180;
            coordIndex = 0;
          } else if (name === 'lat') {
            bounds = 90;
            coordIndex = 1;
          } else {
            return false;
          }
          var decimal = value.substr(value.indexOf('.') + 1).replace(/[^\d]/g, '');
          value = parseFloat(value.substr(0, value.indexOf('.') + 1).replace(/[^\d\.]/g, '') + decimal);
          if (checkBounds && (value < 0 || value > bounds)) {
            return false;
          }
          if (negate) {
            value = -value;
          }
          scope.geom.coords[coordIndex] = value;
          return true;
        };

        scope.validate = function() {
          var valid = false;
          var split;
          if (scope.coordDisplay.value === coordinateDisplays.DMS) {
            split = scope.coordinates.replace(/[^\dEWewNSns\.]/g, ' ').split(' ');
            clean(split, '');
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
          } else {
            split = scope.coordinates.replace(/[^\d-\.]/g, ' ').split(' ');
            clean(split, '');
            if (split.length === 2) {
              valid = validateCoords('lon', split[0], scope.coordDisplay.value === coordinateDisplays.DD);
              if (valid) {
                valid = validateCoords('lat', split[1], scope.coordDisplay.value === coordinateDisplays.DD);
              }
            }
          }
          scope.geom.valid = valid;
          scope.geom.changed = true;
          scope.geom.originalText = scope.coordinates;
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
