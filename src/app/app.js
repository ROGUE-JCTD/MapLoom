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
          //Add chapter to backend story service will return new chapter ID or null if failure
          var new_index = storyService.add_chapter();
          if (new_index !== null) {
            $scope.addMenuChapter(new_index);
            // Expand to the chapter info form
            var $expandTo = $(('#chapter-info-' + (new_index + 1)));
            $scope.expandMenu($expandTo);
          }
        };

        //front end initialization of new chapter on menu element
        $scope.addMenuChapter = function(index) {
          var menu_element = $('#menu');
          if (menu_element === null) {
            return;
          }
          //human readable index
          var readable_index = index + 1;

          // Update the front end push menu
          var $addTo = menu_element.multilevelpushmenu('activemenu').first();

          //call to global function to setup chapter template I feel this should all be done some other way
          var addChapter = create_chapter_template(readable_index);
          menu_element.multilevelpushmenu('additems', addChapter, $addTo, index + 1);
          // Bind the chapter title to the created menu object
          var template = '<p> {{ storyService.configurations[' + index + '].about.title }} </p>';
          var chapterTitle = $compile(angular.element(template))($scope);
          $(chapterTitle).appendTo($(('#chapter' + (readable_index))));
          // Bind the subtitle to the created chapter menu
          template = '<h2> {{ storyService.configurations[' + index + '].about.title }} </h2>';
          var subtitle = $compile(angular.element(template))($scope);
          $(('#sub-chapter' + (readable_index) + ' > h2')).after(subtitle);

        };

        $scope.expandMenu = function(element_id) {

          var element = $(element_id);
          if (element === null) {
            return;
          }
          $('#menu').multilevelpushmenu('expand', element);
        };

        $scope.initMenu = function() {
          var titleTemplate = '<p>{{ storyService.title }}</p>';
          var addChapterTemplate = '<a id="addchapter" ng-click="addChapter();">Add a new chapter</a>';
          var storyLayerTemplate = '<div ng-include = "storylayer.tpl.html"></div>';
          var title = $compile(angular.element(titleTemplate))($scope);
          var addChapter = $compile(angular.element(addChapterTemplate))($scope);
          var storyLayer = $compile(angular.element(storyLayerTemplate))($scope);
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
                },
                {
                  name: 'StoryLayer Test',
                  link: '#',
                  items: [
                    {
                      name: storyLayer,
                      link: '#'
                    }
                  ]
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
              var $item = arguments[2];
              var idOfClicked = $item[0].id;
              var e = arguments[0];
              // If the item has the id 'deleteChapter', then spawn the modal
              if (idOfClicked === 'deleteChapter') {
                $('#chapterDelete').modal('show');
              }
              // If the item has the id 'addNewLayer', then spawn the modal
              if (idOfClicked === 'addNewLayer') {
                $('#add-layer-dialog').modal('show');
              }
              if ($(e.target).prop('tagName').toLowerCase() == 'input' || $(e.target).prop('tagName').toLowerCase() == 'textarea') {
                $(e.target).focus();
              }
            },
            onGroupItemClick: function() {
              // Update active config to tell it which chapter we're on using a zero based index.
              //This function gets called whenever a menu element that has other items present under it is clicked
              var $item = arguments[2];
              var idOfClicked = $item[0].id;
              //Check that we are clicking a base level chapter element first.
              var chapter_match = idOfClicked.match(/^chapter(\d+)/);
              if (chapter_match !== null) {
                console.log(chapter_match);
                var index = chapter_match[1] - 1;
                storyService.update_active_config(index);
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

        //Initialize the multilevel menu and add first default chapter.
        $scope.initMenu();
        $scope.addMenuChapter(0);

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
