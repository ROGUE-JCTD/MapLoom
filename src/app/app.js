(function() {
  var module = angular.module('MapLoom', [
    'templates-app',
    'templates-common',
    'storytools.edit.style',
    'colorpicker.module',
    'loom',
    'ui.bootstrap',
    'ui.router',
    'pascalprecht.translate',
    'loom_translations_en',
    'loom_translations_es',
    'xeditable'
  ]);

  module.config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode(true);
  }]);

  module.run(function run(editableOptions) {
    editableOptions.theme = 'bs3';
  });

  module.controller('AppCtrl', function AppCtrl($scope, $window, $location, $translate, mapService, debugService,
                                                refreshService, dialogService, storyService, boxService, pinService, $http) {

        $scope.$on('$stateChangeSuccess', function(event, toState) {
          if (angular.isDefined(toState.data.pageTitle)) {
            $scope.pageTitle = toState.data.pageTitle;
          }
        });

        $('body').on('show.bs.modal', function(e) {
          var modals = $('.modal.in');
          var backdrops = $('.modal-backdrop');
          for (var i = 0; i < modals.length; i++) {
            modals.eq(i).css('z-index', 760 - (modals.length - i) * 20);
            backdrops.eq(i).css('z-index', 750 - (modals.length - i) * 20);
          }
          $(e.target).css('z-index', 760);
        });

        var errorDialogShowing = false;
        onErrorCallback = function(msg) {
          if (goog.isDefAndNotNull(ignoreNextScriptError) && ignoreNextScriptError &&
              msg.indexOf('Script error') > -1) {
            ignoreNextScriptError = false;
            return;
          }
          if (errorDialogShowing) {
            return;
          }
          errorDialogShowing = true;
          console.log('==== onErrorCallback, error msg:', msg);
          var msg_string = msg;
          if (typeof msg != 'string') {
            msg_string = 'message not string. view console for object detail';
          }
          dialogService.error($translate.instant('error'), $translate.instant('script_error',
              {error: msg_string})).then(function() {
            errorDialogShowing = false;
          });
        };

        // Enable Proj4JS and add projection definitions
        ol.HAVE_PROJ4JS = ol.ENABLE_PROJ4JS && typeof proj4 == 'function';

        // load the predefined projections available when there is no network connectivity
        if (ol.HAVE_PROJ4JS === true) {
          maploomProj4Defs(proj4.defs);
        }

        $scope.mapService = mapService;
        $scope.storyService = storyService;
        $scope.refreshService = refreshService;
        $scope.boxService = boxService;
        $scope.pinService = pinService;
        $scope.box = {};
        $scope.pin = {};

        $scope.addStoryBox = function(box) {
          var clone = angular.copy(box);
          goog.object.extend(clone, {'id': new Date().getUTCMilliseconds()});
          goog.object.extend(clone, {'extent': mapService.map.getView().calculateExtent(mapService.map.getSize())});
          boxService.addBox(clone, $scope.active_menu_chapter.id);
          $scope.box = {};
          $scope.updateMenuSection('storyBoxes' + $scope.active_menu_chapter.id);
        };

        $scope.setPinLocation = function() {

        };

        $scope.addStoryPin = function(pin) {
          var clone = angular.copy(pin);
          goog.object.extend(clone, {'id': new Date().getUTCMilliseconds()});
          pinService.addPin(clone, $scope.active_menu_chapter.id);
          $scope.pin = {};
          $scope.updateMenuSection('storyPins' + $scope.active_menu_chapter.id);
        };

        $scope.mapstories = {
          name: storyService.title,
          chapters: []
        };

        $scope.active_menu_chapter = null;
        $scope.prev_menu_section = null;
        $scope.menuSection = 'mainMenu';

        $scope.updateMenuSection = function(updateMenuSection) {
          if (updateMenuSection == 'mainMenuHidden') {
            $scope.prev_menu_section = $scope.menuSection;
          }
          $scope.menuSection = updateMenuSection;
          if (updateMenuSection.startsWith('selectedChapter')) {
            var re = /(\d+)/;
            var chapter_index = updateMenuSection.match(re);
            $scope.active_menu_chapter = $scope.mapstories.chapters[chapter_index[0]];
          } else if (updateMenuSection == 'mainMenu') {
            $scope.active_menu_chapter = null;
            $scope.storyService.clearSelectedItems();
          }
        };

        $scope.reorderLayer = function(startIndex, endIndex) {
          var length = mapService.map.getLayers().getArray().length - 1;
          var layer = mapService.map.removeLayer(mapService.map.getLayers().item(length - startIndex));
          mapService.map.getLayers().insertAt(length - endIndex, layer);
        };

        $scope.locations = {};

        $http.get('/api/regions/').success(function(data) {
          $scope.locations = data.objects;
        });

        $scope.isShown = true;

        $scope.toggleSidebar = function() {
          $scope.isShown = !$scope.isShown;
          if ($scope.menuSection == 'mainMenuHidden') {
            $scope.updateMenuSection($scope.prev_menu_section);
            $scope.helpBoxVisible = false;
            document.getElementById('pushobj').style.width = '75%';
          } else {
            $scope.updateMenuSection('mainMenuHidden');
            document.getElementById('pushobj').style.width = '100%';
          }
          $scope.mapService.updateMapSize();
        };

        $scope.helpBoxVisible = false;

        $scope.showHelpBox = function(helpText) {
          angular.element(document.querySelector('#helpTextBox')).html(helpText);
          $scope.helpBoxVisible = true;
        };


        $scope.styleChanged = function(layer) {
          layer.on('change:type', function(evt) {
            mapService.updateStyle(evt.target);
          });
          mapService.updateStyle(layer);
        };

        $scope.removeChapter = function() {
          storyService.remove_chapter().then(function(removed_index) {
            if (removed_index !== null) {
              var num_chapters = $scope.mapstories.chapters.length;
              for (var iChapter = removed_index + 1; iChapter < num_chapters; iChapter += 1) {
                $scope.mapstories.chapters[iChapter].chapter = 'Chapter ' + (iChapter);
                $scope.mapstories.chapters[iChapter].id -= 1;
              }
              //Remove front end chapter from menu
              $scope.mapstories.chapters.splice(removed_index, 1);
              $scope.storyService.update_active_config($scope.mapstories.chapters[0].id, true);
              $scope.updateMenuSection('mainMenu');
            }
          });

        };

        $scope.removeLayer = function() {
          storyService.removeLayer().then(function(layer_removed) {
            if (layer_removed === true) {
              $scope.updateMenuSection('storyLayers' + $scope.active_menu_chapter.id);
              storyService.active_layer = null;
            }
          });
        };

        $scope.addChapter = function() {
          //Add chapter to backend story service will return new chapter ID or null if failure
          var new_index = storyService.add_chapter();
          if (new_index !== null) {
            $scope.addChapterToMenu(new_index);
            //Change focus to chapter info for newly created chapter
            $scope.updateMenuSection('chapterInfo' + new_index);
          }
        };

        $scope.addStorylayerToMenu = function(chapter_index, layer_config) {
          console.log('layer to add:', layer_config);
          var add_index = $scope.mapstories.chapters[chapter_index].storyLayers.length;
          var new_layer = {
            id: add_index,
            title: layer_config.title || 'Untitled Layer'
          };
          $scope.mapstories.chapters[chapter_index].storyLayers.push(new_layer);

        };
        //front end initialization of new chapter on menu element
        $scope.addChapterToMenu = function(index) {
          var new_chapter_item = {
            id: index,
            chapter: 'Chapter ' + (index + 1),
            title: storyService.configurations[index].about.title,
            summary: storyService.configurations[index].about.abstract,
            storyLayers: [],
            storyBoxes: [],
            storyPins: []
          };

          //Add new chapter to sidebar menu
          $scope.mapstories.chapters.push(new_chapter_item);

        };

        $scope.addChapterToMenu(0);

      });

  module.provider('debugService', function() {
    this.$get = function() {
      return this;
    };

    this.showDebugButtons = false;
  });

  module.provider('$exceptionHandler', function() {
    this.$get = function(errorLogService) {
      return errorLogService;
    };
  });

  module.factory('errorLogService', function($log, $window) {
    function log(exception, cause) {
      $log.error.apply($log, arguments);
      onErrorCallback(exception.toString());
    }
    // Return the logging function.
    return log;
  });

  module.config(function($translateProvider) {
    $translateProvider.preferredLanguage('en');
  });
}());
