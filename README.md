flickfastr
=========

A minimalistic and fast JavaScript photo library with panning panorama lightbox and infinite scroll. Uses Flickr API.

It has a built in API client, renderer and infite scroll handler. See [a demo](http://shuw.github.com/photos).

usage
=========

With jQuery and [flickrfastr.js](https://github.com/shuw/flickfastr/blob/master/flickfastr.js), add the following to your page.

    // start flickrfastr on 'element' for 'user_name' using 'api_key' with optional 'options'
    $(element).flickrfastr(user_name, api_key, [options])

Options are documented in [the source](https://github.com/shuw/flickfastr/blob/master/flickfastr.js#L5).

If you need a Flickr API key, follow [this link](http://www.flickr.com/services/apps/create/apply). It's quite easy.