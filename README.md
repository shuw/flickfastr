flickfastr
=========

A minimalistic and fast JavaScript photo viewer with infinite scroll for Flickr because its web UI is slow and clunky.

It has a built in API client, renderer and infite scroll handler. See [a demo](http://shuw.github.com/photos).

usage
=========

With jQuery and [flickrfastr.js](https://github.com/shuw/flickrfastr/blob/master/flickrfastr.js), add the following to your page.

    // start flickrfastr on 'element' for 'user_name' using 'api_key'
    $(element).flickrfastr(user_name, 'api_key')

If you need a Flickr API key, follow [this link](http://www.flickr.com/services/apps/create/apply). It's quite easy.