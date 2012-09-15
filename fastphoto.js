USERID_FAST_CACHE = {
  '-shu-': '80879993@N00'
}

PHOTO_TEMPLATE =
  '<a id="photo/{id}" class="photo" target="_blank" href="{href}">\
    <img title="{title}" src="{src}"></img>\
    <div class="label">{title}</div>\
  </a>'

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
      start()
    }
    else {
      url = flickr_get('flickr.people.findByUsername', {
        username: user_name
      }, function(data) {
        user_id = data.user.id
        if (user_id) {
          start()
        } else {
          $el.text("invalid user id")
        }
      })
    }
  }

  start = function() {
    setInterval(infinite_scroll, 500)
    $(window).scroll(infinite_scroll)
    load_photos()
  }

  infinite_scroll = function() {
    runway = $(document).height() - ($(window).scrollTop() + $(window).height())
    if (runway < ($(window).height() * 2)) {
      load_photos()
    }
  }

  loading = false
  load_photos = function() {
    if (loading || (max_pages != null && current_page > max_pages)) {
      return
    }
    loading = true

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


        // Clean up titles
        if (photo.title.indexOf('IMG_') == 0) { photo.title = '' }


        html = substitute(PHOTO_TEMPLATE, {
          id: photo.id,
          href: 'http://www.flickr.com/photos/' + user_id + '/' + photo.id,
          src: photo_src,
          title: photo.title
        })

        $(html).appendTo($el)
      }
      loading = false
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

substitute = function(str, sub) {
    return str.replace(/\{(.+?)\}/g, function($0, $1) {
        return $1 in sub ? sub[$1] : $0;
    });
};
