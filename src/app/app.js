(function() {
  var module = angular.module('MapLoom', [
    'templates-app',
    'templates-common',
    'storytools.edit.style',
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
                                                refreshService, dialogService, storyService, $compile) {
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

        $scope.addChapter = function() {
          storyService.add_chapter($scope, $compile);
        };

        $scope.initMenu = function() {
          var titleTemplate = '<p>{{ storyService.title }}</p>';
          var addChapterTemplate = '<a id="addchapter" ng-click="addChapter();">Add a new chapter</a>';
          var title = $compile(angular.element(titleTemplate))($scope);
          var addChapter = $compile(angular.element(addChapterTemplate))($scope);
          var arrayMenu = [
            {
              title: title,
              icon: 'fa fa-reorder',
              items: [
                {
                  name: '<button type="button" class="btn btn-default btn-md" data-target="#mapProperties" data-toggle="modal">Summary</button> <button data-target="#mapSave" data-toggle="modal" type="button" class="btn btn-default btn-md">Save MapStory...</button> <button type="button" class="btn btn-default btn-md">Preview</button>',
                  link: '#'
                },
                {
                  name: addChapter,
                  icon: 'fa fa-plus-square-o',
                  link: '#'
                },
                {
                  name: '<a href="/getskills" target="_blank">Help</a>',
                  icon: 'fa fa-support',
                  link: '#'
                }
              ]
            }
          ];
          // HTML markup implementation, cover mode
          $('#menu').multilevelpushmenu({
            menu: arrayMenu,
            containersToPush: [$('pushobj')],
            mode: 'cover',
            onItemClick: function() {
              $item = arguments[2];
              var idOfClicked = $item[0].id;
              // If the item has the id 'deleteChapter', then spawn the modal
              if (idOfClicked === 'deleteChapter') {
                $('#chapterDelete').modal('show');
              }
              // If the item has the id 'addNewLayer', then spawn the modal
              if (idOfClicked === 'addNewLayer') {
                $('#add-layer-dialog').modal('show');
              }
            },
            onCollapseMenuEnd: function() {
              // Only if the entire menu is deactivated, expand map
              var active = $('#menu').multilevelpushmenu('activemenu');
              console.log(active);
              if (active.prevObject.length === 0) {
                $('#pushobj').css('width', '94%');
              }
            },
            onExpandMenuStart: function() {
              $('#pushobj').css('width', '74%');
            }
          });
        };

        $scope.initMenu();
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

