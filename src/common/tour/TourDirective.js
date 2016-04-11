(function() {

  var module = angular.module('loom_welcome_tour', []);

  module.directive('loomWelcomeTour',
      function(storyService, configService, $translate) {
        return {
          templateUrl: 'tour/partial/tour.tpl.html',
          link: function(scope, element, attrs) {
            scope.storyService = storyService;
            scope.configService = configService;
            scope.translate = $translate;
            scope.tour = {
              id: 'composer_tour',
              showNextButton: false,
              nextOnTargetClick: true,
              steps: [
                {
                  target: 'mainMenu',
                  placement: 'right',
                  showNextButton: true,
                  content: '1. This is the composer sidebar.'
                },
                {
                  target: 'chaptersList',
                  placement: 'right',
                  content: '2. Edit Chapter 1 by clicking here.'
                },
                {
                  target: 'chapterInfoButton',
                  placement: 'right',
                  content: '3. Update chapter title and summary here.'
                },
                {
                  target: 'chapterTitle',
                  placement: 'right',
                  content: '4. Update the form.  When finished, click back.'
                },
                {
                  target: 'storyLayersButton',
                  placement: 'right',
                  content: '5. Now let\'s add your StoryLayers. Click here.'
                },
                {
                  target: 'addNewStoryLayerButton',
                  placement: 'right',
                  content: '6. Add a new StoryLayer by clicking here.'
                },
                {
                  target: 'exploreStoryLayers',
                  placement: 'right',
                  content: '7. This is the StoryLayer Explorer.  You can search using keywords, use your own uploaded StoryLayers or your favorite content.  Choose one StoryLayer and click Use.'
                },
                {
                  target: 'storyLayersList',
                  placement: 'right',
                  content: '8. Now let\'s edit the StoryLayer you just added.  Click on the title of the StoryLayer.'
                },
                {
                  target: 'style',
                  placement: 'right',
                  content: '9. The Style tab lets you edit the appearance of your features.  Change the settings and see your changes on the map panel to the right.  When finished, click the Edit tab.'
                },
                {
                  target: 'edit',
                  placement: 'right',
                  content: '10. The Edit tab lets you add, update and delete features on your map.  When finished exploring, click the Infobox tab'
                },
                {
                  target: 'infobox',
                  placement: 'right',
                  content: '11. The Infobox tab lets you mask the StoryLayer title and your attribute names.  When finished updating your titles, hit Save and Back'
                },
                {
                  target: 'storyBoxesButton',
                  placement: 'right',
                  content: '12. Now let\'s add StoryBoxes.  Click here.'
                },
                {
                  target: 'addNewStoryBoxButton',
                  placement: 'right',
                  content: '13. Click Add a New StoryBox'
                },
                {
                  target: 'storyBoxTitle',
                  placement: 'right',
                  showNextButton: true,
                  content: '14. Update your StoryBox title here.'
                },
                {
                  target: 'updateMapBoundsButton',
                  placement: 'right',
                  showNextButton: true,
                  content: '15. To update your map extents, pan and zoom around the basemap and when finished, click here.'
                },
                {
                  target: 'startTime',
                  placement: 'right',
                  content: '16. Update the StoryBox time extent here.  When finished, click Save StoryBox.'
                },
                {
                  target: 'storyBoxList',
                  placement: 'right',
                  content: '17. Your saved StoryBox should appear here.  Now let\'s add StoryPins.  Click Back.'
                },
                {
                  target: 'storyPinsButton',
                  placement: 'right',
                  content: '18. Click StoryPins'
                },
                {
                  target: 'addNewStoryPinButton',
                  placement: 'right',
                  content: '19. Click Add a New StoryPin'
                },
                {
                  target: 'storyPinTitle',
                  placement: 'right',
                  showNextButton: true,
                  content: '20. Update the StoryPin title and content here.'
                },
                {
                  target: 'storyPinContent',
                  placement: 'right',
                  showNextButton: true,
                  content: '21. Add images and videos by pasting the embed code here.'
                },
                {
                  target: 'storyPinLocation',
                  placement: 'right',
                  showNextButton: true,
                  content: '22. Drop the pin on the map by clicking here first'
                },
                {
                  target: 'storyPinStartTime',
                  placement: 'right',
                  content: '23. Update the time information here.  When finished, click Save, then click Back.'
                },
                {
                  target: 'storyPinsList',
                  placement: 'right',
                  content: '24. Your saved StoryPin should appear here.  You\'re almost done.  Click Back.'
                },
                {
                  target: 'chapterInfoButton',
                  placement: 'right',
                  content: '25. Now you have StoryLayers, StoryBoxes, and StoryPins for your first chapter.  Click Back.'
                },
                {
                  target: 'addChapter',
                  placement: 'right',
                  content: '26. If you want to add another chapter, just click Add a New Chapter.  Now you\'re all set.  Good luck!'
                }

              ]
            };
            scope.startTour = function() {
              hopscotch.startTour(scope.tour);
            };
          }
        };
      });
})();
