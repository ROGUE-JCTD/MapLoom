'use strict';

sideBarApp.controller('sideBarController',
  function sideBarController($scope) {
    $scope.mapstories = {
      name: 'The Civil War',
      chapters: [
        {
          id: 0,
          chapter: 'Chapter 1',
          title: 'Civil War Battle 1',
          summary: 'This talks about Civil War Battle 1',
        },
        {
          id: 1,
          chapter: 'Chapter 2',
          title: 'Civil War Battle 2',
          summary: 'This talks about Civil War Battle 2',
        },
        {
          id: 2,
          chapter: 'Chapter 3',
          title: 'Civil War Battle 3',
          summary: 'This talks about Civil War Battle 3',
          storyLayers: [
            {
              id: 0,
              title: 'Civil War Chapter 3 StoryLayer 1',
            },
            {
              id: 1,
              title: 'Civil War Chapter 3 StoryLayer 2'
            }
          ],
          storyBoxes: [
            {
              id: 0,
              title: 'Civil War Chapter 3 Box 1'
            },
            {
              id: 1,
              title: 'Civil War Chapter 3 Box 2'
            }
          ],
          storyPins: [
            {
              id: 0,
              title: 'Civil War Chapter 3 Pin 1'
            },
            {
              id: 1,
              title: 'Civil War Chapter 3 Pin 2'
            }
          ]
        }
      ]
    };

    $scope.menuSection = 'mainMenu';

    $scope.updateMenuSection = function(updateMenuSection) {
      $scope.menuSection = updateMenuSection;
    }
  });