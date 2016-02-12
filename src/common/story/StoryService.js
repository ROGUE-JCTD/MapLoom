(function() {
  var module = angular.module('loom_story_service', ['ngCookies']);
  var service_ = null;
  var mapservice_ = null;
  var configService_ = null;
  var httpService_ = null;
  var dialogService_ = null;


  module.provider('storyService', function() {

    this.$get = function($window, $http, $cookies, $location, $translate, mapService, configService, dialogService) {
      service_ = this;
      mapservice_ = mapService;
      configService_ = configService;
      httpService_ = $http;
      dialogService_ = dialogService;

      //When initializing the story service the mapService should already be initialized
      this.title = 'New Mapstory';
      this.abstract = 'This is the default summary';
      this.category = null;
      this.is_published = false;
      this.configurations = [];
      this.configurations.push(angular.copy(mapservice_.configuration));
      this.active_index = 0;
      this.active_chapter = this.configurations[this.active_index];
      this.active_chapter.map['id'] = 0;
      console.log('-----story_config:', this.active_chapter);
      this.id = this.active_chapter.id;
      this.category = null;
      this.is_published = false;
      this.keywords = [];
      return this;
    };

    this.saveMaps = function() {
      //Go through each chapter configuration and save accordingly through mapService
      for (var iConfig = 0; iConfig < this.configurations.length; iConfig += 1) {
        service_.configurations[iConfig]['chapter_index'] = iConfig;
        mapservice_.save(this.configurations[iConfig]);
      }
      this.print_configurations();
    };

    this.save = function() {
      var cfg = {
        id: this.id || 0,
        title: this.title,
        abstract: this.abstract,
        is_published: this.is_published,
        category: this.category
      };

      //After saving all maps we need to save the possible changed data from storyService
      console.log('saving new Mapstory');
      httpService_({
        url: service_.getSaveURL(),
        method: service_.getSaveHTTPMethod(),
        data: JSON.stringify(cfg),
        headers: {
          'X-CSRFToken': configService_.csrfToken
        }
      }).success(function(data, status, headers, config) {
        service_.updateStoryID(data.id);
        service_.saveMaps();
        console.log('----[ mapstory.save success. ', data, status, headers, config);
      }).error(function(data, status, headers, config) {
        if (status == 403 || status == 401) {
          dialogService_.error(translate_.instant('save_failed'), translate_.instant('mapstory_save_permission'));
        } else {
          dialogService_.error(translate_.instant('save_failed'), translate_.instant('mapstory_save_failed',
              {value: status}));
        }
      });

    };

    this.updateStoryID = function(id) {
      this.id = id;
      for (var iConfig = 0; iConfig < this.configurations.length; iConfig += 1) {
        this.configurations[iConfig].id = id;
      }
    };

    this.getSaveURL = function() {
      if (goog.isDefAndNotNull(this.id) && this.id) {
        return '/maps/' + this.id + '/save';
      } else {
        return '/maps/new/story';
      }
    };

    this.getSaveHTTPMethod = function() {
      if (goog.isDefAndNotNull(this.id) && this.id) {
        return 'PUT';
      } else {
        return 'POST';
      }
    };

    this.print_configurations = function() {
      console.log('=====configurations======');
      for (var iConfig = 0; iConfig < this.configurations.length; iConfig += 1) {
        console.log('configuration ', iConfig, this.configurations[iConfig]);
      }
    };

    this.get_chapter_config = function(index) {
      return this.configurations[index];
    };

    this.update_active_config = function(index) {
      //This function updates the active_chapter and propagates the new
      //active configuration to the other services.
      this.active_chapter = this.configurations[index];
      this.active_index = index;

      mapservice_.updateActiveMap(this.active_index, this.active_chapter);
    };

    this.change_chapter = function(chapter_index) {
      service_.update_active_config(chapter_index);
    };

    this.next_chapter = function() {
      var nextChapter = this.active_index + 1;
      if (nextChapter > this.configurations.length - 1) {
        nextChapter = 0;
      }
      service_.update_active_config(nextChapter);
    };

    this.prev_chapter = function() {
      var prevChapter = this.active_index - 1;
      if (prevChapter < 0) {
        prevChapter = 0;
      }
      service_.update_active_config(prevChapter);
    };

    this.add_chapter = function($scope, $compile) {
      //TODO: Add new config object that is clone of current without layers, boxes, or pins
      //TODO: This will also need to switch the document focus to the new map and chapter in the menu
      var new_chapter = angular.copy(configService_.initial_config);
      new_chapter['id'] = this.id;
      new_chapter.map['id'] = 0;
      new_chapter.about.title = 'Untitled Chapter';
      new_chapter.about.summary = '';
      this.configurations.push(new_chapter);
      mapservice_.createNewChapter(new_chapter);
      service_.update_active_config(this.configurations.length - 1);

      this.print_configurations();


      // Update the front end push menu
      var $addTo = $('#menu').multilevelpushmenu('activemenu').first();
      var index = (this.configurations.length - 1);
      var chapterTemplate = '<div><label>Chapter Title</label><input class="form-control" placeholder="Chapter Title">';
      chapterTemplate += '<label>Summary</label><textarea class="form-control" placeholder="Chapter Summary" rows="5"></textarea>';
      chapterTemplate += '<button type="submit" class="btn btn-default">Save chapter info</button></div>';
      var addChapter = [
        {
          name: 'Chapter ' + (index + 1),
          id: 'chapter' + (index + 1),
          link: '#',
          items: [
            {
              title: 'Chapter ' + (index + 1),
              id: 'sub-chapter' + (index + 1),
              icon: 'fa fa-bookmark',
              items: [
                {
                  name: 'Chapter Info',
                  icon: 'fa fa-info-circle',
                  link: '#',
                  items: [
                    {
                      title: 'Chapter Info',
                      id: ('chapter-info-' + (index + 1)),
                      icon: 'fa fa-info-cicle',
                      items: [
                        {
                          name: 'Chapter Title',
                          link: '#'
                        },
                        {
                          name: '<input type="text" name="test" id="test" value="" />',
                          link: '#'
                        },
                        {
                          name: 'Chapter Summary',
                          link: '#'
                        },
                        {
                          name: '<textarea rows ="6" cols="30"></textarea>',
                          link: '#'
                        },
                        {
                          name: '<button class = "btn btn-default btn-lg center-block">Save Chapter Info</button>'
                        }
                      ]
                    }
                  ]
                },
                {
                  name: 'StoryLayers',
                  icon: 'fa fa-clone',
                  link: '#',
                  items: [
                    {
                      title: 'Chapter ' + (index + 1),
                      icon: 'fa fa-bookmark',
                      items: [
                        {
                          name: 'Add a New StoryLayer...',
                          id: 'addNewLayer',
                          link: '#'
                        }
                      ]
                    }
                  ]
                },
                {
                  name: 'StoryBoxes',
                  icon: 'fa fa-object-group',
                  link: '#',
                  items: [
                    {
                      title: 'Chapter ' + (index + 1),
                      icon: 'fa fa-bookmark',
                      items: [
                        {
                          name: 'Add a New StoryBox...',
                          link: '#',
                          items: [
                            {
                              title: 'Add Storybox',
                              icon: 'fa fa-bookmark',
                              link: '#',
                              items: [
                                {
                                  name: 'Story # Map Extents',
                                  link: '#'
                                },
                                {
                                  name: '<p>Pan and zoom on the map to set the map bounds.</p><button class = "btn btn-default btn-lg center-block">Set Map Bounds</button>',
                                  link: '#'
                                },
                                {
                                  name: 'Time Frame',
                                  link: '#'
                                },
                                {
                                  name: '<p>Start Time</p><input type = "time" name = "start_time">',
                                  link: '#'
                                },
                                {
                                  name: '<p>End Time<p><input type = "time" name = "end_time">',
                                  link: '#'
                                },
                                {
                                  name: '<button class = "btn btn-default btn-lg center-block">Save Storybox</button>',
                                  link: '#'
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  name: 'StoryPins',
                  icon: 'fa fa-neuter',
                  link: '#',
                  items: [
                    {
                      title: 'Chapter ' + (index + 1),
                      icon: 'fa fa-bookmark',
                      items: [
                        {
                          name: 'Add a New StoryPin...',
                          link: '#',
                          items: [
                            {
                              title: 'Add StoryPin',
                              icon: 'fa fa-bookmark',
                              link: '#',
                              items: [
                                {
                                  name: 'StoryPin Title',
                                  link: '#'
                                },
                                {
                                  name: '<input type="text" name="storyPinTitle" />',
                                  link: '#'
                                },
                                {
                                  name: 'StoryPin Content',
                                  link: '#'
                                },
                                {
                                  name: '<input type="text" name="storyPinContent" />',
                                  link: '#'
                                },
                                {
                                  name: '<button class = "btn btn-default btn-lg center-block">Link Media...</button>',
                                  link: '#'
                                },
                                {
                                  name: 'Pin Location',
                                  link: '#'
                                },
                                {
                                  name: '<p>Drop pin on the map to set pin location</p><button class = "btn btn-default btn-lg center-block">Save Pin Location</button>',
                                  link: '#'
                                },
                                {
                                  name: 'Time',
                                  link: '#'
                                },
                                {
                                  name: '<input type = "time" name = "storyPinTime">',
                                  link: '#'
                                },
                                {
                                  name: '<button class = "btn btn-default btn-lg center-block">Save StoryPin</button>',
                                  link: '#'
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  name: 'Delete Chapter',
                  id: 'deleteChapter',
                  icon: 'fa fa-trash-o',
                  link: '#'
                }
              ]
            }
          ]
        }
      ];
      $('#menu').multilevelpushmenu('additems', addChapter, $addTo, index);
      // Bind the chapter title to the created menu object
      var template = '<p> {{ storyService.configurations[' + index + '].about.title }} </p>';
      var chapterTitle = $compile(angular.element(template))($scope);
      $(chapterTitle).appendTo($(('#chapter' + (index + 1))));
      // Bind the subtitle to the created chapter menu
      template = '<h2> {{ storyService.configurations[' + index + '].about.title }} </h2>';
      var subtitle = $compile(angular.element(template))($scope);
      $(('#sub-chapter' + (index + 1) + ' > h2')).after(subtitle);
      // Expand to the chapter info form
      var $expandTo = $(('#chapter-info-' + (index + 1)));
      $('#menu').multilevelpushmenu('expand', $expandTo);
    };

    this.remove_chapter = function() {
      //TODO: After removing a chapter we will need to switch focus to the base level of menu
      this.configurations.splice(this.active_index, 1);
      if (this.configurations.length > 0) {
        this.update_active_config(0);
      }

      // Angular bindings will update to reflect the above change, so just delete the last chapter in the UI
      // TODO: Get rid of the +1 at some point when we start with a Chapter 1.
      $(('#chapter' + (this.configurations.length + 1))).remove();

      // Switch focus to base level of menu
      $('#menu').multilevelpushmenu('collapse', 0);
    };

  });


}());
