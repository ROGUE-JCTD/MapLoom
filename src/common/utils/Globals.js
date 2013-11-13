var forEachArrayish = function(arrayish, funct) {
  if (goog.isArray(arrayish)) {
    goog.array.forEach(arrayish, funct);
  } else {
    funct(arrayish);
  }
};

var getScrollbarWidth = function() {
  var parent, child, width;

  if (width === undefined) {
    parent = $('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');
    child = parent.children();
    width = child.innerWidth() - child.height(99).innerWidth();
    parent.remove();
  }

  return width;
};
