# contact-form
a simple node.js contact form backend implementation

* it supports Cross origin calls via CORS (it's needed if the form is f.e. hosted on github pages)
* it sends a carboncopy if the *carboncopy* request paramenters is set to **checked**
* google [re-captcha](https://www.google.com/recaptcha/intro/index.html) support (NB it takes as input a param called **grecaptcharesponse** instead of **g-recaptcha-response**)
* it uses [express](http://expressjs.com/) to expose a REST enpoint, [nodemailer](http://nodemailer.com/) to deal with mail transport and [bunyan](https://www.npmjs.com/package/bunyan) as logger.

## run

clone this repo then test it typing:

``/repo/home$ DEBUG=myapp:* node app.js | bunyan``

use it in production along with [forever](https://www.npmjs.com/package/forever)

``/repo/home$ forever start app.js``

