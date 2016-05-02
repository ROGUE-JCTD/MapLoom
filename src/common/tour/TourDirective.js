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
                  // UpdateTourStep(0)
                  target: 'mainMenu',
                  placement: 'right',
                  showNextButton: true,
                  content: 'This is the sidebar where you will work to compose your MapStory.'
                },
                {
                  // UpdateTourStep(1)
                  target: 'composerIconNav',
                  placement: 'right',
                  showNextButton: true,
                  content: 'At any time, you can save your work or update your MapStory metadata using these icons.  When you\'re ready to publish your finished MapStory, you\'ll do that here.'
                },
                {
                  // UpdateTourStep(2)
                  target: 'chaptersList',
                  placement: 'right',
                  content: 'Now, let\'s start by working on Chapter 1, which has already been created.  After you\'re done with Chapter 1, you can add as many additional changes as you like.  You can also change the order of your chapters around by clicking the icon with three dots and dragging the chapters around in order.  Click Chapter 1 to begin.'
                },
                {
                  // UpdateTourStep(3)
                  target: 'chapterInfoButton',
                  placement: 'right',
                  content: 'Each chapter has the same basic components.  Chapter Info, StoryLayers, StoryBoxes and StoryPins.  Let\'s get started by adding some Chapter Info, go ahead and click there now.'
                },
                {
                  // UpdateTourStep(4)
                  target: 'chapterTitle',
                  placement: 'right',
                  content: 'Give your chapter a title and summary content.  This content should explain to your viewer what messages you are trying to convey with the information shown on the map interface.  When you\'re done, click Save Chapter Info and then click Back to Selected Chapter to continue.'
                },
                {
                  // UpdateTourStep(5)
                  target: 'storyLayersButton',
                  placement: 'right',
                  content: 'Now let\'s add StoryLayers to your Chapter.  StoryLayers are just our word for spatio-temporal datasets, and they form the foundation of your MapStory.  So pick your StoryLayers carefully!  ' +
                            'Clicking on StoryLayers to the left will open a window where you can use StoryLayers you\'ve created, you\'ve favorited, or simply that you find by searching.  Once you\'ve added a StoryLayer or two, click on one of them so we can show you how to customize StoryLayers for your MapStory.'
                },
                {
                  // UpdateTourStep(6)
                  target: 'addNewStoryLayerButton',
                  placement: 'bottom',
                  content: 'Go ahead and click on Add a New StoryLayer... to choose which StoryLayer you want to add.'
                },
                {
                  // UpdateTourStep(7)
                  target: 'storyLayersList',
                  placement: 'right',
                  content: 'Now let\'s customize the StoryLayer you just added.  Click on the title of the StoryLayer.'
                },
                {
                  // UpdateTourStep(8)
                  target: 'editFeatureButton',
                  placement: 'right',
                  content: 'If you see any features that you think need to be added or changed in your StoryLayer, you can do that here. Remember, when you edit features in a StoryLayer, those changes will be visible to everyone on MapStory, not just you!',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(9)
                  target: 'editStoryLayerStyleButton',
                  placement: 'right',
                  content: 'Each StoryLayer begins with a default style that you can customize for your MapStory. Currently MapStory supports simple, unique, choropleth and graduated styles. For point StoryLayers, you can also add icons using the Icons Commons.',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(10)
                  target: 'editStoryLayerMetaDataButton',
                  placement: 'right',
                  content: 'Metadata will open up a new tab with all the additional information you might want to know about the StoryLayer (like, who created this StoryLayer? What’s the data source? When was it last updated?)',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(11)
                  target: 'viewStoryLayerTableButton',
                  placement: 'right',
                  content: 'Table View shows you all the features in the StoryLayer in a table form. View History shows you a list of all the edits that have been made to the StoryLayer, and who made those edits.',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(12)
                  target: 'editStoryLayerMaskingButton',
                  placement: 'right',
                  content: 'Finally, with Masking you can customize the name of the StoryLayer to make it more appropriate for your MapStory. The name you choose is what will appear in your Legend. Also, you can customize the features in your StoryLayer that you want to appear win a viewer clicks on your features, and how you want those features to be named. When you’re done, click Back to StoryLayers List and then click Back to Chapters List.'
                },
                {
                  // UpdateTourStep(13)
                  target: 'storyBoxesButton',
                  placement: 'right',
                  content: 'Now let’s add StoryBoxes. StoryBoxes let you change the zoom level of the map at different periods of time in your chapter. Click here to begin.'
                },
                {
                  // UpdateTourStep(14)
                  target: 'addNewStoryBoxButton',
                  placement: 'right',
                  content: 'Click Add a New StoryBox.'
                },
                {
                  // UpdateTourStep(15)
                  target: 'storyBoxTitle',
                  placement: 'right',
                  content: 'Update your storybox title here. This will only appear in the timeline.',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(16)
                  target: 'updateMapBoundsButton',
                  placement: 'right',
                  content: 'To update your map extents, pan and zoom around the basemap and when finished, click here.',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(17)
                  target: 'startTime',
                  placement: 'right',
                  content: 'Update the StoryBox time extent here.  When finished, click Save StoryBox.'
                },
                {
                  // UpdateTourStep(18)
                  target: 'storyBoxList',
                  placement: 'right',
                  content: '17. Your saved StoryBox should appear here.  Now let\'s add StoryPins.  Click Back.'
                },
                {
                  // UpdateTourStep(19)
                  target: 'storyPinsButton',
                  placement: 'right',
                  content: 'Now lets add some StoryPins. StoryPins are just what they sound like – pins on the map. Their purpose is to let you add more information on the map than might be included in your StoryLayers.  Click StoryPins to begin.'
                },
                {
                  // UpdateTourStep(20)
                  target: 'addNewStoryPinButton',
                  placement: 'right',
                  content: 'Click Add a New StoryPin.'
                },
                {
                  // UpdateTourStep(21)
                  target: 'storyPinTitle',
                  placement: 'right',
                  content: 'Update the StoryPin title and content here.',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(22)
                  target: 'storyPinContent',
                  placement: 'right',
                  content: 'Add images and videos by pasting the embed code here.',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(23)
                  target: 'storyPinLocation',
                  placement: 'right',
                  content: 'Drop the pin on the map by clicking here first',
                  showNextButton: true
                },
                {
                  // UpdateTourStep(24)
                  target: 'storyPinStartTime',
                  placement: 'right',
                  content: 'Update the time information here.  When finished, click Save StoryPin.'
                },
                {
                  // UpdateTourStep(25)
                  target: 'storyPinsList',
                  placement: 'right',
                  content: 'Your saved StoryPin should appear here.  You\'re almost done.  Click Back.'
                },
                {
                  // UpdateTourStep(26)
                  target: 'chapterInfoButton',
                  placement: 'right',
                  content: 'Now you have StoryLayers, StoryBoxes, and StoryPins for your first chapter.  Click Back.'
                },
                {
                  // UpdateTourStep(27)
                  target: 'addChapter',
                  placement: 'right',
                  content: 'If you want to add another chapter, just click Add a New Chapter.  Now you\'re all set.  Good luck!'
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
