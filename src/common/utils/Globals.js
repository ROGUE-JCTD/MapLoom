var forEachArrayish = function(arrayish, funct) {
  if (goog.isArray(arrayish)) {
    goog.forEach(arrayish, funct);
  } else {
    funct(arrayish);
  }
};
