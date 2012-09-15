USERID_FAST_CACHE = {
  '-shu-': '80879993@N00'
}

substitute = function(str, sub) {
    return str.replace(/\{(.+?)\}/g, function($0, $1) {
        return $1 in sub ? sub[$1] : $0;
    });
};

window.fastphoto = function(el, api_key, user_name, options) {
  options = $.extend({
    photo_size: 'b' // Sizes defined [here](http://www.flickr.com/services/api/misc.urls.html)
  }, options)
  photo_url_format = "http://farm9.staticflickr.com/{server}/{id}_{secret}_" + options.photo_size + ".jpg"

  $el = $(el)
  user_id = null, current_page = 1, max_pages = null

  init = function() {
    user_id = USERID_FAST_CACHE[user_name]
    if (user_id) {
      load_photos()
    }
    else {
      url = flickr_get('flickr.people.findByUsername', {
        username: user_name
      }, function(data) {
        user_id = data.user.id
        if (user_id) {
          load_photos()
        } else {
          $el.text("invalid user id")
        }
      })
    }
  }

  load_photos = function() {
    if (max_pages != null && current_page > max_pages) {
      return
    }

    flickr_get('flickr.people.getPublicPhotos', {
      user_id: user_id,
      page: current_page++
    }, function(data) {
      if (max_pages == null) {
        max_pages = data.photos.pages
      }

      for (var i = 0; i < data.photos.photo.length; i++) {
        photo = data.photos.photo[i]
        photo_src = substitute(photo_url_format, {
          id: photo.id,
          secret: photo.secret,
          server: photo.server
        })

        PHOTO_TEMPLATE =
          '<a class="photo" target="_blank" href="{href}">\
            <img title="{title}" src="{src}"></img>\
            <div class="label">{title}</div>\
          </a>'
        html = substitute(PHOTO_TEMPLATE, {
          href: 'http://www.flickr.com/photos/' + user_id + '/' + photo.id,
          src: photo_src,
          title: photo.title
        })

        $(html).appendTo($el)
      }
    })

  }

  flickr_get = function(method, params, callback) {
    params = $.extend({
      "api_key": api_key,
      "method": method,
      "per_page": 10
    }, params)
    url = "http://api.flickr.com/services/rest/?format=json&" + $.param(params)
    $.ajax(url, {
      dataType: "jsonp",
      cache: true,
      jsonpCallback: "jsonFlickrApi",
      success: function(data, status) {
        callback(data, status)
      }
    })
  }

  init()
}


