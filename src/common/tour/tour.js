var tour = {
  id: 'composer_tour',
  steps: [
    {
      target: 'mainMenu',
      placement: 'center',
      title: 'Composer Sidebar',
      content: 'This is the composer sidebar.'
    },
    {
      target: 'layer-manager-panel-basemap',
      placement: 'bottom',
      title: 'Choose your Basemap...',
      content: 'Decide which basemap will form the background of your mapstory. MapStory.org supports a rang of open source basemaps from OpenStreetMap, MapBox, and others.'
    },
    {
      target: 'tl-nav-style',
      placement: 'bottom',
      title: 'Style your StoryLayers...',
      content: 'Once you have your StoryLayers selected, give them styles so that your viewer takes the meaning from your mapstory that you\'re hoping to convey.'
    },
    {
      target: 'tl-nav-boxes',
      placement: 'bottom',
      title: 'Add StoryBoxes...',
      content: 'Creating StoryBoxes lets you focus your mapstory at different zoom levels during different periods of time.'
    },
    {
      target: 'tl-nav-pins',
      placement: 'bottom',
      title: 'Adding StoryPins...',
      content: 'StoryPins are narrative elements in your story that are separate from your StoryLayer data. For example, you might want to add text, video, or images at a specific point to give your viewer more information.'
    },
    {
      target: 'tl-nav-preview',
      placement: 'bottom',
      title: 'Preview...',
      content: 'Before you publish your mapstory for the world to see, preview it to make sure its exactly how you want it to be!'
    }
  ]
};

// Start the tour!
hopscotch.startTour(tour);
console.log('-----THE TOUR IS HERE------');
