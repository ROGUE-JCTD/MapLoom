(function () {
    var module = angular.module('loom_story_service', ['ngCookies']);
    var service_ = null;
    var mapservice_ = null;
    var configservice_ = null;

    module.provider('storyService', function () {

        this.$get = function ($window, $http, $cookies, $location, $translate, mapService, configService) {
            service_ = this;
            mapservice_ = mapService;
            configservice_ = configService;

            //When initializing the story service the mapService should already be initialized
            this.configurations = [];
            this.configurations.push(mapservice_.configuration);
            this.active_index = 0;
            this.active_chapter = this.configurations[this.active_index];

            return this;
        };

        this.save = function() {
            //TODO: When saving the mapstory we must go through each configuration and perform a save on the mapService
        };

        this.update_active_config = function(config) {
            //This function updates the active_chapter and propagates the new
            //active configuration to the other services.
            this.active_chapter = config;
            //All services (except mapservice) use configServices configuration
            configservice_.configuration = this.active_chapter;

            //TODO: This should be handled through updating the configService configuration
            mapservice_.configuration = this.active_chapter;

        };

        this.change_chapter = function(chapter_index) {
            this.active_index = chapter_index;
            service_.update_active_config(this.configurations[chapter_index]);
        };

        this.next_chapter = function() {
            this.active_index += 1;
            if(this.active_index > this.configurations.length - 1) {
                this.active_index = 0;
            }
            service_.update_active_config(this.configurations[this.active_index]);

        };

        this.prev_chapter = function() {
            this.active_index -= 1;
            if(this.active_index < 0) {
                this.active_index = this.configurations.length - 1;
            }
            service_.update_active_config(this.configurations[this.active_index]);

        };

        this.add_chapter = function() {
            //TODO: Add new config object that is clone of current without layers, boxes, or pins
            //TODO: This will also need to switch the document focus to the new map and chapter in the menu
            var new_chapter = {};
            this.configurations.push(new_chapter);
            this.active_index = this.configurations.length - 1;
            service_.update_active_config(this.configurations[this.active_index]);

        };

        this.remove_chapter = function() {
            //TODO: After removing a chapter we will need to switch focus to the base level of menu
            this.configurations.splice(this.active_index,1);
            if(this.configurations.length > 0) {
                this.active_index = 0;
                this.active_chapter = this.configurations[active_index];
            }
        };

    });


}());
