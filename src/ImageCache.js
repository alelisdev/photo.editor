

class ImageCache() {

  constructor() {

  }

  cache = {};

  add(image, id) {
    cache[id] = image;
  }

  get(id) {
    return cache[id];
  }

}

export default ImageCache();
