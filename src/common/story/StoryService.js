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
      this.configurations.push(mapservice_.configuration);
      this.active_index = 0;
      this.active_chapter = this.configurations[this.active_index];
      this.id = this.active_chapter.story_id;
      this.category = null;
      this.is_published = false;
      this.keywords = [];
      return this;
    };

    this.save = function() {
      var cfg = {
        id: this.id || 0,
        title: this.title,
        abstract: this.abstract,
        is_published: this.is_published,
        category: this.category
      };

      //Go through each chapter configuration and save accordingly through mapService
      for (var iConfig = 0; iConfig < this.configurations; iConfig += 1) {
        var configToSave = this.configurations[iConfig];
        configToSave['chapter_index'] = iConfig;
        mapservice_.configuration = configToSave;
        mapservice_.updateActiveMap(iConfig);
        mapservice_.save();
      }

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

    this.get_chapter_config = function(index) {
      return this.configurations[index];
    };

    this.update_active_config = function(index) {
      //This function updates the active_chapter and propagates the new
      //active configuration to the other services.
      this.active_chapter = this.configurations[index];
      this.active_index = index;
      //All services (except mapservice) use configServices configuration
      configService_.configuration = this.active_chapter;

      //TODO: This should be handled through updating the configService configuration
      mapservice_.configuration = this.active_chapter;
      mapservice_.updateActiveMap(this.active_index);

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

    this.add_chapter = function() {
      //TODO: Add new config object that is clone of current without layers, boxes, or pins
      //TODO: This will also need to switch the document focus to the new map and chapter in the menu
      var new_chapter = mapservice_.createNewChapter();
      new_chapter['story_id'] = service_.id;
      this.configurations.push(new_chapter);
      service_.update_active_config(this.configurations.length - 1);

      // Update the front end push menu
      var $addTo = $('#menu').multilevelpushmenu('activemenu').first();
      var index = (this.configurations.length - 1);
      var addChapter = [
        {
          name: 'Chapter ' + (index + 1),
          directive: 'loom-chapter-title',
          attr: 'storyService.configurations[' + index + '].about.title',
          link: '#',
          items: [
            {
              title: 'Chapter ' + (index + 1),
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
                          name: 'Chapter form goes here',
                          link: '#'
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
                          id: 'addNewBox',
                          link: '#'
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
                          id: 'addNewPin',
                          link: '#'
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
      var $expandTo = $(('#chapter-info-' + (index + 1)));
      $('#menu').multilevelpushmenu('expand', $expandTo);
    };

    this.remove_chapter = function() {
      //TODO: After removing a chapter we will need to switch focus to the base level of menu
      this.configurations.splice(this.active_index, 1);
      if (this.configurations.length > 0) {
        this.update_active_config(0);
      }
    };

  });


}());
