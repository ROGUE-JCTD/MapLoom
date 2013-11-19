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
      template: '<div class="row">' +
          '<div class="col-md-6">' +
          '<div class="form-group">' +
          '<input ng-model="lon" type="text" class="form-control" ng-change="validate()"/>' +
          '</div>' +
          '</div>' +
          '<div class="col-md-6">' +
          '<div class="form-group">' +
          '<input ng-model="lat" type="text" class="form-control" ng-change="validate()"/>' +
          '</div>' +
          '</div>' +
          '</div>',
      replace: true,
      scope: {
        geom: '='
      },
      link: function(scope, element) {
        scope.lon = ol.coordinate.degreesToStringHDMS_(scope.geom.coordinates[0], 'EW');
        scope.lat = ol.coordinate.degreesToStringHDMS_(scope.geom.coordinates[1], 'NS');
        scope.validate = function() {
          //console.log();
          /*var lon = window.items.items[0].getValue();
           lon = lon.replace(/[^\dEWew\.]/g, " ").split(" ");
           if(lon.length === 4) {
           var newlon = parseInt(lon[0]) + ((parseInt(lon[1]) + (parseFloat(lon[2])/60))/60);
           if(newlon < 0 || newlon > 180) {
           window.items.items[0].setValue(window.items.items[0].originalValue);
           alert("Invalid coordinates, goes outside of max/min boundaries for longitude");
           return;
           }
           if(lon[3] === "W" || lon[3] === "w") {
           newlon = -newlon;
           }
           } else {
           window.items.items[0].setValue(window.items.items[0].originalValue);
           alert("Invalid format, must have Degrees Minutes Seconds Direction");
           return;
           }
           var lat = window.items.items[2].getValue();
           lat = lat.replace(/[^\dNSns\.]/g, " ").split(" ");
           if(lat.length === 4) {
           var newlat = (parseInt(lat[0]) + ((parseInt(lat[1]) + (parseFloat(lat[2])/60))/60));
           if(newlat < 0 || newlat > 90) {
           window.items.items[2].setValue(window.items.items[2].originalValue);
           alert("Invalid coordinates, goes outside of max/min boundaries for latitude");
           return;
           }
           if(lat[3] === "S" || lat[3] === "s") {
           newlat = -newlat;
           }
           } else {
           window.items.items[2].setValue(window.items.items[2].originalValue);
           alert("Invalid format, must have Degrees Minutes Seconds Direction");
           return;
           }   */
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
